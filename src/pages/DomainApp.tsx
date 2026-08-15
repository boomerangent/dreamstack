import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/** Renders when the site is loaded on a customer's custom domain. */
export default function DomainApp({ host }: { host: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [hideBadge, setHideBadge] = useState(false);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    supabase
      .from("ds_apps")
      .select("title, html, hide_badge")
      .eq("custom_domain", host.toLowerCase())
      .eq("is_public", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHtml(data.html);
          setTitle(data.title);
          setHideBadge(!!data.hide_badge);
          document.title = data.title;
          setState("ok");
        } else {
          setState("missing");
        }
      });
  }, [host]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/40 text-sm">
        Loading…
      </div>
    );
  }

  if (state === "missing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-5xl">✦</div>
        <h1 className="text-xl font-semibold">This domain isn't connected yet</h1>
        <p className="text-sm text-white/50 max-w-sm">
          If you just set it up, DNS changes can take a little while to spread.
        </p>
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
        <a
          href="https://dreamstack-ai.netlify.app"
          className="fixed bottom-4 right-4 glass rounded-full px-4 py-2 text-xs text-white/80 hover:text-white flex items-center gap-2 shadow-lg"
        >
          <span className="grad-text font-semibold">✦</span> Built with
          Dreamstack
        </a>
      )}
    </div>
  );
}
