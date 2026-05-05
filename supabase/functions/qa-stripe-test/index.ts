import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import { createStripeClient } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { userId, email } = await req.json();
    if (!userId || !email) throw new Error("userId and email required");
    const stripe = createStripeClient("sandbox");

    // Resolve price by lookup_key (same as create-checkout)
    const prices = await stripe.prices.list({ lookup_keys: ["pro_monthly"] });
    if (!prices.data.length) throw new Error("price pro_monthly not found");
    const price = prices.data[0];

    // Create customer with attached test PaymentMethod
    const customer = await stripe.customers.create({
      email,
      payment_method: "pm_card_visa",
      invoice_settings: { default_payment_method: "pm_card_visa" },
      metadata: { userId },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      metadata: { userId },
      expand: ["latest_invoice.payment_intent"],
    });

    return new Response(
      JSON.stringify({
        ok: true,
        customerId: customer.id,
        subscriptionId: subscription.id,
        status: subscription.status,
        price_id: price.id,
        lookup_key: price.lookup_key,
        current_period_end: subscription.items?.data?.[0]?.current_period_end,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});