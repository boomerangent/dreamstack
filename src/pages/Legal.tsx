import type { Session } from "@supabase/supabase-js";
import { Footer, Nav } from "../App";

export default function Legal({
  kind,
  session,
}: {
  kind: "terms" | "privacy";
  session: Session | null;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav session={session} />
      <main className="flex-1 mx-auto w-full max-w-2xl px-6 pt-32 pb-16 text-sm leading-relaxed text-white/70">
        {kind === "terms" ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-6">
              Terms of Service
            </h1>
            <p className="mb-4">
              Dreamstack lets you generate small web applications from text
              descriptions using AI. By using Dreamstack you agree to these
              terms.
            </p>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li>
                You own the apps you generate. You may download, modify, and use
                them for any lawful purpose.
              </li>
              <li>
                Don't use Dreamstack to create content that is illegal, harmful,
                or infringes on the rights of others. Generated apps you share
                publicly must follow the same rule.
              </li>
              <li>
                AI-generated software is provided as-is, without warranty. Review
                anything important before relying on it.
              </li>
              <li>
                Paid plans renew monthly and can be cancelled any time from your
                account page; you keep access until the end of the billing
                period. Paid plan credits reset each month and don't roll over;
                the free plan's welcome credits are a one-time trial.
              </li>
              <li>
                Credit packs are one-time purchases. Purchased credits don't
                expire, are used after your monthly plan credits, and are
                non-refundable once spent.
              </li>
              <li>
                We may remove shared apps that violate these terms and suspend
                accounts that abuse the service.
              </li>
            </ul>
            <p>Questions? Contact the site owner.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-6">
              Privacy Policy
            </h1>
            <p className="mb-4">We keep data collection to the minimum:</p>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li>
                <strong>Account:</strong> your email address and a securely
                hashed password, used only for signing in.
              </li>
              <li>
                <strong>Your apps:</strong> the prompts you write and the apps
                generated from them are stored so you can access and share them.
                Prompts are also sent to our AI provider (Anthropic) to generate
                your app.
              </li>
              <li>
                <strong>Payments:</strong> handled entirely by Stripe — we never
                see or store your card details.
              </li>
              <li>
                <strong>No ad tracking:</strong> we don't sell your data or run
                third-party advertising trackers.
              </li>
            </ul>
            <p>
              You can delete your apps at any time from the Studio. To delete
              your account entirely, contact the site owner.
            </p>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
