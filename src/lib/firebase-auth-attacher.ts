import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/lib/firebase-client";

export const attachFirebaseAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await supabase.auth.getSession();
  return next({ headers: data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {} });
});
