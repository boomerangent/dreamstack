// Dreamstack — serve a password-protected shared app after checking the
// password. Public (unprotected) apps are read directly by the site and never
// hit this function. Deployed with verify_jwt=false: viewers are anonymous.
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { message: "Method not allowed" });

  let body: { slug?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { message: "Invalid request" });
  }
  const slug = (body.slug ?? "").trim();
  const password = body.password ?? "";
  if (!slug) return json(400, { message: "Missing app link" });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: app } = await admin
    .from("ds_apps")
    .select("title, html, hide_badge, share_password_hash, is_public")
    .eq("slug", slug)
    .maybeSingle();

  if (!app || !app.is_public) {
    return json(404, { message: "This app isn't available." });
  }

  if (app.share_password_hash) {
    if (!password) return json(401, { code: "password_required" });
    const hash = await sha256Hex(password);
    if (hash !== app.share_password_hash) {
      return json(403, { code: "wrong_password", message: "That password isn't right." });
    }
  }

  return json(200, {
    title: app.title,
    html: app.html,
    hide_badge: app.hide_badge,
  });
});
