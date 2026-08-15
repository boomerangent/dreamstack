import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { fetchProtectedApp } from "../lib/api";
import { track } from "../lib/analytics";

export default function Viewer() {
  const { slug } = useParams<{ slug: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [hideBadge, setHideBadge] = useState(false);
  const [state, setState] = useState<"loading" | "ok" | "locked" | "missing">(
    "loading"
  );
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!slug) return;
    // Public unprotected apps are readable directly; protected ones need the
    // password check on the server.
    supabase
      .from("ds_apps")
      .select("id, title, html, hide_badge")
      .eq("slug", slug)
      .eq("is_public", true)
      .maybeSingle()
      .then(async ({ data }) => {
        if (data) {
          track("view_app", data.id);
          show(data.title, data.html, !!data.hide_badge);
          return;
        }
        const res = await fetchProtectedApp(slug);
        if (res.status === "locked") setState("locked");
        else if (res.status === "ok") show(res.title!, res.html!, !!res.hide_badge);
        else setState("missing");
      });
  }, [slug]);

  function show(t: string, h: string, hb: boolean) {
    setTitle(t);
    setHtml(h);
    setHideBadge(hb);
    document.title = `${t} — Dreamstack`;
    setState("ok");
  }

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!slug || !password) return;
    setChecking(true);
    setPwError(null);
    const res = await fetchProtectedApp(slug, password);
    setChecking(false);
    if (res.status === "ok") show(res.title!, res.html!, !!res.hide_badge);
    else if (res.status === "wrong") setPwError("That password isn't right — try again.");
    else setState("missing");
  }

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/40 text-sm">
        Opening app…
      </div>
    );
  }

  if (state === "locked") {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-6">
        <div className="aurora" />
        <div className="relative w-full max-w-sm glass rounded-2xl p-7 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-lg font-semibold mb-1">This app is protected</h1>
          <p className="text-sm text-white/50 mb-5">
            Enter the password its creator gave you.
          </p>
          <form onSubmit={unlock} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl bg-black/30 border border-line px-4 py-3 text-sm outline-none focus:border-white/30"
            />
            <button
              disabled={checking || !password}
              className="grad-btn w-full rounded-xl py-3 text-sm"
            >
              {checking ? "Checking…" : "Open app"}
            </button>
          </form>
          {pwError && <p className="mt-3 text-sm text-rose-300">{pwError}</p>}
        </div>
      </div>
    );
  }

  if (state === "missing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">✦</div>
        <h1 className="text-xl font-semibold">This app isn't available</h1>
        <p className="text-sm text-white/50 max-w-sm">
          It may have been deleted or set to private by its creator.
        </p>
        <Link to="/" className="grad-btn rounded-full px-6 py-3 text-sm mt-2">
          Build your own with Dreamstack
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen relative">
      <iframe
        title={title}
        srcDoc={html ?? ""}
        sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads allow-pointer-lock"
        className="w-full h-full"
      />
      {!hideBadge && (
        <Link
          to="/"
          className="fixed bottom-4 right-4 glass rounded-full px-4 py-2 text-xs text-white/80 hover:text-white flex items-center gap-2 shadow-lg"
        >
          <span className="grad-text font-semibold">✦</span> Built with
          Dreamstack — make yours
        </Link>
      )}
    </div>
  );
}
