import { createClient } from "@supabase/supabase-js";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const requireFirebaseAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const token = getRequest()?.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Unauthorized: sign in is required");
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase server configuration is incomplete");
  const client = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Unauthorized: invalid session");
  const { data: profile, error: profileError } = await client.from("users").select("role").eq("id", authData.user.id).single();
  if (profileError || !profile) throw new Error("Unauthorized: profile not found");
  return next({ context: { userId: authData.user.id, role: profile.role } });
});
