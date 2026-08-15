import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { DsProfile } from "../lib/supabase";
import { openBillingPortal, startCheckout } from "../lib/api";
import { CREDIT_PACKS, PLANS, PLAN_LIMITS, planName } from "../lib/plans";
import { fetchSiteStats } from "../lib/analytics";
import type { SiteStats } from "../lib/analytics";
import { Footer, Nav } from "../App";

export default function Account({ session }: { session: Session | null }) {
  const nav = useNavigate();
  const [profile, setProfile] = useState<DsProfile | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [adsense, setAdsense] = useState("");
  const [adsenseMsg, setAdsenseMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      nav("/auth", { replace: true });
      return;
    }
    supabase
      .from("ds_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setProfile(data as DsProfile);
        setAdsense((data as DsProfile).adsense_id ?? "");
      });
    fetchSiteStats().then((s) => s?.allowed && setStats(s));
  }, [session]);

  if (!session) return null;

  const plan = profile?.plan ?? "free";
  const used = profile?.gens_used ?? 0;
  const limit = PLAN_LIMITS[plan] ?? 5;
  const pct = Math.min(100, Math.round((used / limit) * 100));

  async function upgrade(id: "pro" | "studio") {
    setBusy(id);
    setMsg(null);
    try {
      await startCheckout({ plan: id });
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function buyPack(id: "small" | "large") {
    setBusy(`pack-${id}`);
    setMsg(null);
    try {
      await startCheckout({ pack: id });
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function saveAdsense() {
    setBusy("adsense");
    setAdsenseMsg(null);
    const { error } = await supabase.rpc("ds_set_adsense", { p_id: adsense });
    setBusy(null);
    setAdsenseMsg(
      error
        ? error.message
        : adsense
          ? "Connected ✓ — your ads will run on apps you publish."
          : "Disconnected — no ads will run on your apps."
    );
  }

  async function portal() {
    setBusy("portal");
    setMsg(null);
    try {
      await openBillingPortal();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav session={session} />
      <main className="flex-1 mx-auto w-full max-w-3xl px-6 pt-32 pb-16">
        <h1 className="text-2xl font-bold tracking-tight mb-8">Your account</h1>

        {stats && (
          <div className="glass rounded-2xl p-6 mb-5">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="font-semibold">
                Dreamstack <span className="grad-text">dashboard</span>
              </h2>
              <span className="text-[11px] text-white/35">only you see this</span>
            </div>
            <p className="text-xs text-white/45 mb-5">
              Anonymous counts from your own database — no cookies, no trackers.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Visitors today", value: stats.visits_24h },
                { label: "Last 7 days", value: stats.visits_7d },
                { label: "Visitors all time", value: stats.visits_total },
                { label: "Shared app opens", value: stats.app_views_total },
              ].map((t) => (
                <div
                  key={t.label}
                  className="rounded-xl bg-black/30 border border-line px-4 py-3"
                >
                  <div className="text-2xl font-bold">{t.value}</div>
                  <div className="text-[11px] text-white/45 mt-0.5">
                    {t.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Sign-ups", value: stats.accounts },
                { label: "Actually built", value: stats.builders },
                { label: "Apps created", value: stats.apps },
                { label: "Remixes", value: stats.remixes },
              ].map((t) => (
                <div
                  key={t.label}
                  className="rounded-xl bg-black/30 border border-line px-4 py-3"
                >
                  <div className="text-2xl font-bold">{t.value}</div>
                  <div className="text-[11px] text-white/45 mt-0.5">
                    {t.label}
                  </div>
                </div>
              ))}
            </div>

            {stats.accounts > 0 && (
              <p className="text-xs text-white/50 mt-4">
                <strong className="text-white/80">
                  {Math.round((stats.builders / stats.accounts) * 100)}%
                </strong>{" "}
                of people who sign up go on to build something. Below about 50%
                means the first minute of the product needs work, not the
                marketing.
              </p>
            )}

            {stats.top_referrers.length > 0 && (
              <div className="mt-5 pt-4 border-t border-line">
                <div className="text-xs text-white/45 mb-2">
                  Where visitors came from
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.top_referrers.map((r) => (
                    <span
                      key={r.referrer}
                      className="text-xs rounded-full border border-line px-3 py-1 text-white/70"
                    >
                      {r.referrer} · {r.n}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="glass rounded-2xl p-6 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <div className="text-sm text-white/50">{session.user.email}</div>
              <div className="text-lg font-semibold mt-1">
                {planName(plan)} plan
              </div>
            </div>
            <div className="flex gap-2">
              {stats && (
                <Link
                  to="/admin"
                  className="rounded-xl border border-line px-4 py-2.5 text-sm text-white/75 hover:bg-white/5"
                >
                  Admin panel
                </Link>
              )}
              <Link to="/studio" className="grad-btn rounded-xl px-5 py-2.5 text-sm">
                Open Studio
              </Link>
            </div>
          </div>
          <div className="text-xs text-white/50 mb-2">
            {plan === "free"
              ? `${used} of ${limit} welcome credits used`
              : `${used} of ${limit} plan credits used this month`}
            {(profile?.bonus_credits ?? 0) > 0 && (
              <span className="text-white/70">
                {" "}
                · {profile!.bonus_credits} purchased credits banked
              </span>
            )}
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full grad-btn transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {msg && <p className="text-amber-300/90 text-sm mb-5">{msg}</p>}

        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          {PLANS.filter((p) => p.id !== "free").map((p) => (
            <div key={p.id} className="glass rounded-2xl p-5">
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-semibold">{p.name}</span>
                <span className="text-xl font-bold">
                  {p.price}
                  <span className="text-xs text-white/40">{p.priceNote}</span>
                </span>
              </div>
              <p className="text-xs text-white/50 mb-4">{p.blurb}</p>
              {plan === p.id ? (
                <span className="inline-block text-xs rounded-full border border-emerald-300/40 text-emerald-300 px-3 py-1">
                  Current plan
                </span>
              ) : (
                <button
                  onClick={() => upgrade(p.id as "pro" | "studio")}
                  disabled={busy === p.id}
                  className="grad-btn rounded-xl px-4 py-2 text-sm w-full"
                >
                  {busy === p.id ? "One moment…" : p.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-6 mb-5">
          <h2 className="font-semibold mb-1">
            Earn from your apps with{" "}
            <span className="grad-text">Google AdSense</span>
          </h2>
          <p className="text-xs text-white/50 mb-4">
            Connect your own AdSense account and the ads on your published apps
            pay <strong className="text-white/80">you</strong>. You'll need an
            approved AdSense account — get your publisher ID from{" "}
            <a
              href="https://adsense.google.com"
              target="_blank"
              rel="noreferrer"
              className="grad-text"
            >
              adsense.google.com
            </a>
            .
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={adsense}
              onChange={(e) => setAdsense(e.target.value.trim())}
              placeholder="ca-pub-0000000000000000"
              className="flex-1 rounded-xl bg-black/30 border border-line px-4 py-3 text-sm outline-none focus:border-white/30 font-mono"
            />
            <button
              onClick={saveAdsense}
              disabled={busy === "adsense"}
              className="grad-btn rounded-xl px-5 py-3 text-sm shrink-0"
            >
              {busy === "adsense" ? "Saving…" : "Save"}
            </button>
          </div>
          {adsenseMsg && (
            <p className="mt-3 text-sm text-white/70">{adsenseMsg}</p>
          )}
        </div>

        <h2 className="text-lg font-semibold tracking-tight mb-3 mt-8">
          Need more? <span className="grad-text">Top up credits</span>
        </h2>
        <p className="text-xs text-white/45 mb-4">
          One-time purchase, no subscription needed. Purchased credits never
          expire and are used after your monthly plan credits.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {CREDIT_PACKS.map((p) => (
            <div key={p.id} className="glass rounded-2xl p-5">
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-semibold">
                  {p.name} · {p.credits} credits
                </span>
                <span className="text-xl font-bold">{p.price}</span>
              </div>
              <p className="text-xs text-white/45 mb-1">{p.perCredit}</p>
              <p className="text-xs text-white/50 mb-4">{p.blurb}</p>
              <button
                onClick={() => buyPack(p.id)}
                disabled={busy === `pack-${p.id}`}
                className="grad-btn rounded-xl px-4 py-2 text-sm w-full"
              >
                {busy === `pack-${p.id}` ? "One moment…" : `Buy ${p.credits} credits`}
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <button
            onClick={portal}
            disabled={busy === "portal"}
            className="rounded-xl border border-line px-4 py-2.5 text-white/70 hover:bg-white/5"
          >
            {busy === "portal" ? "Opening…" : "Manage billing"}
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              nav("/");
            }}
            className="rounded-xl border border-line px-4 py-2.5 text-white/70 hover:bg-white/5"
          >
            Sign out
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
