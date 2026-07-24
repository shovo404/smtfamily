import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { firebase } from "@/lib/firebase-client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Shield, RotateCcw, User, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/audit-log")({
  head: () => ({ meta: [{ title: "Audit Log — SMT Family" }] }),
  component: AuditLogPage,
});

function AuditLogPage() {
  const { data: me, isLoading } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!me || !me.isSuperAdmin) navigate({ to: "/dashboard", replace: true });
  }, [me, isLoading, navigate]);

  const { data: logs } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await firebase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!me?.isSuperAdmin,
  });

  if (isLoading || !me || !me.isSuperAdmin) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-destructive/20 text-destructive">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Attendance reset history — Super Admin only.</p>
        </div>
      </div>

      <div className="space-y-2">
        {(logs ?? []).length === 0 && (
          <div className="premium-card p-10 text-center text-sm text-muted-foreground">No audit log entries yet.</div>
        )}
        {(logs ?? []).map((log: any) => (
          <div key={log.id} className="premium-card p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-destructive/20 text-destructive">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{log.actor_name}</span>
                  <span className="text-muted-foreground">reset</span>
                  <span className="font-medium">{log.target_name || "Unknown"}</span>
                  {log.target_employee_id && (
                    <span className="text-xs text-muted-foreground">({log.target_employee_id})</span>
                  )}
                </div>
                {log.details && (
                  <div className="mt-1 text-xs text-muted-foreground">{log.details}</div>
                )}
                <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
