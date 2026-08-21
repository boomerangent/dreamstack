import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Studio from "./pages/Studio";
import Account from "./pages/Account";
import Viewer from "./pages/Viewer";
import Legal from "./pages/Legal";
import DomainApp from "./pages/DomainApp";
import Gallery from "./pages/Gallery";
import Admin from "./pages/Admin";
import { isPlatformHost } from "./lib/config";

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6ee7ff" />
            <stop offset=".5" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#fb7185" />
          </linearGradient>
        </defs>
        <path
          fill="url(#lg)"
          d="M50 4 L60 40 L96 50 L60 60 L50 96 L40 60 L4 50 L40 40 Z"
        />
      </svg>
      Dreamstack
    </span>
  );
}

export function Nav({ session }: { session: Session | null }) {
  return (
    <header className="fixed top-0 inset-x-0 z-40">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 py-3 mt-3 rounded-2xl glass flex items-center justify-between">
        <Link to="/" className="text-[17px]">
          <Logo />
        </Link>
        <div className="hidden sm:flex items-center gap-6 text-sm text-white/70">
          <a href="/#how" className="hover:text-white transition-colors">
            How it works
          </a>
          <Link to="/gallery" className="hover:text-white transition-colors">
            Gallery
          </Link>
          <a href="/#pricing" className="hover:text-white transition-colors">
            Pricing
          </a>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link
                to="/account"
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Account
              </Link>
              <Link
                to="/studio"
                className="grad-btn rounded-full px-4 py-2 text-sm"
              >
                Open Studio
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/auth?mode=signup"
                className="grad-btn rounded-full px-4 py-2 text-sm"
              >
                Start building
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line mt-24">
      <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col sm:flex-row gap-4 items-center justify-between text-sm text-white/40">
        <Logo size={16} />
        <div className="flex gap-6">
          <Link to="/gallery" className="hover:text-white/70">
            Gallery
          </Link>
          <Link to="/terms" className="hover:text-white/70">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-white/70">
            Privacy
          </Link>
          <a href="/#pricing" className="hover:text-white/70">
            Pricing
          </a>
        </div>
        <span>© {new Date().getFullYear()} Dreamstack</span>
      </div>
    </footer>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0);
  }, [location.pathname]);

  // Customer custom domains: any host that isn't ours renders that domain's
  // app full-screen instead of the Dreamstack site.
  const host = window.location.hostname;
  if (!isPlatformHost(host)) return <DomainApp host={host} />;

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/40 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Landing session={session} />} />
      <Route path="/auth" element={<Auth session={session} />} />
      <Route path="/studio" element={<Studio session={session} />} />
      <Route path="/account" element={<Account session={session} />} />
      <Route path="/gallery" element={<Gallery session={session} />} />
      <Route path="/admin" element={<Admin session={session} />} />
      <Route path="/a/:slug" element={<Viewer />} />
      <Route path="/terms" element={<Legal kind="terms" session={session} />} />
      <Route
        path="/privacy"
        element={<Legal kind="privacy" session={session} />}
      />
      <Route path="*" element={<Landing session={session} />} />
    </Routes>
  );
}
