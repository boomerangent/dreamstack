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
        <path fill="url(#lg)" opacity="0.38" d="M50 53 L83 66 L50 79 L17 66 Z" />
        <path fill="url(#lg)" opacity="0.66" d="M50 37 L83 50 L50 63 L17 50 Z" />
        <path fill="url(#lg)" d="M50 21 L83 34 L50 47 L17 34 Z" />
      </svg>
      Dreamstack
    </span>
  );
}

export function Nav({ session }: { session: Session | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);
  return (
    <header className="fixed top-0 inset-x-0 z-40">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 py-3 mt-3 rounded-2xl glass flex items-center justify-between">
        <Link to="/" className="text-[17px]" onClick={close}>
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
        <div className="flex items-center gap-2 sm:gap-3">
          {session ? (
            <>
              <Link
                to="/account"
                className="hidden sm:inline text-sm text-white/70 hover:text-white transition-colors"
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
                className="hidden sm:inline text-sm text-white/70 hover:text-white transition-colors"
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
          {/* Mobile menu button */}
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="sm:hidden text-white/80 hover:text-white p-1"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              {menuOpen ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="sm:hidden mx-auto max-w-6xl px-4 mt-2">
          <div className="glass rounded-2xl p-2 flex flex-col text-sm text-white/85">
            <a
              href="/#how"
              onClick={close}
              className="px-4 py-3 rounded-xl hover:bg-white/5"
            >
              How it works
            </a>
            <Link
              to="/gallery"
              onClick={close}
              className="px-4 py-3 rounded-xl hover:bg-white/5"
            >
              Gallery
            </Link>
            <a
              href="/#pricing"
              onClick={close}
              className="px-4 py-3 rounded-xl hover:bg-white/5"
            >
              Pricing
            </a>
            {session ? (
              <Link
                to="/account"
                onClick={close}
                className="px-4 py-3 rounded-xl hover:bg-white/5"
              >
                Account
              </Link>
            ) : (
              <Link
                to="/auth"
                onClick={close}
                className="px-4 py-3 rounded-xl hover:bg-white/5"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
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
