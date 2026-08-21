// Dreamstack — AI app generation (Supabase Edge Function, Deno)
// Streams newline-delimited JSON: {type:"chunk"|"done"|"error", ...}
// Deployed with verify_jwt=false; user auth is checked in code below.
import Anthropic from "npm:@anthropic-ai/sdk@0.70.1";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLAN_LIMITS: Record<string, number> = { free: 3, pro: 20, studio: 50 };

const SYSTEM_PROMPT = `You are the Dreamstack app engine. You turn a person's idea into a complete, working, single-file web app.

Output ONLY the raw HTML document. Start with <!doctype html>. No markdown fences, no commentary before or after.

Rules for every app you build:
- Everything in one file: CSS in a <style> tag, JavaScript in a <script> tag.
- You may load well-known libraries from CDNs (jsdelivr, unpkg, cdnjs) only when they genuinely help (three.js for 3D, chart.js for charts, tone.js for audio, and similar).
- Fully working logic: real state, real interactivity, no placeholder buttons. Persist the user's data with localStorage where it makes sense.
- Mobile-responsive and polished: a distinctive, modern visual design with real care — custom color palette suited to the idea, good typography, generous spacing, hover/active states, smooth transitions. Never a generic unstyled look.
- Include friendly empty states and small finishing touches (subtle animation, keyboard support) that make it feel complete.
- Self-contained and safe: no external API calls that need keys, no cookies, no form posts to other servers, no tracking.
- The app must keep working offline once loaded (except CDN libraries).`;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function titleFrom(prompt: string): string {
  const clean = prompt.replace(/\s+/g, " ").trim();
  let t = clean.length > 48 ? clean.slice(0, 48).replace(/\s+\S*$/, "") + "…" : clean;
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return t || "Untitled app";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanHtml(raw: string): string {
  let html = raw.trim();
  html = html.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();
  if (!/^<!doctype html/i.test(html)) {
    const i = html.search(/<!doctype html/i);
    if (i >= 0) html = html.slice(i);
  }
  return html;
}

/** Sample app returned while no ANTHROPIC_API_KEY is configured. */
function makeDemoApp(prompt: string): string {
  const p = escapeHtml(prompt.slice(0, 140));
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Idea Pad</title><style>
*{margin:0;box-sizing:border-box;font-family:'Segoe UI',system-ui,sans-serif}
body{background:#090b12;color:#eef1fa;min-height:100vh;padding:28px 16px}
.wrap{max-width:520px;margin:0 auto}
.note{background:#141a2b;border:1px solid #24304d;border-radius:12px;padding:12px 14px;font-size:13px;color:#9fb0d8;margin-bottom:22px}
.note b{color:#c9d6f5}
h1{font-size:22px;margin-bottom:14px}
form{display:flex;gap:8px;margin-bottom:18px}
input{flex:1;padding:12px;border-radius:10px;border:1px solid #24304d;background:#0d1220;color:#eef1fa;font-size:14px}
button{padding:12px 18px;border:0;border-radius:10px;background:linear-gradient(100deg,#6ee7ff,#a78bfa,#fb7185);color:#06070c;font-weight:700;cursor:pointer}
ul{list-style:none;display:flex;flex-direction:column;gap:8px}
li{background:#10162a;border:1px solid #1c2540;border-radius:10px;padding:12px 14px;font-size:14px;display:flex;justify-content:space-between;gap:10px;align-items:center}
li span{cursor:pointer;color:#5e6d95}
.empty{color:#5e6d95;font-size:13px;text-align:center;padding:26px 0}
</style></head><body><div class="wrap">
<div class="note"><b>Sample app (demo mode).</b> The site's AI key isn't connected yet, so here's a working sample. Your idea — <b>&ldquo;${p}&rdquo;</b> — will be built for real once the AI is switched on.</div>
<h1>✦ Idea Pad</h1>
<form id="f"><input id="i" placeholder="Jot down an idea…" autocomplete="off"><button>Add</button></form>
<ul id="l"></ul><div class="empty" id="e">Nothing yet — add your first idea.</div>
<script>
const K='ds-demo-ideas';let items=JSON.parse(localStorage.getItem(K)||'[]');
const l=document.getElementById('l'),e=document.getElementById('e');
function save(){localStorage.setItem(K,JSON.stringify(items));render()}
function render(){l.innerHTML='';e.style.display=items.length?'none':'block';items.forEach((t,i)=>{const li=document.createElement('li');li.textContent=t;const x=document.createElement('span');x.textContent='✕';x.onclick=()=>{items.splice(i,1);save()};li.appendChild(x);l.appendChild(li)})}
document.getElementById('f').onsubmit=ev=>{ev.preventDefault();const v=document.getElementById('i').value.trim();if(v){items.unshift(v);document.getElementById('i').value='';save()}};
render();
</script></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { type: "error", message: "Method not allowed" });

  let body: {
    prompt?: string;
    appId?: string;
    currentHtml?: string;
    title?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { type: "error", message: "Invalid request body" });
  }

  const prompt = (body.prompt ?? "").trim();
  if (!prompt || prompt.length > 4000) {
    return json(400, {
      type: "error",
      message: "Please describe your app in 1 to 4000 characters.",
    });
  }

  // --- Auth ---
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json(401, { type: "error", message: "Please sign in first." });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return json(401, { type: "error", message: "Your session expired — please sign in again." });
  }
  const user = userData.user;

  // --- Profile + monthly usage window ---
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
  if (!profile) return json(500, { type: "error", message: "Could not load your profile." });

  // Paid plans refresh their credits monthly. Free "welcome" credits are
  // one-time — they never reset, so a free account can never cost more than
  // its initial trial.
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  if (
    (profile.plan ?? "free") !== "free" &&
    new Date(profile.period_start) < monthStart
  ) {
    const { data: reset } = await admin
      .from("ds_profiles")
      .update({ gens_used: 0, period_start: monthStart.toISOString() })
      .eq("user_id", user.id)
      .select()
      .single();
    if (reset) profile = reset;
  }

  const plan: string = profile.plan ?? "free";
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  // --- Edit mode: verify ownership ---
  let editingApp: { id: string } | null = null;
  if (body.appId) {
    const { data: owned } = await admin
      .from("ds_apps")
      .select("id, owner")
      .eq("id", body.appId)
      .maybeSingle();
    if (!owned || owned.owner !== user.id) {
      return json(403, { type: "error", message: "That app isn't yours to edit." });
    }
    editingApp = { id: owned.id };
  }
  const currentHtml = (body.currentHtml ?? "").slice(0, 400_000);

  // --- Demo mode (no AI key yet) ---
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    const html = makeDemoApp(prompt);
    const record = editingApp
      ? await admin
          .from("ds_apps")
          .update({ html, prompt, updated_at: new Date().toISOString() })
          .eq("id", editingApp.id)
          .select()
          .single()
      : await admin
          .from("ds_apps")
          .insert({
            owner: user.id,
            title: body.title?.trim() || titleFrom(prompt),
            prompt,
            html,
            slug: crypto.randomUUID().replace(/-/g, "").slice(0, 10),
            is_public: true,
          })
          .select()
          .single();
    if (record.error || !record.data) {
      return json(500, { type: "error", message: "Could not save the app." });
    }
    await admin.from("ds_app_versions").insert({
      app_id: record.data.id,
      owner: user.id,
      prompt,
      html,
    });
    return json(200, {
      type: "demo",
      app: record.data,
      remaining:
        Math.max(0, limit - (profile.gens_used ?? 0)) +
        (profile.bonus_credits ?? 0),
    });
  }

  // --- Credits (monthly plan credits first, then purchased bonus credits) ---
  const planRemaining = Math.max(0, limit - (profile.gens_used ?? 0));
  const bonusCredits = profile.bonus_credits ?? 0;
  if (planRemaining + bonusCredits <= 0) {
    return json(429, {
      type: "error",
      message:
        plan === "free"
          ? `You've used your ${limit} welcome credits. Buy a credit pack to keep building, or upgrade for monthly credits.`
          : `You're out of credits — your ${plan} plan includes ${limit} each month. Buy a credit pack to top up, or upgrade your plan.`,
    });
  }

  // --- Real build: stream from Claude ---
  const model = Deno.env.get("DREAMSTACK_MODEL") ?? "claude-opus-5";
  const useFallbacks = model === "claude-opus-5" || model === "claude-fable-5";
  const anthropic = new Anthropic({ apiKey });

  const messages = editingApp
    ? [
        {
          role: "user" as const,
          content: `Here is the current app:\n\n${currentHtml}\n\nUpdate it per this request: "${prompt}"\n\nReturn the complete updated HTML document, nothing else.`,
        },
      ]
    : [
        {
          role: "user" as const,
          content: `Build this app: ${prompt}`,
        },
      ];

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));
      try {
        const baseReq = {
          model,
          max_tokens: 30_000,
          system: SYSTEM_PROMPT,
          messages,
        };
        const msgStream = useFallbacks
          ? anthropic.beta.messages.stream({
              ...baseReq,
              betas: ["server-side-fallback-2026-07-01"],
              fallbacks: "default",
            } as never)
          : anthropic.messages.stream(baseReq);

        let full = "";
        for await (const ev of msgStream as AsyncIterable<any>) {
          if (
            ev?.type === "content_block_delta" &&
            ev.delta?.type === "text_delta" &&
            typeof ev.delta.text === "string"
          ) {
            full += ev.delta.text;
            send({ type: "chunk", text: ev.delta.text });
          }
        }

        const final = await (msgStream as any).finalMessage();
        if (final?.stop_reason === "refusal") {
          send({
            type: "error",
            message:
              "That request was declined by the AI safety system. Try rephrasing your idea.",
          });
          controller.close();
          return;
        }

        const html = cleanHtml(full);
        if (html.length < 300 || !/<html/i.test(html)) {
          send({
            type: "error",
            message: "The build came back incomplete. Please try again.",
          });
          controller.close();
          return;
        }

        const record = editingApp
          ? await admin
              .from("ds_apps")
              .update({ html, prompt, updated_at: new Date().toISOString() })
              .eq("id", editingApp.id)
              .select()
              .single()
          : await admin
              .from("ds_apps")
              .insert({
                owner: user.id,
                title: body.title?.trim() || titleFrom(prompt),
                prompt,
                html,
                slug: crypto.randomUUID().replace(/-/g, "").slice(0, 10),
                is_public: true,
              })
              .select()
              .single();

        if (record.error || !record.data) {
          send({ type: "error", message: "Built successfully but saving failed. Please try again." });
          controller.close();
          return;
        }

        // Snapshot this build so paid users can restore earlier versions.
        await admin.from("ds_app_versions").insert({
          app_id: record.data.id,
          owner: user.id,
          prompt,
          html,
        });

        let newRemaining: number;
        if (planRemaining > 0) {
          const newUsed = (profile.gens_used ?? 0) + 1;
          await admin
            .from("ds_profiles")
            .update({ gens_used: newUsed })
            .eq("user_id", user.id);
          newRemaining = planRemaining - 1 + bonusCredits;
        } else {
          await admin
            .from("ds_profiles")
            .update({ bonus_credits: bonusCredits - 1 })
            .eq("user_id", user.id);
          newRemaining = bonusCredits - 1;
        }

        send({
          type: "done",
          app: record.data,
          remaining: Math.max(0, newRemaining),
        });
      } catch (e) {
        const msg =
          e instanceof Anthropic.APIError
            ? `The AI service returned an error (${e.status}). Please try again shortly.`
            : "The build hit a snag. Please try again.";
        console.error("[generate] error", (e as Error)?.message);
        try {
          send({ type: "error", message: msg });
        } catch {
          /* stream already closed */
        }
      }
      try {
        controller.close();
      } catch {
        /* already closed */
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS,
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
});
