import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { fetchSiteStats } from "../lib/analytics";
import type { SiteStats } from "../lib/analytics";
import { Footer, Nav } from "../App";
import { PLAN_LIMITS } from "../lib/plans";

interface AdminUser {
  user_id: string;
  email: string | null;
  plan: "free" | "pro" | "studio";
  gens_used: number;
  bonus_credits: number;
  is_owner: boolean;
  created_at: string;
  apps: number;
  views: number;
}

interface AdminApp {
  id: string;
  title: string;
  slug: string;
  is_public: boolean;
  in_gallery: boolean;
  view_count: number;
  remix_count: number;
  created_at: string;
  owner_email: string | null;
}

interface AdminReview {
  id: string;
  author_name: string;
  role_line: string | null;
  rating: number;
  body: string;
  is_approved: boolean;
  created_at: string;
}

type Tab = "overview" | "people" | "apps" | "reviews";

export default function Admin({ session }: { session: Session | null }) {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [apps, setApps] = useState<AdminApp[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      nav("/auth", { replace: true });
      return;
    }
    void loadAll();
  }, [session]);

  function say(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  async function loadAll() {
    const [u, a, r, s] = await Promise.all([
      supabase.rpc("ds_admin_users"),
      supabase.rpc("ds_admin_apps"),
      supabase.rpc("ds_admin_reviews"),
      fetchSiteStats(),
    ]);
    const ud = u.data as { allowed: boolean; users?: AdminUser[] } | null;
    if (!ud?.allowed) {
      setAllowed(false);
      return;
    }
    setAllowed(true);
    setUsers(ud.users ?? []);
    const ad = a.data as { allowed: boolean; apps?: AdminApp[] } | null;
    setApps(ad?.apps ?? []);
    const rd = r.data as { allowed: boolean; reviews?: AdminReview[] } | null;
    setReviews(rd?.reviews ?? []);
    if (s?.allowed) setStats(s);
  }

  async function setPlan(u: AdminUser, plan: string) {
    setBusy(u.user_id);
    await supabase.rpc("ds_admin_set_plan", { p_user: u.user_id, p_plan: plan });
    setUsers((prev) =>
      prev.map((x) =>
        x.user_id === u.user_id ? { ...x, plan: plan as AdminUser["plan"] } : x
      )
    );
    setBusy(null);
    say(`${u.email ?? "User"} moved to ${plan}`);
  }

  async function grant(u: AdminUser, amount: number) {
    setBusy(u.user_id);
    await supabase.rpc("ds_admin_grant_credits", {
      p_user: u.user_id,
      p_credits: amount,
    });
    setUsers((prev) =>
      prev.map((x) =>
        x.user_id === u.user_id
          ? { ...x, bonus_credits: Math.max(0, x.bonus_credits + amount) }
          : x
      )
    );
    setBusy(null);
    say(`${amount > 0 ? "Gave" : "Removed"} ${Math.abs(amount)} credits`);
  }

  async function toggleApp(a: AdminApp, field: "is_public" | "in_gallery") {
    setBusy(a.id);
    const next = !a[field];
    await supabase.rpc("ds_admin_set_app_flags", {
      p_app: a.id,
      p_is_public: field === "is_public" ? next : null,
      p_in_gallery: field === "in_gallery" ? next : null,
    });
    setApps((prev) =>
      prev.map((x) => (x.id === a.id ? { ...x, [field]: next } : x))
    );
    setBusy(null);
    say("Updated");
  }

  async function setReviewApproved(rv: AdminReview, approved: boolean) {
    setBusy(rv.id);
    await supabase.rpc("ds_admin_set_review", {
      p_id: rv.id,
      p_approved: approved,
    });
    setReviews((prev) =>
      prev.map((x) => (x.id === rv.id ? { ...x, is_approved: approved } : x))
    );
    setBusy(null);
    say(approved ? "Review approved — now live" : "Review hidden");
  }

  async function deleteReview(rv: AdminReview) {
    setBusy(rv.id);
    await supabase.rpc("ds_admin_delete_review", { p_id: rv.id });
    setReviews((prev) => prev.filter((x) => x.id !== rv.id));
    setBusy(null);
    say("Review deleted");
  }

  if (!session) return null;

  if (allowed === false) {
    return (
      <div className="min-h-screen flex flex-col">
        <Nav session={session} />
        <main className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="text-5xl">🔒</div>
          <h1 className="text-xl font-semibold">Owners only</h1>
          <p className="text-sm text-white/50">
            This area is for the site owner.
          </p>
          <Link to="/studio" className="grad-btn rounded-full px-6 py-3 text-sm mt-2">
            Back to Studio
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const paying = users.filter((u) => u.plan !== "free");
  const mrr =
    users.filter((u) => u.plan === "pro").length * 19 +
    users.filter((u) => u.plan === "studio").length * 49;

  return (
    <div className="min-h-screen flex flex-col">
      <Nav session={session} />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 pt-28 sm:pt-32 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Admin <span className="grad-text">panel</span>
          </h1>
          <div className="flex gap-1 glass rounded-xl p-1 text-sm">
            {(["overview", "people", "apps", "reviews"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 sm:px-4 py-1.5 capitalize transition-colors ${
                  tab === t ? "bg-white/12 text-white" : "text-white/55 hover:text-white"
                }`}
              >
                {t}
                {t === "people" && users.length > 0 ? ` (${users.length})` : ""}
                {t === "apps" && apps.length > 0 ? ` (${apps.length})` : ""}
                {t === "reviews" && reviews.some((r) => !r.is_approved)
                  ? ` (${reviews.filter((r) => !r.is_approved).length})`
                  : ""}
              </button>
            ))}
          </div>
        </div>

        {allowed === null ? (
          <div className="glass rounded-2xl h-48 shimmer" />
        ) : tab === "overview" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Monthly revenue", value: `$${mrr}` },
                { label: "Paying customers", value: paying.length },
                { label: "Total accounts", value: users.length },
                { label: "Apps built", value: apps.length },
              ].map((t) => (
                <div key={t.label} className="glass rounded-2xl px-4 py-4">
                  <div className="text-2xl font-bold">{t.value}</div>
                  <div className="text-[11px] text-white/45 mt-0.5">{t.label}</div>
                </div>
              ))}
            </div>

            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Visitors today", value: stats.visits_24h },
                  { label: "Visitors 7 days", value: stats.visits_7d },
                  { label: "Shared app opens", value: stats.app_views_total },
                  { label: "Remixes", value: stats.remixes },
                ].map((t) => (
                  <div key={t.label} className="glass rounded-2xl px-4 py-4">
                    <div className="text-2xl font-bold">{t.value}</div>
                    <div className="text-[11px] text-white/45 mt-0.5">
                      {t.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="glass rounded-2xl p-5 text-sm text-white/60">
              <div className="font-medium text-white mb-2">Plan breakdown</div>
              {(["free", "pro", "studio"] as const).map((p) => {
                const n = users.filter((u) => u.plan === p).length;
                return (
                  <div key={p} className="flex justify-between py-1">
                    <span className="capitalize">
                      {p} · {PLAN_LIMITS[p]} credits/mo
                    </span>
                    <span className="text-white/85">{n}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : tab === "people" ? (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[46rem]">
                <thead className="text-[11px] uppercase tracking-wider text-white/40 border-b border-line">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Person</th>
                    <th className="text-left font-medium px-4 py-3">Plan</th>
                    <th className="text-right font-medium px-4 py-3">Credits used</th>
                    <th className="text-right font-medium px-4 py-3">Banked</th>
                    <th className="text-right font-medium px-4 py-3">Apps</th>
                    <th className="text-right font-medium px-4 py-3">Give credits</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.user_id}
                      className="border-b border-line/60 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="truncate max-w-[14rem]">
                          {u.email ?? "—"}
                          {u.is_owner && (
                            <span className="ml-2 text-[10px] grad-text font-semibold">
                              OWNER
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-white/35">
                          joined {new Date(u.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.plan}
                          disabled={busy === u.user_id}
                          onChange={(e) => setPlan(u, e.target.value)}
                          className="bg-black/40 border border-line rounded-lg px-2 py-1 text-xs outline-none"
                        >
                          <option value="free">free</option>
                          <option value="pro">pro</option>
                          <option value="studio">studio</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.gens_used} / {PLAN_LIMITS[u.plan]}
                      </td>
                      <td className="px-4 py-3 text-right">{u.bonus_credits}</td>
                      <td className="px-4 py-3 text-right">
                        {u.apps}
                        {u.views > 0 && (
                          <span className="text-white/35"> · {u.views} views</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {[10, 50].map((n) => (
                          <button
                            key={n}
                            onClick={() => grant(u, n)}
                            disabled={busy === u.user_id}
                            className="ml-1 rounded-lg border border-line px-2 py-1 text-xs text-white/70 hover:bg-white/5"
                          >
                            +{n}
                          </button>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : tab === "apps" ? (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[44rem]">
                <thead className="text-[11px] uppercase tracking-wider text-white/40 border-b border-line">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">App</th>
                    <th className="text-left font-medium px-4 py-3">Built by</th>
                    <th className="text-right font-medium px-4 py-3">Views</th>
                    <th className="text-right font-medium px-4 py-3">Remixes</th>
                    <th className="text-right font-medium px-4 py-3">Visibility</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((a) => (
                    <tr key={a.id} className="border-b border-line/60 last:border-0">
                      <td className="px-4 py-3">
                        <a
                          href={`/a/${a.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline truncate block max-w-[16rem]"
                        >
                          {a.title}
                        </a>
                        <div className="text-[11px] text-white/35">
                          {new Date(a.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 truncate max-w-[12rem] text-white/60">
                        {a.owner_email ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">{a.view_count}</td>
                      <td className="px-4 py-3 text-right">{a.remix_count}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => toggleApp(a, "is_public")}
                          disabled={busy === a.id}
                          className="rounded-lg border border-line px-2 py-1 text-xs text-white/70 hover:bg-white/5"
                        >
                          {a.is_public ? "Public" : "Private"}
                        </button>
                        <button
                          onClick={() => toggleApp(a, "in_gallery")}
                          disabled={busy === a.id}
                          className="ml-1 rounded-lg border border-line px-2 py-1 text-xs text-white/70 hover:bg-white/5"
                        >
                          {a.in_gallery ? "In gallery" : "Hidden"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center text-sm text-white/50">
                No reviews yet. When someone submits one from their Account page,
                it shows up here for you to approve before it goes live on the
                homepage.
              </div>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="glass rounded-2xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm mb-1">
                        <span className="grad-text">{"★".repeat(r.rating)}</span>
                        <span className="text-white/15">
                          {"★".repeat(5 - r.rating)}
                        </span>
                        {r.is_approved ? (
                          <span className="ml-3 text-[10px] uppercase tracking-wider text-emerald-300/80">
                            Live
                          </span>
                        ) : (
                          <span className="ml-3 text-[10px] uppercase tracking-wider text-amber-300/80">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/80 leading-relaxed">
                        “{r.body}”
                      </p>
                      <div className="text-xs text-white/45 mt-2">
                        {r.author_name}
                        {r.role_line ? ` · ${r.role_line}` : ""} ·{" "}
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setReviewApproved(r, !r.is_approved)}
                        disabled={busy === r.id}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
                      >
                        {r.is_approved ? "Hide" : "Approve"}
                      </button>
                      <button
                        onClick={() => deleteReview(r)}
                        disabled={busy === r.id}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs text-rose-300/80 hover:bg-white/5"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 glass rounded-full px-5 py-2.5 text-sm text-white/90 z-50 shadow-lg">
          {toast}
        </div>
      )}
      <Footer />
    </div>
  );
}
