import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { track } from "../lib/analytics";
import { supabase } from "../lib/supabase";
import type { DsApp, DsReview } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { Footer, Nav } from "../App";
import { DEMO_APPS } from "../lib/demoApps";
import { PLANS, PLAN_LIMITS } from "../lib/plans";
import { startCheckout } from "../lib/api";

const STEPS = [
  {
    n: "01",
    title: "Describe it",
    body: "Type your idea in plain words — “a workout tracker with streaks”, “a quiz game about space”, “an invoice maker for my side hustle”.",
  },
  {
    n: "02",
    title: "Watch it build",
    body: "Dreamstack's AI writes a real, working app in front of you — design, logic, everything. Most builds take under two minutes.",
  },
  {
    n: "03",
    title: "Share it",
    body: "Every app gets its own link you can send to anyone. Keep tweaking it with follow-up requests until it's exactly right.",
  },
];

const FAQS = [
  {
    q: "Do I need to know how to code?",
    a: "No. You describe what you want in normal language and Dreamstack writes all the code. If you want changes, you just ask for them the same way.",
  },
  {
    q: "What kind of apps can it build?",
    a: "Tools, games, calculators, trackers, timers, quizzes, landing pages, dashboards with saved data on your device — anything that fits in a single interactive page. It's perfect for personal tools and shareable mini-apps.",
  },
  {
    q: "Who owns what I make?",
    a: "You do. Every app can be downloaded as a single file that runs anywhere, forever — no lock-in.",
  },
  {
    q: "What happens when I run out of credits?",
    a: "Your apps keep working and stay shareable forever. To keep building, buy a one-time credit pack (those credits never expire) or upgrade to a plan with fresh credits every month. The 5 free welcome credits are a one-time gift.",
  },
];

export default function Landing({ session }: { session: Session | null }) {
  const nav = useNavigate();
  const [idea, setIdea] = useState("");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [payMsg, setPayMsg] = useState<string | null>(null);
  const [realApps, setRealApps] = useState<DsApp[] | null>(null);
  const [reviews, setReviews] = useState<DsReview[]>([]);

  useEffect(() => {
    track("view_home");
    supabase
      .from("ds_apps")
      .select("*")
      .eq("is_public", true)
      .eq("in_gallery", true)
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setRealApps((data as DsApp[]) ?? []));
    supabase
      .from("ds_reviews")
      .select("*")
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setReviews((data as DsReview[]) ?? []));
  }, []);

  function build() {
    if (idea.trim()) localStorage.setItem("ds_pending_prompt", idea.trim());
    nav(session ? "/studio" : "/auth?mode=signup");
  }

  async function choosePlan(id: string) {
    if (id === "free" || !session) {
      nav(session ? "/studio" : "/auth?mode=signup");
      return;
    }
    setBusyPlan(id);
    setPayMsg(null);
    try {
      await startCheckout({ plan: id as "pro" | "studio" });
    } catch (e: any) {
      setPayMsg(e.message);
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Nav session={session} />

      {/* Hero */}
      <section className="relative pt-36 pb-20 px-6">
        <div className="aurora" />
        <div className="dotgrid absolute inset-0" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-white/50 mb-5">
            The AI app builder for everyone
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold leading-[1.05] tracking-tight">
            Describe it.
            <br />
            <span className="grad-text">Watch it become an app.</span>
          </h1>
          <p className="mt-6 text-lg text-white/60 max-w-xl mx-auto">
            Dreamstack turns a sentence into working software. No code, no
            setup — just your idea, built in front of you and ready to share.
          </p>

          <div className="mt-10 glass rounded-2xl p-2 flex flex-col sm:flex-row gap-2 text-left">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  build();
                }
              }}
              rows={2}
              placeholder="A habit tracker with streaks and confetti when I hit 7 days…"
              className="flex-1 resize-none bg-transparent px-4 py-3 outline-none placeholder:text-white/30 text-[15px]"
            />
            <button
              onClick={build}
              className="grad-btn rounded-xl px-6 py-3 text-sm whitespace-nowrap"
            >
              ✦ Build my app
            </button>
          </div>
          <p className="mt-3 text-xs text-white/35">
            Free to try — {PLAN_LIMITS.free} welcome builds, no card needed.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight mb-12 text-center">
            From idea to app in{" "}
            <span className="grad-text">three steps</span>
          </h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <div key={s.n} className="glass rounded-2xl p-6">
                <div className="font-mono text-sm grad-text mb-4">{s.n}</div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live examples */}
      <section id="examples" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight mb-3 text-center">
            Real apps, built from <span className="grad-text">one sentence</span>
          </h2>
          <p className="text-center text-white/50 mb-12 text-sm">
            These are live — click around inside them.{" "}
            <Link to="/gallery" className="grad-text font-medium">
              See what people are building →
            </Link>
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            {realApps && realApps.length >= 3
              ? realApps.slice(0, 3).map((a) => (
                  <Link
                    key={a.id}
                    to={`/a/${a.slug}`}
                    className="glass rounded-2xl overflow-hidden block group"
                  >
                    <div className="h-72 overflow-hidden bg-black/40 relative">
                      <iframe
                        title={a.title}
                        srcDoc={a.html}
                        sandbox="allow-scripts"
                        loading="lazy"
                        className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none border-0"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                        Open full screen →
                      </span>
                    </div>
                    <div className="p-4 border-t border-line">
                      <div className="font-medium text-sm mb-1 truncate">
                        {a.title}
                      </div>
                      {a.prompt && (
                        <p className="text-xs text-white/45 font-mono leading-relaxed line-clamp-2">
                          “{a.prompt}”
                        </p>
                      )}
                    </div>
                  </Link>
                ))
              : DEMO_APPS.map((d) => (
                  <div key={d.title} className="glass rounded-2xl overflow-hidden">
                    <iframe
                      title={d.title}
                      srcDoc={d.html}
                      sandbox="allow-scripts allow-forms allow-modals"
                      className="w-full h-72 bg-black/40"
                    />
                    <div className="p-4 border-t border-line">
                      <div className="font-medium text-sm mb-1">{d.title}</div>
                      <p className="text-xs text-white/45 font-mono leading-relaxed">
                        “{d.prompt}”
                      </p>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section id="reviews" className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight mb-3 text-center">
              Loved by the people{" "}
              <span className="grad-text">building on it</span>
            </h2>
            <p className="text-center text-white/50 mb-12 text-sm">
              Real words from real Dreamstack users.
            </p>
            <div className="grid md:grid-cols-3 gap-5">
              {reviews.map((r) => (
                <div key={r.id} className="glass rounded-2xl p-6 flex flex-col">
                  <div
                    className="text-sm mb-3 tracking-wide"
                    aria-label={`${r.rating} out of 5`}
                  >
                    <span className="grad-text">{"★".repeat(r.rating)}</span>
                    <span className="text-white/15">
                      {"★".repeat(5 - r.rating)}
                    </span>
                  </div>
                  <p className="text-sm text-white/75 leading-relaxed flex-1">
                    “{r.body}”
                  </p>
                  <div className="mt-4 pt-4 border-t border-line">
                    <div className="text-sm font-medium">{r.author_name}</div>
                    {r.role_line && (
                      <div className="text-xs text-white/40">{r.role_line}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-white/35 mt-8">
              Built something with Dreamstack?{" "}
              <Link
                to={session ? "/account" : "/auth?mode=signup"}
                className="grad-text font-medium"
              >
                Share your experience →
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight mb-3 text-center">
            Simple plans, <span className="grad-text">serious building</span>
          </h2>
          <p className="text-center text-white/50 mb-12 text-sm">
            Start free. Upgrade when the ideas won't stop.
          </p>
          {payMsg && (
            <p className="text-center text-amber-300/90 text-sm mb-6">{payMsg}</p>
          )}
          <div className="grid md:grid-cols-3 gap-5 items-stretch">
            {PLANS.map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl p-6 flex flex-col ${
                  p.highlight
                    ? "bg-white/[0.07] border border-white/25 shadow-[0_0_60px_rgba(167,139,250,0.15)]"
                    : "glass"
                }`}
              >
                {p.highlight && (
                  <span className="self-start text-[10px] tracking-widest uppercase grad-text font-semibold mb-2">
                    Most popular
                  </span>
                )}
                <h3 className="font-semibold text-lg">{p.name}</h3>
                <div className="mt-2 mb-1">
                  <span className="text-4xl font-bold">{p.price}</span>
                  <span className="text-white/40 text-sm ml-1">{p.priceNote}</span>
                </div>
                <p className="text-sm text-white/55 mb-5">{p.blurb}</p>
                <ul className="space-y-2 text-sm text-white/70 mb-8">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="grad-text">✦</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => choosePlan(p.id)}
                  disabled={busyPlan === p.id}
                  className={`mt-auto rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                    p.highlight
                      ? "grad-btn"
                      : "bg-white/10 hover:bg-white/15 text-white"
                  }`}
                >
                  {busyPlan === p.id ? "One moment…" : p.cta}
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-white/35 mt-6">
            Each build or follow-up edit uses one credit. Paid plan credits
            refresh monthly; free welcome credits are one-time. Run low? Top up
            with a credit pack any time — purchased credits never expire.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight mb-10 text-center">
            Questions, <span className="grad-text">answered</span>
          </h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="glass rounded-xl px-5 py-4 group">
                <summary className="cursor-pointer text-sm font-medium list-none flex justify-between items-center">
                  {f.q}
                  <span className="text-white/40 group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-white/55 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="px-6 pt-8 pb-4">
        <div className="relative mx-auto max-w-6xl rounded-3xl overflow-hidden glass p-12 text-center">
          <div className="aurora" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Your next favorite app is{" "}
              <span className="grad-text">one sentence away.</span>
            </h2>
            <button
              onClick={() => nav(session ? "/studio" : "/auth?mode=signup")}
              className="grad-btn rounded-full px-8 py-4 text-sm mt-8"
            >
              ✦ Start building free
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
