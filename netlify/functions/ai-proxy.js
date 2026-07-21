// netlify/functions/ai-proxy.js
// Checks the caller's prepaid credit balance (stored in Stripe Customer
// metadata), deducts one credit per call, then calls Claude server-side so
// your Anthropic key never reaches the browser.
//
// Env vars: STRIPE_SECRET_KEY, ANTHROPIC_API_KEY

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }
  const { customerId, messages, maxTokens } = body;

  if (!customerId) {
    return { statusCode: 401, body: JSON.stringify({ error: "No credit balance found. Buy a credit pack first." }) };
  }
  if (!messages || !Array.isArray(messages)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing messages array" }) };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (!stripeKey || !claudeKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server not fully configured (missing keys)." }) };
  }

  // 1. Check balance
  let credits = 0;
  try {
    const custRes = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, {
      headers: { "Authorization": `Bearer ${stripeKey}` },
    });
    const customer = await custRes.json();
    if (!custRes.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: "Could not verify balance." }) };
    }
    credits = parseInt((customer.metadata || {}).credits || "0", 10) || 0;
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Balance check failed: " + err.message }) };
  }

  if (credits <= 0) {
    return { statusCode: 402, body: JSON.stringify({ error: "Out of credits. Buy another pack to keep chatting.", balance: 0 }) };
  }

  // 2. Deduct one credit up front (avoids overspend even if the Claude call fails)
  const newBalance = credits - 1;
  try {
    const updateParams = new URLSearchParams();
    updateParams.append("metadata[credits]", String(newBalance));
    await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: updateParams.toString(),
    });
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Could not update balance: " + err.message }) };
  }

  // 3. Call Claude
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
      return { statusCode: 500, body: JSON.stringify({ error: "Claude API error: " + JSON.stringify(data).slice(0, 200), balance: newBalance }) };
    }
    const text = (data.content || []).map(b => b.text || "").join("\n").trim();
    return { statusCode: 200, body: JSON.stringify({ text: text || "(no response)", balance: newBalance }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message, balance: newBalance }) };
  }
};
