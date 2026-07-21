// netlify/functions/create-checkout.js
// Creates a Stripe Checkout session for the one-time "unlock AI + voice" fee.
// Requires env vars set in Netlify site settings:
//   STRIPE_SECRET_KEY   - your Stripe secret key (starts with sk_live_ or sk_test_)
//   UNLOCK_PRICE_CENTS  - price in cents, e.g. 300 for $3.00 (optional, defaults to 300)

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "STRIPE_SECRET_KEY not configured on the server." }) };
  }

  const priceCents = parseInt(process.env.UNLOCK_PRICE_CENTS || "300", 10);
  const origin = event.headers.origin || `https://${event.headers.host}`;

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("payment_method_types[0]", "card");
  params.append("success_url", `${origin}/?unlocked=1&session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", `${origin}/?unlock_cancelled=1`);
  params.append("line_items[0][quantity]", "1");
  params.append("line_items[0][price_data][currency]", "usd");
  params.append("line_items[0][price_data][unit_amount]", String(priceCents));
  params.append("line_items[0][price_data][product_data][name]", "Patho Study Hub — AI Chat & Voice Access");

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
