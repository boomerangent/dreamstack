import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { DsApp } from "../lib/supabase";
import { Footer, Nav } from "../App";
import { track } from "../lib/analytics";

export async function remixApp(app: Pick<DsApp, "id" | "title" | "prompt" | "html">, ownerId: string) {
  const { data } = await supabase
    .from("ds_apps")
    .insert({
      owner: ownerId,
      title: `${app.title} (remix)`,
      prompt: app.prompt,
      html: app.html,
      slug: crypto.randomUUID().replace(/-/g, "").slice(0, 10),
      is_public: true,
      in_gallery: false,
    })
    .select()
    .single();
  await supabase.rpc("ds_increment_remix", { p_app_id: app.id });
  return data as DsApp | null;
}

export default function Gallery({ session }: { session: Session | null }) {
  const nav = useNavigate();
  const [apps, setApps] = useState<DsApp[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    track("view_gallery");
    supabase
      .from("ds_apps")
      .select("*")
      .eq("is_public", true)
      .eq("in_gallery", true)
      .order("created_at", { ascending: false })
      .limit(12)
      .then(({ data }) => setApps((data as DsApp[]) ?? []));
  }, []);

  async function remix(app: DsApp) {
    if (!session) {
      localStorage.setItem("ds_remix_slug", app.slug);
      nav("/auth?mode=signup");
      return;
    }
    setBusy(app.id);
    const copy = await remixApp(app, session.user.id);
    setBusy(null);
    if (copy) nav("/studio");
  }

  return (
    <div className="relative min-h-screen">
      <Nav session={session} />

      <section className="relative px-6 pt-36 pb-12">
        <div className="aurora" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-white/50 mb-4">
            Made with Dreamstack
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            Real apps from <span className="grad-text">real sentences</span>
          </h1>
          <p className="mt-5 text-white/60">
            Every app here started as one line of plain English. Click into any
            of them — then hit <strong className="text-white/85">Remix</strong>{" "}
            to make your own copy and change anything you like.
          </p>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto max-w-6xl">
          {apps === null ? (
            <div className="grid md:grid-cols-3 gap-5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="glass rounded-2xl h-80 shimmer" />
              ))}
            </div>
          ) : apps.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">✦</div>
              <h2 className="text-xl font-semibold mb-2">
                The gallery is waiting for its first app
              </h2>
              <p className="text-sm text-white/50 mb-6">
                Build something and it could be the one everybody remixes.
              </p>
              <Link
                to={session ? "/studio" : "/auth?mode=signup"}
                className="grad-btn rounded-full px-7 py-3 text-sm"
              >
                ✦ Build the first one
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-5">
              {apps.map((a) => (
                <div
                  key={a.id}
                  className="glass rounded-2xl overflow-hidden flex flex-col"
                >
                  <Link to={`/a/${a.slug}`} className="block relative group">
                    {/* Rendered at desktop width then scaled down, so the
                        thumbnail shows the whole app instead of a corner. */}
                    <div className="h-64 overflow-hidden bg-black/40">
                      <iframe
                        title={a.title}
                        srcDoc={a.html}
                        sandbox="allow-scripts"
                        loading="lazy"
                        className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none border-0"
                      />
                    </div>
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                      Open full screen →
                    </span>
                  </Link>
                  <div className="p-4 border-t border-line flex flex-col gap-3 flex-1">
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-1 truncate">
                        {a.title}
                      </div>
                      {a.prompt && (
                        <p className="text-xs text-white/45 font-mono leading-relaxed line-clamp-2">
                          “{a.prompt}”
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => remix(a)}
                        disabled={busy === a.id}
                        className="grad-btn rounded-xl px-4 py-2 text-xs flex-1"
                      >
                        {busy === a.id ? "Copying…" : "✦ Remix this"}
                      </button>
                      {a.remix_count > 0 && (
                        <span className="text-[11px] text-white/40 whitespace-nowrap">
                          {a.remix_count} remix{a.remix_count === 1 ? "" : "es"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-14">
            <h2 className="text-2xl font-bold tracking-tight mb-3">
              Your turn. <span className="grad-text">What should we build?</span>
            </h2>
            <Link
              to={session ? "/studio" : "/auth?mode=signup"}
              className="grad-btn rounded-full px-8 py-3.5 text-sm inline-block mt-3"
            >
              ✦ Start building free
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
