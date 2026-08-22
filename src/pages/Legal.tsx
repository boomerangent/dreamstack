import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Footer, Nav } from "../App";

const UPDATED = "22 August 2026";
const CONTACT = "boomerangrecords26@gmail.com";
const OPERATOR = "Boomerang Entertainment Group LLC";

function H({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-white mt-8 mb-3">{children}</h2>
  );
}

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
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              Terms of Service
            </h1>
            <p className="text-xs text-white/40 mb-6">Last updated {UPDATED}</p>
            <p className="mb-4">
              Dreamstack (“the Service”) is operated by {OPERATOR} (“we”, “us”).
              Dreamstack lets you generate small, single-file web applications
              from text descriptions using AI. By creating an account or using
              the Service, you agree to these terms.
            </p>

            <H>Who can use it</H>
            <p>
              You must be at least 13 years old (or the minimum age of digital
              consent in your country) to use Dreamstack. You're responsible for
              keeping your login secure and for everything done under your
              account.
            </p>

            <H>What you make</H>
            <p>
              You own the apps you generate. You may download, modify, and use
              them for any lawful purpose. You're responsible for the prompts you
              write and the apps you create and share.
            </p>

            <H>Acceptable use</H>
            <p>
              Don't use Dreamstack to create or share content that is illegal,
              harmful, deceptive, hateful, or infringes anyone's rights, and
              don't attempt to break, overload, or abuse the Service. We may
              remove shared apps and suspend or close accounts that violate these
              terms.
            </p>

            <H>Credits, plans &amp; payment</H>
            <p>
              One build or follow-up edit uses one credit. Paid plans renew
              monthly and can be cancelled any time from your account page; you
              keep access until the end of the billing period, and paid plan
              credits reset each month and don't roll over. The free plan's
              welcome credits are a one-time trial. Credit packs are one-time
              purchases; purchased credits don't expire, are used after your
              monthly plan credits, and are non-refundable once spent. Payments
              are processed by Stripe.
            </p>

            <H>No warranty</H>
            <p>
              AI-generated software is provided “as is”, without warranties of
              any kind. It may contain errors — review anything important before
              relying on it. To the fullest extent permitted by law, we are not
              liable for any indirect or consequential loss arising from your use
              of the Service or the apps you generate.
            </p>

            <H>Changes</H>
            <p>
              We may update these terms as the Service evolves. Continued use
              after a change means you accept the updated terms.
            </p>

            <H>Contact</H>
            <p>
              Questions about these terms? Email{" "}
              <a href={`mailto:${CONTACT}`} className="grad-text">
                {CONTACT}
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              Privacy Policy
            </h1>
            <p className="text-xs text-white/40 mb-6">Last updated {UPDATED}</p>
            <p className="mb-4">
              This policy explains what {OPERATOR} collects when you use
              Dreamstack, and why. We keep data collection to the minimum needed
              to run the Service.
            </p>

            <H>What we collect</H>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-white/85">Account:</strong> your email
                address and a securely hashed password, used only to sign you in.
              </li>
              <li>
                <strong className="text-white/85">Your apps:</strong> the prompts
                you write and the apps generated from them are stored so you can
                access and share them.
              </li>
              <li>
                <strong className="text-white/85">Anonymous usage:</strong> we
                count page views and builds (no cookies, no personal data) to
                understand how the site is used.
              </li>
              <li>
                <strong className="text-white/85">Payments:</strong> handled
                entirely by Stripe — we never see or store your card details.
              </li>
            </ul>

            <H>Who we share it with</H>
            <p>
              We don't sell your data or run advertising trackers. We use a small
              number of trusted providers to run the Service: your prompts are
              sent to <strong className="text-white/85">Anthropic</strong> to
              generate your app; accounts and app data are stored with{" "}
              <strong className="text-white/85">Supabase</strong>; payments are
              handled by <strong className="text-white/85">Stripe</strong>; and
              the site is hosted on{" "}
              <strong className="text-white/85">Hostinger</strong>. Each only
              receives what's needed to do its job.
            </p>

            <H>Keeping &amp; deleting your data</H>
            <p>
              We keep your account and apps until you delete them. You can delete
              any app from the Studio at any time. To delete your account and
              everything in it, email{" "}
              <a href={`mailto:${CONTACT}`} className="grad-text">
                {CONTACT}
              </a>{" "}
              and we'll remove it.
            </p>

            <H>Children</H>
            <p>
              Dreamstack isn't intended for children under 13, and we don't
              knowingly collect their information.
            </p>

            <H>Changes &amp; contact</H>
            <p>
              We may update this policy as the Service changes. For any privacy
              question, email{" "}
              <a href={`mailto:${CONTACT}`} className="grad-text">
                {CONTACT}
              </a>
              .
            </p>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
