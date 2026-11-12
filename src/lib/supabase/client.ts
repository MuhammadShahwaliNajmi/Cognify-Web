import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client for the portal. The site is a static export with no
 * server, so all auth runs in the browser; access is enforced by Row Level
 * Security in the database, never by this file.
 *
 * Both values are public by design (the publishable key only grants what the
 * RLS policies allow). Returns null until they're configured, so the portal
 * can keep running in demo mode.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;

export const supabaseConfigured = Boolean(url && key);

export function getSupabase(): SupabaseClient | null {
  if (!url || !key) return null;
  client ??= createBrowserClient(url, key);
  return client;
}
