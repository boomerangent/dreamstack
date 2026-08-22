import { supabase } from "./supabase";

export type EventKind =
  | "view_home"
  | "view_gallery"
  | "view_app"
  | "signup"
  | "build";

/**
 * Records one anonymous event. No cookies, no personal data, no third party —
 * it writes a row into our own database. Repeat views of the same thing from
 * the same tab within 30 minutes are ignored so the numbers stay meaningful.
 */
export function track(kind: EventKind, appId?: string) {
  try {
    const key = `ds_t_${kind}_${appId ?? ""}`;
    const last = Number(sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last < 30 * 60 * 1000) return;
    sessionStorage.setItem(key, String(Date.now()));

    // Only the sending site is kept (e.g. "tiktok.com"), never the full URL.
    let ref = "";
    if (document.referrer) {
      try {
        const h = new URL(document.referrer).hostname.replace(/^www\./, "");
        if (h && h !== window.location.hostname) ref = h;
      } catch {
        /* ignore malformed referrers */
      }
    }

    // NOTE: supabase-js query builders only send their request once `.then`
    // is called (they are lazy "thenables"). A bare `void supabase.rpc(...)`
    // builds the request but never fires it — which is why nothing was ever
    // recorded. Calling `.then` here actually sends it; we swallow both
    // outcomes so analytics can never surface an error to the visitor.
    supabase
      .rpc("ds_track", {
        p_kind: kind,
        p_app_id: appId ?? null,
        p_referrer: ref || null,
        p_path: window.location.pathname,
      })
      .then(
        () => {},
        () => {},
      );
  } catch {
    /* analytics must never break the page */
  }
}

export interface SiteStats {
  allowed: boolean;
  visits_24h: number;
  visits_7d: number;
  visits_total: number;
  app_views_total: number;
  accounts: number;
  builders: number;
  apps: number;
  remixes: number;
  top_referrers: { referrer: string; n: number }[];
}

export async function fetchSiteStats(): Promise<SiteStats | null> {
  const { data } = await supabase.rpc("ds_site_stats");
  return (data as SiteStats) ?? null;
}
