import { createClient } from "@supabase/supabase-js";

// These values are public by design (Supabase's row-level security is what
// protects the data). Hardcoded fallbacks keep the site working even when a
// build runs without the VITE_ env vars present.
export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://nwxgaceptjuapqiwvtfp.supabase.co";
export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53eGdhY2VwdGp1YXBxaXd2dGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2Nzg5NTEsImV4cCI6MjA5ODI1NDk1MX0.lEEhoYxoqIRMZXABCt1WuvgAuT0OBHzfpuuHi67dpQA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export interface DsApp {
  id: string;
  owner: string;
  title: string;
  prompt: string | null;
  html: string;
  slug: string;
  is_public: boolean;
  hide_badge: boolean;
  share_password_hash: string | null;
  custom_domain: string | null;
  in_gallery: boolean;
  remix_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface DsAppVersion {
  id: string;
  app_id: string;
  prompt: string | null;
  html: string;
  created_at: string;
}

export interface DsProfile {
  user_id: string;
  email: string | null;
  plan: "free" | "pro" | "studio";
  gens_used: number;
  bonus_credits: number;
  adsense_id: string | null;
  period_start: string;
}
