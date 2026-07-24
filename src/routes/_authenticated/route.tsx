import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { firebase } from "@/lib/firebase-client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await firebase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: profile } = await firebase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    const role = profile?.role ?? "fso";
    return { user: data.user, role };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
