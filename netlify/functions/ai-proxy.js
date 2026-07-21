// netlify/functions/ai-proxy.js
// Verifies a Stripe checkout session was actually paid, then calls the
// Claude API server-side so your Anthropic key never reaches the browser.
// Requires env vars set in Netlify site settings:
//   STRIPE_SECRET_KEY   - your Stripe secret key
//   ANTHROPIC_API_KEY   - your Claude API key

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { sessionId, messages, maxTokens } = body;
  if (!sessionId) {
    return { statusCode: 401, body: JSON.stringify({ error: "No access session provided. Unlock AI chat first." }) };
  }
  if (!messages || !Array.isArray(messages)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing messages array" }) };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (!stripeKey || !claudeKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server not fully configured (missing keys)." }) };
  }

  // 1. Verify the session was actually paid
  try {
    const verifyRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { "Authorization": `Bearer ${stripeKey}` },
    });
    const session = await verifyRes.json();
    if (!verifyRes.ok || session.payment_status !== "paid") {
      return { statusCode: 402, body: JSON.stringify({ error: "Payment not verified for this session." }) };
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Could not verify payment: " + err.message }) };
  }

  // 2. Call Claude
  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens || 500,
        messages,
      }),
    });
    const data = await claudeRes.json();
    if (!claudeRes.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: "Claude API error: " + JSON.stringify(data).slice(0, 200) }) };
    }
    const text = (data.content || []).map(b => b.text || "").join("\n").trim();
    return { statusCode: 200, body: JSON.stringify({ text: text || "(no response)" }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
