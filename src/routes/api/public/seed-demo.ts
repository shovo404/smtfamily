import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/seed-demo")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const users = [
          { email: "admin@smt.family", password: "Admin@1234", full_name: "Demo Admin", role: "admin" as const },
          { email: "sr@smt.family", password: "Sr@1234", full_name: "Demo SR", role: "sr" as const },
        ];
        const results: any[] = [];
        for (const u of users) {
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
            user_metadata: { full_name: u.full_name },
          });
          if (error) {
            results.push({ email: u.email, error: error.message });
            continue;
          }
          if (data.user) {
            await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user.id);
            await supabaseAdmin.from("user_roles").insert({ user_id: data.user.id, role: u.role });
          }
          results.push({ email: u.email, ok: true });
        }
        return new Response(JSON.stringify({ results }, null, 2), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
