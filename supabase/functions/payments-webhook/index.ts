import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

async function upgradeUserToPro(userId: string, expiresAt: Date | null) {
  if (!userId) return;
  // Uses DB function to take MAX(subscription expiry, active code expiry)
  await getSupabase().rpc("apply_pro_entitlement", {
    _user_id: userId,
    _sub_expires_at: expiresAt ? expiresAt.toISOString() : null,
  });
}

async function downgradeUserToFree(userId: string) {
  if (!userId) return;
  // Keeps user Pro if an active access code still grants Pro
  await getSupabase().rpc("downgrade_if_no_code", { _user_id: userId });
}

async function handleSubscriptionUpsert(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }

  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const periodEndDate = periodEnd ? new Date(periodEnd * 1000) : null;

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEndDate ? periodEndDate.toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  // Sync profile tier based on subscription state
  const isActive = ["active", "trialing", "past_due"].includes(subscription.status);
  const futureEnd = !periodEndDate || periodEndDate.getTime() > Date.now();

  if (isActive && futureEnd) {
    await upgradeUserToPro(userId, periodEndDate);
  } else if (subscription.status === "canceled" && periodEndDate && periodEndDate.getTime() > Date.now()) {
    // canceled but still in grace period
    await upgradeUserToPro(userId, periodEndDate);
  } else {
    await downgradeUserToFree(userId);
  }
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  if (userId) await downgradeUserToFree(userId);
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  // For embedded subscription checkouts, customer.subscription.created should fire too,
  // but we activate Pro here as a safety net so the user isn't stuck on the return page.
  const userId = session.metadata?.userId;
  if (!userId) {
    console.log("checkout.session.completed without userId metadata; skipping");
    return;
  }
  // Best-effort: give them ~32 days of Pro immediately; the subscription webhook
  // will overwrite tier_expires_at with the real period end as soon as it arrives.
  const provisional = new Date(Date.now() + 32 * 24 * 60 * 60 * 1000);
  await upgradeUserToPro(userId, provisional);
  console.log("Activated Pro from checkout.session.completed for user", userId);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object, env);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpsert(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  // Default to sandbox if the registered webhook URL is missing the env query param.
  // Live webhooks must explicitly pass ?env=live.
  const env: StripeEnv = rawEnv === "live" ? "live" : "sandbox";
  try {
    await handleWebhook(req, env);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});