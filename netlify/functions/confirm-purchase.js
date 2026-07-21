// netlify/functions/confirm-purchase.js
// Called once when the browser returns from Stripe Checkout. Verifies the
// session was actually paid, then adds the credit pack to that Stripe
// Customer's balance (stored in the customer's metadata — no database needed).
// Safe to call more than once for the same session: it only credits once
// per session id (tracked via metadata.last_session).

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }
  const { sessionId } = body;
  if (!sessionId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing sessionId" }) };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "STRIPE_SECRET_KEY not configured." }) };
  }
  const packMessages = parseInt(process.env.PACK_MESSAGES || "200", 10);

  try {
    // 1. Verify the session was actually paid
    const sessionRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { "Authorization": `Bearer ${stripeKey}` },
    });
    const session = await sessionRes.json();
    if (!sessionRes.ok || session.payment_status !== "paid") {
      return { statusCode: 402, body: JSON.stringify({ error: "Payment not verified for this session." }) };
    }
    const customerId = session.customer;
    if (!customerId) {
      return { statusCode: 500, body: JSON.stringify({ error: "No customer attached to this session." }) };
    }

    // 2. Read current balance from customer metadata
    const custRes = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, {
      headers: { "Authorization": `Bearer ${stripeKey}` },
    });
    const customer = await custRes.json();
    if (!custRes.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: "Could not read customer." }) };
    }
    const meta = customer.metadata || {};
    const currentCredits = parseInt(meta.credits || "0", 10) || 0;
    const lastSession = meta.last_session || "";

    // 3. Only add credits once per checkout session
    let newBalance = currentCredits;
    if (lastSession !== sessionId) {
      newBalance = currentCredits + packMessages;
      const updateParams = new URLSearchParams();
      updateParams.append("metadata[credits]", String(newBalance));
      updateParams.append("metadata[last_session]", sessionId);
      const updateRes = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: updateParams.toString(),
      });
      if (!updateRes.ok) {
        return { statusCode: 500, body: JSON.stringify({ error: "Could not update balance." }) };
      }
    }

    return { statusCode: 200, body: JSON.stringify({ customerId, balance: newBalance }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
