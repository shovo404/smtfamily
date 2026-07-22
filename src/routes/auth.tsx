import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import smtLogo from "@/assets/smt-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — SMT Family" },
      { name: "description", content: "Sign in to the SMT Family SFA platform." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: appLogo } = useQuery({
    queryKey: ["app-logo"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "app_logo").maybeSingle();
      const v = (data?.value ?? {}) as { url?: string };
      return v.url || null;
    },
  });

  const logoUrl = appLogo || smtLogo.url;

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") navigate({ to: "/dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-10">
      <div className="flex-1 grid place-items-center">
        <div className="w-full max-w-md premium-card p-8">
          <div className="text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-white p-2 shadow-lg">
              <img src={logoUrl} alt="SMT Family" className="h-full w-full object-contain" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">SMT Family</h1>
            <p className="text-xs text-primary/90" lang="bn">একতাবদ্ধ পরিবার, সেরা মানের সেরা উপহার</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="text-xs font-medium">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium">Password</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button disabled={loading} type="submit"
              className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            App Developed By SHOVO
          </p>

        </div>
      </div>
      <footer className="pt-6 text-center text-xs text-muted-foreground">
        © SMT Family
      </footer>

    </div>
  );
}
