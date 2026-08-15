import { FUNCTIONS_URL, SUPABASE_ANON_KEY, supabase } from "./supabase";
import type { DsApp } from "./supabase";

export interface GenerateResult {
  app: DsApp;
  remaining: number;
  demo: boolean;
}

async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Please sign in first.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
    apikey: SUPABASE_ANON_KEY,
  };
}

/**
 * Calls the `generate` function. Streams progress chunks via onChunk while the
 * AI writes code, then resolves with the saved app.
 */
export async function generateApp(
  opts: { prompt: string; appId?: string; currentHtml?: string; title?: string },
  onChunk: (text: string) => void
): Promise<GenerateResult> {
  const headers = await authHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify(opts),
  });

  const ct = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    let msg = `The build failed (${res.status}). Please try again.`;
    try {
      const j = await res.json();
      msg = j.message ?? j.error ?? msg;
    } catch {
      /* keep default */
    }
    throw new Error(msg);
  }

  // Demo mode (no AI key configured yet) returns a single JSON payload.
  if (ct.includes("application/json")) {
    const j = await res.json();
    if (j.type === "error") throw new Error(j.message ?? "Build failed.");
    return { app: j.app, remaining: j.remaining ?? 0, demo: j.type === "demo" };
  }

  // Live build: newline-delimited JSON stream.
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let result: GenerateResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const s = line.trim();
      if (!s) continue;
      let ev: any;
      try {
        ev = JSON.parse(s);
      } catch {
        continue;
      }
      if (ev.type === "chunk") onChunk(ev.text as string);
      else if (ev.type === "done")
        result = { app: ev.app, remaining: ev.remaining ?? 0, demo: !!ev.demo };
      else if (ev.type === "error") throw new Error(ev.message ?? "Build failed.");
    }
  }

  if (!result)
    throw new Error("The build stream ended unexpectedly. Please try again.");
  return result;
}

export async function startCheckout(opts: {
  plan?: "pro" | "studio";
  pack?: "small" | "large";
}): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/checkout`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...opts, origin: window.location.origin }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.url) {
    throw new Error(
      j.message ??
        "Payments aren't switched on yet — the site owner needs to connect Stripe."
    );
  }
  window.location.href = j.url;
}

/** Fetch a shared app through the server, supplying a password when asked. */
export async function fetchProtectedApp(
  slug: string,
  password?: string
): Promise<{
  status: "ok" | "locked" | "wrong" | "missing";
  title?: string;
  html?: string;
  hide_badge?: boolean;
}> {
  const res = await fetch(`${FUNCTIONS_URL}/view`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ slug, password }),
  });
  if (res.status === 401) return { status: "locked" };
  if (res.status === 403) return { status: "wrong" };
  if (!res.ok) return { status: "missing" };
  const j = await res.json();
  return { status: "ok", ...j };
}

export async function openBillingPortal(): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/portal`, {
    method: "POST",
    headers,
    body: JSON.stringify({ origin: window.location.origin }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.url) {
    throw new Error(j.message ?? "Billing portal is not available yet.");
  }
  window.location.href = j.url;
}
