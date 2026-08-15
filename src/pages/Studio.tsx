import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { DsApp, DsAppVersion, DsProfile } from "../lib/supabase";
import { generateApp } from "../lib/api";
import { PLAN_LIMITS, planName } from "../lib/plans";
import { Logo } from "../App";
import { remixApp } from "./Gallery";
import { track } from "../lib/analytics";

const BUILD_PHASES = [
  [0, "Reading your idea…"],
  [200, "Sketching the design…"],
  [2500, "Writing the interface…"],
  [9000, "Wiring up the logic…"],
  [18000, "Polishing details…"],
] as const;

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const DOMAIN_RE =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export default function Studio({ session }: { session: Session | null }) {
  const nav = useNavigate();
  const [apps, setApps] = useState<DsApp[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [profile, setProfile] = useState<DsProfile | null>(null);
  const [prompt, setPrompt] = useState(
    () => localStorage.getItem("ds_pending_prompt") ?? ""
  );
  const [editPrompt, setEditPrompt] = useState("");
  const [building, setBuilding] = useState(false);
  const [buf, setBuf] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<DsAppVersion[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const consoleRef = useRef<HTMLPreElement>(null);

  const sel = apps.find((a) => a.id === selId) ?? null;
  const plan = profile?.plan ?? "free";
  const limit = PLAN_LIMITS[plan] ?? 5;
  const paid = plan !== "free";
  const studio = plan === "studio";

  useEffect(() => {
    if (!session) {
      nav("/auth", { replace: true });
      return;
    }
    void loadAll(session.user.id);
  }, [session]);

  useEffect(() => {
    if (consoleRef.current)
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [buf]);

  useEffect(() => {
    setShowHistory(false);
    setVersions(null);
    setMenuOpen(false);
  }, [selId]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  /** Completes a "Remix this" click that sent the visitor through sign-up. */
  async function claimPendingRemix(uid: string): Promise<string | null> {
    const slug = localStorage.getItem("ds_remix_slug");
    if (!slug) return null;
    localStorage.removeItem("ds_remix_slug");
    const { data: source } = await supabase
      .from("ds_apps")
      .select("id, title, prompt, html")
      .eq("slug", slug)
      .eq("is_public", true)
      .maybeSingle();
    if (!source) return null;
    const copy = await remixApp(source as DsApp, uid);
    if (copy) showToast("Remixed ✓ — it's yours to change now.");
    return copy?.id ?? null;
  }

  async function loadAll(uid: string) {
    // Anyone arriving here has an account (email or Google) — make sure they
    // have a profile row so their credits and the owner stats are correct.
    await supabase.rpc("ds_ensure_profile");
    const remixedId = await claimPendingRemix(uid);
    const [appsRes, profRes] = await Promise.all([
      supabase
        .from("ds_apps")
        .select("*")
        .eq("owner", uid)
        .order("updated_at", { ascending: false }),
      supabase.from("ds_profiles").select("*").eq("user_id", uid).maybeSingle(),
    ]);
    if (appsRes.data) {
      setApps(appsRes.data as DsApp[]);
      if (remixedId) setSelId(remixedId);
      else if (appsRes.data.length && !selId) setSelId(appsRes.data[0].id);
    }
    if (profRes.data) {
      const p = profRes.data as DsProfile;
      setProfile(p);
      setRemaining(
        Math.max(0, (PLAN_LIMITS[p.plan] ?? 5) - p.gens_used) +
          (p.bonus_credits ?? 0)
      );
    } else {
      setRemaining(PLAN_LIMITS.free);
    }
  }

  async function runBuild(opts: {
    prompt: string;
    appId?: string;
    currentHtml?: string;
    title?: string;
  }) {
    setBuilding(true);
    setBuf("");
    setError(null);
    setDemo(false);
    try {
      const res = await generateApp(opts, (t) => setBuf((b) => b + t));
      track("build");
      setApps((prev) => {
        const rest = prev.filter((a) => a.id !== res.app.id);
        return [res.app, ...rest];
      });
      setSelId(res.app.id);
      setRemaining(res.remaining);
      setDemo(res.demo);
      setVersions(null);
      localStorage.removeItem("ds_pending_prompt");
      setPrompt("");
      setEditPrompt("");
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setBuilding(false);
    }
  }

  function phaseFor(len: number): string {
    let label: string = BUILD_PHASES[0][1];
    for (const [at, text] of BUILD_PHASES) if (len >= at) label = text;
    return label;
  }

  async function saveApp(app: DsApp, patch: Partial<DsApp>) {
    const { data } = await supabase
      .from("ds_apps")
      .update(patch)
      .eq("id", app.id)
      .select()
      .single();
    if (data)
      setApps((prev) =>
        prev.map((a) => (a.id === app.id ? (data as DsApp) : a))
      );
    return data as DsApp | null;
  }

  async function togglePublic(app: DsApp) {
    if (!paid && app.is_public) {
      setError("Private apps are a Builder perk — Upgrade to lock this app.");
      return;
    }
    await saveApp(app, { is_public: !app.is_public });
  }

  async function rename(app: DsApp, title: string) {
    if (!title.trim() || title === app.title) return;
    await saveApp(app, { title: title.trim() });
  }

  async function removeApp(app: DsApp) {
    if (!confirm(`Delete “${app.title}”? This can't be undone.`)) return;
    await supabase.from("ds_apps").delete().eq("id", app.id);
    setApps((prev) => prev.filter((a) => a.id !== app.id));
    if (selId === app.id) setSelId(null);
  }

  function download(app: DsApp) {
    const blob = new Blob([app.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${app.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyShare(app: DsApp) {
    navigator.clipboard.writeText(`${window.location.origin}/a/${app.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  /* ---------- Premium features ---------- */

  async function toggleHistory() {
    if (!paid) {
      setError("Version history is a Builder perk — Upgrade to restore earlier builds.");
      return;
    }
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    if (!sel) return;
    setShowHistory(true);
    if (!versions) {
      const { data } = await supabase
        .from("ds_app_versions")
        .select("id, app_id, prompt, created_at")
        .eq("app_id", sel.id)
        .order("created_at", { ascending: false })
        .limit(30);
      setVersions((data as DsAppVersion[]) ?? []);
    }
  }

  async function restoreVersion(v: DsAppVersion) {
    if (!sel) return;
    const { data } = await supabase
      .from("ds_app_versions")
      .select("html")
      .eq("id", v.id)
      .single();
    if (!data?.html) {
      showToast("Couldn't load that version.");
      return;
    }
    await saveApp(sel, { html: data.html });
    setShowHistory(false);
    showToast("Restored ✓");
  }

  function copyEmbed(app: DsApp) {
    if (!paid) {
      setError("Embedding is a Builder perk — Upgrade to put apps on your own site.");
      return;
    }
    const snippet = `<iframe src="${window.location.origin}/a/${app.slug}" style="width:100%;height:600px;border:0;border-radius:12px;overflow:hidden" title="${app.title.replace(/"/g, "'")}" loading="lazy"></iframe>`;
    navigator.clipboard.writeText(snippet);
    showToast("Embed code copied ✓ — paste it into any website.");
  }

  async function setSharePassword(app: DsApp) {
    if (!studio) {
      setError("Password-protected links are a Studio perk — Upgrade to protect apps.");
      return;
    }
    const pw = window.prompt(
      app.share_password_hash
        ? "Enter a new password for this app, or leave empty to remove protection:"
        : "Set a password viewers must enter to open this app:"
    );
    if (pw === null) return;
    if (pw === "") {
      await saveApp(app, { share_password_hash: null });
      showToast("Password removed — the link is open again.");
    } else {
      const hash = await sha256Hex(pw);
      await saveApp(app, { share_password_hash: hash });
      showToast("Password set ✓ — share it alongside the link.");
    }
  }

  async function toggleGallery(app: DsApp) {
    const updated = await saveApp(app, { in_gallery: !app.in_gallery });
    showToast(
      updated?.in_gallery
        ? "Showing in the public gallery — others can remix it."
        : "Hidden from the gallery. Your share link still works."
    );
  }

  async function toggleBadge(app: DsApp) {
    if (!studio) {
      setError("White-label is a Studio perk — Upgrade to hide the Dreamstack badge.");
      return;
    }
    const updated = await saveApp(app, { hide_badge: !app.hide_badge });
    showToast(
      updated?.hide_badge
        ? "Badge hidden — the app is fully white-label."
        : "Badge showing again."
    );
  }

  async function setDomain(app: DsApp) {
    if (!studio) {
      setError("Custom domains are a Studio perk — Upgrade to use your own domain.");
      return;
    }
    const input = window.prompt(
      app.custom_domain
        ? `This app is set to ${app.custom_domain}. Enter a new domain, or leave empty to disconnect:`
        : "Enter the domain to serve this app on (e.g. myapp.com):"
    );
    if (input === null) return;
    const domain = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (domain === "") {
      await saveApp(app, { custom_domain: null });
      showToast("Custom domain disconnected.");
      return;
    }
    if (!DOMAIN_RE.test(domain)) {
      showToast("That doesn't look like a valid domain.");
      return;
    }
    const updated = await saveApp(app, { custom_domain: domain });
    if (!updated) {
      showToast("That domain is already in use.");
      return;
    }
    alert(
      `Almost there! Two steps to make ${domain} live:\n\n1) In the domain's DNS settings, add a CNAME record pointing ${domain} to dreamstack-ai.netlify.app\n\n2) The domain must also be attached in the site's Netlify dashboard (Domain management → Add domain alias).\n\nUntil then, the app stays available at its normal share link.`
    );
  }

  if (!session) return null;

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="md:hidden rounded-lg border border-line px-2.5 py-1.5 text-white/70"
            aria-label="Your apps"
          >
            ☰
          </button>
          <Link to="/" className="text-[15px]">
            <Logo size={18} />
          </Link>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-sm shrink-0">
          <span
            className={`rounded-full px-3 py-1 text-xs border ${
              (remaining ?? 1) > 0
                ? "border-line text-white/60"
                : "border-rose-400/40 text-rose-300"
            }`}
            title={`${planName(plan)} plan — ${limit} credits/month plus any purchased credits`}
          >
            ✦ {remaining ?? "–"} credits left
          </span>
          <Link to="/account" className="text-white/60 hover:text-white">
            Account
          </Link>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 relative">
        {/* Tapping outside closes the slide-over list on phones */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-20"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — a slide-over drawer on phones, always-on column on desktop */}
        <aside
          className={`${
            sidebarOpen ? "flex" : "hidden"
          } md:flex absolute md:relative inset-y-0 left-0 z-30 w-60 shrink-0 border-r border-line p-3 flex-col gap-2 overflow-y-auto bg-ink md:bg-transparent`}
        >
          <button
            onClick={() => {
              setSelId(null);
              setError(null);
              setDemo(false);
              setSidebarOpen(false);
            }}
            className="grad-btn rounded-xl py-2.5 text-sm"
          >
            + New app
          </button>
          {apps.length === 0 && (
            <p className="text-xs text-white/35 px-2 pt-3">
              Your apps will appear here.
            </p>
          )}
          {apps.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setSelId(a.id);
                setError(null);
                setSidebarOpen(false);
              }}
              className={`text-left rounded-xl px-3 py-2.5 text-sm transition-colors ${
                selId === a.id
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5"
              }`}
            >
              <span className="block truncate">{a.title}</span>
              <span className="block text-[10px] text-white/30 mt-0.5">
                {a.is_public ? (a.share_password_hash ? "🔒 Protected" : "Shared") : "Private"}
                {a.view_count > 0 ? ` · ${a.view_count} views` : ""}
                {a.custom_domain ? ` · ${a.custom_domain}` : ""} ·{" "}
                {new Date(a.updated_at).toLocaleDateString()}
              </span>
            </button>
          ))}
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col">
          {demo && (
            <div className="bg-amber-400/10 border-b border-amber-300/20 text-amber-200 text-xs px-4 py-2">
              Demo mode — the AI key isn't connected yet, so this is a sample
              app. Once the owner adds a Claude API key, builds become fully
              AI-generated.
            </div>
          )}
          {error && (
            <div className="bg-rose-400/10 border-b border-rose-300/20 text-rose-200 text-xs px-4 py-2 flex justify-between items-center">
              <span>{error}</span>
              {error.toLowerCase().includes("upgrade") ||
              error.toLowerCase().includes("credit") ? (
                <Link to="/account" className="underline shrink-0 ml-3">
                  See plans
                </Link>
              ) : null}
            </div>
          )}

          {building ? (
            /* Build console */
            <div className="flex-1 flex flex-col p-6 gap-4 min-h-0">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full grad-btn animate-pulse" />
                <span className="text-sm text-white/80">{phaseFor(buf.length)}</span>
                <span className="text-xs text-white/35 font-mono ml-auto">
                  {buf.length.toLocaleString()} characters written
                </span>
              </div>
              <div className="h-1.5 rounded-full shimmer" />
              <pre
                ref={consoleRef}
                className="flex-1 min-h-0 overflow-y-auto rounded-2xl bg-black/50 border border-line p-4 font-mono text-[11px] leading-relaxed text-emerald-200/70 whitespace-pre-wrap"
              >
                {buf.slice(-6000) || "Connecting to the dream engine…"}
                <span className="blink">▌</span>
              </pre>
            </div>
          ) : sel ? (
            /* Preview */
            <>
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-line text-sm overflow-x-auto">
                <input
                  key={sel.id}
                  defaultValue={sel.title}
                  onBlur={(e) => rename(sel, e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.target as HTMLInputElement).blur()
                  }
                  className="bg-transparent outline-none font-medium min-w-[6rem] flex-1 focus:border-b focus:border-white/30"
                />
                <button
                  onClick={() => copyShare(sel)}
                  className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
                >
                  {copied ? "Link copied ✓" : "Share link"}
                </button>
                <button
                  onClick={() => togglePublic(sel)}
                  className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
                  title={
                    paid ? "Toggle visibility" : "Free apps are public — upgrade for private apps"
                  }
                >
                  {sel.is_public ? "Public" : "Private"}
                </button>
                <button
                  onClick={() => void toggleHistory()}
                  className={`shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-white/5 ${
                    showHistory ? "text-white bg-white/10" : "text-white/70"
                  }`}
                >
                  History
                </button>
                <div className="relative shrink-0">
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
                  >
                    More ⋯
                  </button>
                  {menuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-64 glass rounded-xl p-1.5 z-20 text-[13px]">
                        {[
                          {
                            label: "Copy embed code",
                            hint: paid ? "" : "Builder",
                            fn: () => copyEmbed(sel),
                          },
                          {
                            label: sel.share_password_hash
                              ? "Change / remove password"
                              : "Password-protect link",
                            hint: studio ? "" : "Studio",
                            fn: () => void setSharePassword(sel),
                          },
                          {
                            label: sel.hide_badge
                              ? "Show Dreamstack badge"
                              : "Hide Dreamstack badge",
                            hint: studio ? "" : "Studio",
                            fn: () => void toggleBadge(sel),
                          },
                          {
                            label: sel.custom_domain
                              ? `Domain: ${sel.custom_domain}`
                              : "Connect custom domain",
                            hint: studio ? "" : "Studio",
                            fn: () => void setDomain(sel),
                          },
                          {
                            label: sel.in_gallery
                              ? "Hide from public gallery"
                              : "Show in public gallery",
                            hint: "",
                            fn: () => void toggleGallery(sel),
                          },
                          { label: "Download file", hint: "", fn: () => download(sel) },
                          {
                            label: "Delete app",
                            hint: "",
                            fn: () => void removeApp(sel),
                            danger: true,
                          },
                        ].map((item) => (
                          <button
                            key={item.label}
                            onClick={() => {
                              setMenuOpen(false);
                              item.fn();
                            }}
                            className={`w-full text-left rounded-lg px-3 py-2 flex justify-between items-center hover:bg-white/8 ${
                              (item as any).danger
                                ? "text-rose-300/90"
                                : "text-white/80"
                            }`}
                          >
                            <span className="truncate">{item.label}</span>
                            {item.hint && (
                              <span className="text-[10px] grad-text font-semibold ml-2 shrink-0">
                                {item.hint}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 min-h-0 relative">
                <iframe
                  key={sel.updated_at}
                  title={sel.title}
                  srcDoc={sel.html}
                  sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads allow-pointer-lock"
                  className="w-full h-full bg-white/[0.02]"
                />
                {showHistory && (
                  <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85%] glass border-l border-line overflow-y-auto p-3 z-10">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <span className="text-sm font-medium">Version history</span>
                      <button
                        onClick={() => setShowHistory(false)}
                        className="text-white/40 hover:text-white text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    {!versions ? (
                      <p className="text-xs text-white/40 px-1">Loading…</p>
                    ) : versions.length === 0 ? (
                      <p className="text-xs text-white/40 px-1">
                        No saved versions yet — every new build and edit is
                        snapshotted from now on.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {versions.map((v, i) => (
                          <div
                            key={v.id}
                            className="rounded-xl bg-black/30 border border-line p-3"
                          >
                            <div className="text-[11px] text-white/40 mb-1">
                              {i === 0 ? "Latest · " : ""}
                              {new Date(v.created_at).toLocaleString()}
                            </div>
                            <div className="text-xs text-white/70 line-clamp-2 mb-2">
                              “{v.prompt ?? "Build"}”
                            </div>
                            {i !== 0 && (
                              <button
                                onClick={() => void restoreVersion(v)}
                                className="text-xs grad-text font-semibold"
                              >
                                Restore this version
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-line flex gap-2">
                <input
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && editPrompt.trim())
                      void runBuild({
                        prompt: editPrompt.trim(),
                        appId: sel.id,
                        currentHtml: sel.html,
                        title: sel.title,
                      });
                  }}
                  placeholder="Ask for a change — “make it neon green”, “add a leaderboard”…"
                  className="flex-1 rounded-xl bg-black/30 border border-line px-4 py-3 text-sm outline-none focus:border-white/30"
                />
                <button
                  onClick={() =>
                    editPrompt.trim() &&
                    void runBuild({
                      prompt: editPrompt.trim(),
                      appId: sel.id,
                      currentHtml: sel.html,
                      title: sel.title,
                    })
                  }
                  disabled={!editPrompt.trim()}
                  className="grad-btn rounded-xl px-4 sm:px-5 py-3 text-sm shrink-0"
                >
                  ✦ Update
                </button>
              </div>
            </>
          ) : (
            /* New app prompt */
            <div className="flex-1 flex items-center justify-center p-6 relative">
              <div className="aurora" />
              <div className="relative w-full max-w-xl text-center">
                <h1 className="text-3xl font-bold tracking-tight mb-2">
                  What should we <span className="grad-text">dream up</span>?
                </h1>
                <p className="text-sm text-white/50 mb-8">
                  Describe the app you want. Be as specific or as wild as you
                  like.
                </p>
                <div className="glass rounded-2xl p-2 flex flex-col gap-2">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    placeholder="A recipe box where I can save recipes, tag them, and get a random dinner suggestion…"
                    className="resize-none bg-transparent px-4 py-3 outline-none placeholder:text-white/30 text-[15px] text-left"
                  />
                  <button
                    onClick={() =>
                      prompt.trim() && void runBuild({ prompt: prompt.trim() })
                    }
                    disabled={!prompt.trim() || (remaining ?? 1) <= 0}
                    className="grad-btn rounded-xl px-6 py-3.5 text-sm"
                  >
                    {(remaining ?? 1) <= 0 ? "Out of credits" : "✦ Build it"}
                  </button>
                </div>
                {(remaining ?? 1) <= 0 && (
                  <p className="mt-4 text-sm text-white/50">
                    <Link to="/account" className="grad-text font-medium">
                      Top up credits or upgrade
                    </Link>{" "}
                    to keep building.
                  </p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 glass rounded-full px-5 py-2.5 text-sm text-white/90 z-50 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
