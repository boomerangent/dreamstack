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
