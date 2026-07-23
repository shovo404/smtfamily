import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is incomplete. Add SUPABASE_SERVICE_ROLE_KEY to Netlify.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
