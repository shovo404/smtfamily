import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { firebase } from "@/lib/firebase-client";
import { Users, UserCheck, ClipboardList, CheckCircle2, Clock, MapPin, Wallet, UserX, AlertTriangle, LogIn, User, Bell, Calendar } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SMT Family" }] }),
  component: Dashboard,
});

function Stat({ icon: Icon, label, value, tone = "primary" }: { icon: typeof Users; label: string; value: string | number; tone?: "primary" | "warn" | "danger" | "muted" }) {
  const toneCls = tone === "warn" ? "bg-yellow-500/20 text-yellow-300"
    : tone === "danger" ? "bg-destructive/20 text-destructive"
    : tone === "muted" ? "bg-muted text-muted-foreground"
    : "bg-primary/20 text-primary";
  return (
    <div className="premium-card p-4">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${toneCls}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}

function HRDashboard() {
  const { data: me } = useCurrentUser();

  const { data: stats } = useQuery({
    queryKey: ["hr-dashboard"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [emp, todayAtt] = await Promise.all([
        firebase.from("users").select("id, full_name, email, role, is_active").order("created_at", { ascending: false }).limit(10),
        firebase.from("attendance").select("user_id, check_in").eq("work_date", today),
      ]);
      return {
        total: emp.data?.length ?? 0,
        present: todayAtt.data?.length ?? 0,
        employees: emp.data ?? [],
      };
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome{me?.profile?.full_name ? `, ${me.profile.full_name}` : ""}. Team overview.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Users} label="Total Staff" value={stats?.total ?? "—"} />
        <Stat icon={LogIn} label="Present Today" value={stats?.present ?? "—"} />
      </div>
      <div className="premium-card p-4">
        <h2 className="text-base font-semibold mb-3">Recent Employees</h2>
        <div className="space-y-2">
          {(stats?.employees ?? []).slice(0, 5).map((emp: any) => (
            <div key={emp.id} className="flex items-center gap-3 text-sm">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{emp.full_name || emp.email}</div>
                <div className="text-[11px] text-muted-foreground uppercase">{emp.role}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${emp.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                {emp.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
          {(stats?.employees ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No employees yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { data: me } = useCurrentUser();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const [emp, active, todayAtt, tasksP, tasksD, ta, live, settings] = await Promise.all([
        firebase.from("users").select("id", { count: "exact", head: true }),
        firebase.from("users").select("id", { count: "exact", head: true }).eq("is_active", true),
        firebase.from("attendance").select("check_in").eq("work_date", today),
        firebase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "pending"),
        firebase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "completed"),
        firebase.from("ta_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        firebase.from("employee_locations").select("user_id", { count: "exact", head: true }).gte("recorded_at", fiveMinAgo),
        firebase.from("app_settings").select("value").eq("key", "office_hours").maybeSingle(),
      ]);
      const attRows = todayAtt.data ?? [];
      const presentCount = attRows.length;
      const hoursVal = (settings.data?.value ?? {}) as { start?: string; end?: string };
      const [sh, sm] = (hoursVal.start ?? "09:00").split(":").map(Number);
      const startMin = (sh || 0) * 60 + (sm || 0);
      const lateCount = attRows.filter((r: any) => {
        if (!r.check_in) return false;
        const d = new Date(r.check_in);
        return d.getHours() * 60 + d.getMinutes() > startMin;
      }).length;
      return {
        total: emp.count ?? 0,
        active: active.count ?? 0,
        present: presentCount,
        absent: Math.max(0, (active.count ?? 0) - presentCount),
        late: lateCount,
        tasksPending: tasksP.count ?? 0,
        tasksDone: tasksD.count ?? 0,
        taPending: ta.count ?? 0,
        live: live.count ?? 0,
      };
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome{me?.profile?.full_name ? `, ${me.profile.full_name}` : ""}. Team overview for today.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Users} label="Total" value={stats?.total ?? "—"} />
        <Stat icon={UserCheck} label="Active" value={stats?.active ?? "—"} />
        <Stat icon={LogIn} label="Present" value={stats?.present ?? "—"} />
        <Stat icon={UserX} label="Absent" value={stats?.absent ?? "—"} tone="danger" />
        <Stat icon={AlertTriangle} label="Late" value={stats?.late ?? "—"} tone="warn" />
        <Stat icon={MapPin} label="Live now" value={stats?.live ?? "—"} />
        <Stat icon={ClipboardList} label="Pending tasks" value={stats?.tasksPending ?? "—"} />
        <Stat icon={CheckCircle2} label="Done tasks" value={stats?.tasksDone ?? "—"} />
        <Stat icon={Wallet} label="TA pending" value={stats?.taPending ?? "—"} tone="warn" />
        <Stat icon={Clock} label="On duty" value={stats?.present ?? "—"} tone="muted" />
      </div>

      <div className="premium-card p-4">
        <h2 className="text-base font-semibold">Today at a glance</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          {stats
            ? `${stats.present} of ${stats.active} active employees checked in today${stats.late > 0 ? `, ${stats.late} late` : ""}.`
            : "Loading\u2026"}
        </p>
      </div>
    </div>
  );
}

function Dashboard() {
  const { data: me, isLoading } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !me) return;
    if (me.isField) navigate({ to: "/attendance", replace: true });
  }, [me, isLoading, navigate]);

  if (!me || isLoading) return null;
  if (me.isField) return null;

  if (me.isHR && !me.isAdmin) return <HRDashboard />;
  return <AdminDashboard />;
}
