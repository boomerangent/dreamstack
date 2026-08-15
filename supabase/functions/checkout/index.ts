// Dreamstack — create a Stripe Checkout session.
// Supports subscription upgrades (plan: pro|studio) and one-time credit
// packs (pack: small|large). Deployed with verify_jwt=false; user auth is
// checked in code below.
import Stripe from "npm:stripe@18.4.0";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PACK_CREDITS: Record<string, number> = { small: 10, large: 40 };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { message: "Method not allowed" });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return json(503, {
      message:
        "Payments aren't connected yet — the site owner needs to add Stripe keys.",
    });
  }

  let body: { plan?: string; pack?: string; origin?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { message: "Invalid request" });
  }
  const origin =
    body.origin ?? req.headers.get("origin") ?? "http://localhost:5173";

  // Resolve what's being bought: a subscription plan or a one-time pack.
  let mode: "subscription" | "payment";
  let priceId: string | undefined;
  let metadata: Record<string, string>;

  if (body.pack) {
    const pack = body.pack === "large" ? "large" : "small";
    priceId = Deno.env.get(
      pack === "large" ? "STRIPE_PRICE_PACK_LARGE" : "STRIPE_PRICE_PACK_SMALL"
    );
    if (!priceId) {
      return json(503, {
        message:
          "Credit packs aren't connected yet — the site owner needs to add the pack prices in Stripe.",
      });
    }
    mode = "payment";
    metadata = { pack, credits: String(PACK_CREDITS[pack]) };
  } else {
    const plan = body.plan === "studio" ? "studio" : "pro";
    priceId = Deno.env.get(
      plan === "studio" ? "STRIPE_PRICE_STUDIO" : "STRIPE_PRICE_PRO"
    );
    if (!priceId) {
      return json(503, {
        message:
          "Payments aren't connected yet — the site owner needs to add Stripe keys.",
      });
    }
    mode = "subscription";
    metadata = { plan };
  }

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json(401, { message: "Please sign in first." });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json(401, { message: "Please sign in again." });
  const user = userData.user;
  metadata.ds_user_id = user.id;

  const stripe = new Stripe(stripeKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  // Ensure a profile row and a Stripe customer.
  let { data: profile } = await admin
    .from("ds_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) {
    const { data: created } = await admin
      .from("ds_profiles")
      .insert({ user_id: user.id, email: user.email ?? null })
      .select()
      .single();
    profile = created;
  }

  let customerId: string | null = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { ds_user_id: user.id },
    });
    customerId = customer.id;
    await admin
      .from("ds_profiles")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode,
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/account?${mode === "payment" ? "topup" : "upgraded"}=1`,
    cancel_url: `${origin}/account`,
    metadata,
    ...(mode === "subscription"
      ? { subscription_data: { metadata } }
      : {}),
  });

  return json(200, { url: session.url });
});
