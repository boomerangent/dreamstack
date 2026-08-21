/**
 * Flip to true only AFTER Google is switched on in Supabase
 * (Authentication → Providers → Google, with a Client ID and Secret from
 * Google Cloud Console).
 *
 * Why this flag exists: `signInWithOAuth` sends the browser straight to
 * Supabase's /authorize endpoint. If the provider isn't configured, the
 * visitor lands on a raw "400: provider is not enabled" page — the redirect
 * happens before any error handler in our code can run, so we can't catch it
 * and show something friendly. Hiding the button is the only reliable way to
 * stop people hitting that dead end.
 */
export const GOOGLE_SIGNIN_ENABLED = true;

/**
 * Public address of the Dreamstack site itself, without a trailing slash.
 * When the site moves to a new domain, run `npm run site-url https://new-domain`
 * — it updates this (via VITE_SITE_URL in .env) plus index.html, robots.txt
 * and sitemap.xml in one go. Then rebuild and redeploy.
 */
export const SITE_URL =
  ((import.meta.env.VITE_SITE_URL as string | undefined) ?? "")
    .trim()
    .replace(/[/]+$/, "") || "https://dreamstack-ai.netlify.app";

export const SITE_HOST = new URL(SITE_URL).hostname;

/**
 * Hosts that should show the Dreamstack site itself. Any other host is
 * treated as a customer's custom domain and renders that domain's app.
 * Hosting providers' temporary/preview addresses are included so the site
 * keeps working while a real domain is being connected.
 */
export function isPlatformHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === SITE_HOST ||
    h === `www.${SITE_HOST}` ||
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".netlify.app") ||
    h.endsWith(".hostingersite.com")
  );
}
