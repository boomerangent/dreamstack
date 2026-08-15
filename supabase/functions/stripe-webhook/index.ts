// Dreamstack — Stripe webhook: keeps ds_profiles.plan in sync with subscriptions.
// Deployed with verify_jwt=false; authenticity is proven by the Stripe signature.
import Stripe from "npm:stripe@18.4.0";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Stripe not configured", { status: 503 });
  }

  const stripe = new Stripe(stripeKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (e) {
    console.error("[stripe-webhook] bad signature", (e as Error).message);
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const pricePro = Deno.env.get("STRIPE_PRICE_PRO");
  const priceStudio = Deno.env.get("STRIPE_PRICE_STUDIO");

  async function userIdFor(
    metaUserId: string | undefined | null,
    customerId: string | undefined | null
  ): Promise<string | null> {
    if (metaUserId) return metaUserId;
    if (!customerId) return null;
    const { data } = await admin
      .from("ds_profiles")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    return data?.user_id ?? null;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const uid = await userIdFor(s.metadata?.ds_user_id, s.customer as string);
        if (!uid) break;
        if (s.mode === "payment" && s.metadata?.pack) {
          // One-time credit pack: add the purchased credits to the user's bank.
          const credits = parseInt(s.metadata?.credits ?? "0", 10) || 0;
          if (credits > 0) {
            const { data: prof } = await admin
              .from("ds_profiles")
              .select("bonus_credits")
              .eq("user_id", uid)
              .maybeSingle();
            await admin
              .from("ds_profiles")
              .update({
                bonus_credits: (prof?.bonus_credits ?? 0) + credits,
                stripe_customer_id: (s.customer as string) ?? null,
              })
              .eq("user_id", uid);
          }
        } else {
          const plan = s.metadata?.plan === "studio" ? "studio" : "pro";
          await admin
            .from("ds_profiles")
            .update({
              plan,
              gens_used: 0,
              stripe_customer_id: (s.customer as string) ?? null,
              stripe_subscription_id: (s.subscription as string) ?? null,
            })
            .eq("user_id", uid);
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const uid = await userIdFor(sub.metadata?.ds_user_id, sub.customer as string);
        if (!uid) break;
        if (["active", "trialing"].includes(sub.status)) {
          const priceId = sub.items.data[0]?.price?.id;
          const plan =
            priceId === priceStudio ? "studio" : priceId === pricePro ? "pro" : null;
          if (plan) {
            await admin
              .from("ds_profiles")
              .update({ plan, stripe_subscription_id: sub.id })
              .eq("user_id", uid);
          }
        } else if (
          ["canceled", "unpaid", "incomplete_expired"].includes(sub.status)
        ) {
          await admin
            .from("ds_profiles")
            .update({ plan: "free", stripe_subscription_id: null })
            .eq("user_id", uid);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const uid = await userIdFor(sub.metadata?.ds_user_id, sub.customer as string);
        if (uid) {
          await admin
            .from("ds_profiles")
            .update({ plan: "free", stripe_subscription_id: null })
            .eq("user_id", uid);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe-webhook] handler error", (e as Error).message);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
