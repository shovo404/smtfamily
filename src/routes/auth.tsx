import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { firebase } from "@/lib/firebase-client";
import { BrandHeader } from "@/components/brand-header";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await firebase.auth.getSession();
    if (data.session) {
      const { data: userData } = await firebase.auth.getUser();
      if (userData?.user) {
        const { data: profile } = await firebase
          .from("users")
          .select("role")
          .eq("id", userData.user.id)
          .maybeSingle();
        const role = profile?.role ?? "fso";
        const home = role === "super_admin" || role === "admin" || role === "hr"
          ? "/dashboard" : "/attendance";
        throw redirect({ to: home });
      }
    }
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

  useEffect(() => {
    const { data: sub } = firebase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        const { data: profile } = await firebase
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();
        const role = profile?.role ?? "fso";
        const home = role === "super_admin" || role === "admin" || role === "hr"
          ? "/dashboard" : "/attendance";
        navigate({ to: home });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await firebase.auth.signInWithPassword({ email, password });
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
          <div className="text-center mb-6">
            <BrandHeader size="lg" className="animate-in fade-in duration-500" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
            App Developed By <a href="https://shovo404.github.io/shovoportfolio/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">SHOVO</a>
          </p>

        </div>
      </div>
      <footer className="pt-6 text-center text-xs text-muted-foreground">
        © SMT Family
      </footer>

    </div>
  );
}
