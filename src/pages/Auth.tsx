import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { track } from "../lib/analytics";
import { PLAN_LIMITS } from "../lib/plans";
import { GOOGLE_SIGNIN_ENABLED } from "../lib/config";
import { Logo } from "../App";

export default function Auth({ session }: { session: Session | null }) {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(
    params.get("mode") === "signup" ? "signup" : "signin"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pendingIdea = localStorage.getItem("ds_pending_prompt");

  useEffect(() => {
    if (session) nav("/studio", { replace: true });
  }, [session, nav]);

  async function signInWithGoogle() {
    setGoogleBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/studio` },
    });
    if (error) {
      setGoogleBusy(false);
      setError(
        /not enabled|unsupported/i.test(error.message)
          ? "Google sign-in isn't switched on yet — the site owner needs to connect it."
          : error.message
      );
    }
    // On success the browser is redirected to Google, so nothing else to do.
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/studio` },
        });
        if (error) throw error;
        track("signup");
        if (data.session) {
          nav("/studio");
        } else {
          setNotice(
            "Almost there — check your email for a confirmation link, then come back and sign in."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        nav("/studio");
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6">
      <div className="aurora" />
      <div className="relative w-full max-w-sm">
        <Link to="/" className="block text-center text-xl mb-8">
          <Logo />
        </Link>
        <div className="glass rounded-2xl p-7">
          <h1 className="text-xl font-semibold mb-1">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-white/50 mb-6">
            {mode === "signup"
              ? `Free to start — ${PLAN_LIMITS.free} welcome builds on us.`
              : "Sign in to keep building."}
          </p>

          {pendingIdea && (
            <div className="mb-5 rounded-xl bg-white/[0.06] border border-line px-4 py-3 text-xs text-white/60">
              ✦ Your idea is saved:{" "}
              <span className="text-white/85">“{pendingIdea.slice(0, 80)}
              {pendingIdea.length > 80 ? "…" : ""}”</span>
              <br />
              {mode === "signup" ? "Create an account" : "Sign in"} and we'll
              build it right away.
            </div>
          )}

          {GOOGLE_SIGNIN_ENABLED && (
          <button
            onClick={signInWithGoogle}
            disabled={googleBusy}
            className="w-full rounded-xl bg-white text-[#1f1f1f] font-medium py-3 text-sm flex items-center justify-center gap-2.5 hover:bg-white/90 transition-colors disabled:opacity-60"
          >
            <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
              <path
                fill="#4285F4"
                d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.1z"
              />
              <path
                fill="#34A853"
                d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.5 46 24 46z"
              />
              <path
                fill="#FBBC05"
                d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2v-5.7H4.5C2.9 17.2 2 20.5 2 24s.9 6.8 2.5 9.9l7.3-5.7z"
              />
              <path
                fill="#EA4335"
                d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.5 2 8.1 6.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"
              />
            </svg>
            {googleBusy ? "Opening Google…" : "Continue with Google"}
          </button>
          )}

          {GOOGLE_SIGNIN_ENABLED && (
            <div className="flex items-center gap-3 my-5">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] text-white/35 uppercase tracking-widest">
                or with email
              </span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl bg-black/30 border border-line px-4 py-3 text-sm outline-none focus:border-white/30"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (6+ characters)"
              className="w-full rounded-xl bg-black/30 border border-line px-4 py-3 text-sm outline-none focus:border-white/30"
            />
            <button
              disabled={busy}
              className="grad-btn w-full rounded-xl py-3 text-sm"
            >
              {busy
                ? "One moment…"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
          {notice && <p className="mt-4 text-sm text-emerald-300">{notice}</p>}

          <p className="mt-6 text-sm text-white/50 text-center">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="grad-text font-medium"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                New here?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="grad-text font-medium"
                >
                  Create an account
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
