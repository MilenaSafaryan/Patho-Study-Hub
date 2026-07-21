// netlify/functions/create-checkout.js
// Creates a Stripe Checkout session for a prepaid credit pack.
// If the browser already has a Stripe customer id (from a previous purchase),
// reuses it so credits accumulate on one balance instead of resetting.
//
// Env vars (set in Netlify site settings):
//   STRIPE_SECRET_KEY   - your Stripe secret key
//   PACK_PRICE_CENTS    - price per pack in cents (default 500 = $5.00)
//   PACK_MESSAGES       - credits granted per pack (default 200)

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "STRIPE_SECRET_KEY not configured on the server." }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch (e) {}
  const existingCustomerId = body.customerId || null;

  const priceCents = parseInt(process.env.PACK_PRICE_CENTS || "500", 10);
  const packMessages = parseInt(process.env.PACK_MESSAGES || "200", 10);
  const origin = event.headers.origin || `https://${event.headers.host}`;

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("payment_method_types[0]", "card");
  params.append("success_url", `${origin}/?purchase=1&session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", `${origin}/?purchase_cancelled=1`);
  params.append("line_items[0][quantity]", "1");
  params.append("line_items[0][price_data][currency]", "usd");
  params.append("line_items[0][price_data][unit_amount]", String(priceCents));
  params.append("line_items[0][price_data][product_data][name]", `Patho Study Hub — ${packMessages}-message AI credit pack`);

  if (existingCustomerId) {
    params.append("customer", existingCustomerId);
  } else {
    params.append("customer_creation", "always");
  }

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await res.json();
    if (!res.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: data.error ? data.error.message : "Stripe error" }) };
    }
    return { statusCode: 200, body: JSON.stringify({ url: data.url }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
