import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { firebase } from "@/lib/firebase-client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRouteGuard } from "@/hooks/use-route-guard";
import { FileText, Download, Printer, Calendar } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Report — SMT Family" }] }),
  component: ReportsPage,
});

function parseHHMM(s: string) {
  const [h, m] = s.split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}
function lateMinutes(checkIn: string | null, workDate: string, start: string) {
  if (!checkIn) return 0;
  const { h, m } = parseHHMM(start);
  const d = new Date(`${workDate}T00:00:00`);
  d.setHours(h, m, 0, 0);
  const diff = Math.floor((new Date(checkIn).getTime() - d.getTime()) / 60000);
  return diff > 0 ? diff : 0;
}
function fmtTime(iso: string | null) {
  if (!iso) return "---";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
}
function daysInMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function ReportsPage() {
  const { allowed, isLoading } = useRouteGuard("viewReports");
  if (isLoading || !allowed) return null;

  const { data: me } = useCurrentUser();
  const isAdmin = !!me?.isAdmin || !!me?.perms.viewReports;
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [targetUserId, setTargetUserId] = useState<string>(me?.user.id ?? "");
  const [view, setView] = useState<"menu" | "attendance">("menu");

  const { data: hours } = useQuery({
    queryKey: ["office-hours"],
    queryFn: async () => {
      const { data } = await firebase.from("app_settings").select("value").eq("key", "office_hours").maybeSingle();
      const v = (data?.value ?? {}) as { start?: string; end?: string };
      return { start: v.start ?? "09:00", end: v.end ?? "18:00" };
    },
  });
  const officeStart = hours?.start ?? "09:00";

  const { data: employees } = useQuery({
    queryKey: ["report-employees"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await firebase.from("users").select("id, full_name, email").order("full_name");
      return data ?? [];
    },
  });

  const uid = isAdmin ? targetUserId || me!.user.id : me!.user.id;
  const monthStart = `${month}-01`;
  const dim = daysInMonth(month);
  const monthEnd = `${month}-${String(dim).padStart(2, "0")}`;

  const { data: records } = useQuery({
    queryKey: ["report-attendance", uid, month],
    enabled: !!uid && view === "attendance",
    queryFn: async () => {
      const { data: _records, error } = await firebase
        .from("attendance")
        .select("*")
        .eq("user_id", uid)
        .gte("work_date", monthStart)
        .lte("work_date", monthEnd);
      if (error) {
        console.warn("Report attendance query error:", error.message);
        return [];
      }
      const records = (_records as any[]) ?? [];
      return records.sort((a: any, b: any) => (a.work_date || "").localeCompare(b.work_date || ""));
    },
  });

  const targetProfile = useMemo(() => {
    if (!isAdmin) return { full_name: me?.profile?.full_name ?? "", email: me?.user.email ?? "" };
    return employees?.find((e: any) => e.id === uid) ?? { full_name: "", email: "" };
  }, [isAdmin, employees, uid, me]);

  const rows = useMemo(() => {
    const byDate = new Map((records ?? []).map((r: any) => [r.work_date, r]));
    return Array.from({ length: dim }, (_, i) => {
      const day = i + 1;
      const dateStr = `${month}-${String(day).padStart(2, "0")}`;
      const r = byDate.get(dateStr);
      const lm = r?.check_in ? lateMinutes(r.check_in, r.work_date, officeStart) : 0;
      return {
        day,
        dateStr,
        in: fmtTime(r?.check_in ?? null),
        out: fmtTime(r?.check_out ?? null),
        status: r?.check_in ? "PRESENT" : "---",
        late: lm,
      };
    });
  }, [records, dim, month, officeStart]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("SMT Family — Attendance Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Employee: ${targetProfile.full_name || targetProfile.email}`, 14, 23);
    doc.text(`Month: ${monthLabel(month)}`, 14, 29);
    doc.text(`Office hours start: ${officeStart}`, 14, 35);
    autoTable(doc, {
      startY: 40,
      head: [["Date", "In", "Out", "Status", "Late"]],
      body: rows.map((r) => [r.day, r.in, r.out, r.status, r.late > 0 ? `${r.late}m` : "-"]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [22, 78, 45] },
    });
    doc.save(`attendance-${targetProfile.full_name || "user"}-${month}.pdf`);
  };

  const exportCSV = () => {
    const lines = [["Date", "In", "Out", "Status", "Late (min)"].join(",")];
    for (const r of rows) lines.push([r.day, r.in, r.out, r.status, r.late].join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${targetProfile.full_name || "user"}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (view === "menu") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Report</h1>
        <button
          onClick={() => setView("attendance")}
          className="premium-card flex w-full items-center gap-4 p-4 text-left transition hover:bg-accent/40"
        >
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">Attendance</div>
            <div className="text-xs text-muted-foreground">Monthly attendance report</div>
          </div>
          <span className="text-muted-foreground">›</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setView("menu")} className="text-sm text-primary">← Back</button>
        <h1 className="text-xl font-bold">Attendance</h1>
      </div>

      <div className="premium-card space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-primary" />
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        {isAdmin && (
          <select
            value={uid}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {(employees ?? []).map((emp: any) => (
              <option key={emp.id} value={emp.id}>{emp.full_name || emp.email}</option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <button
            onClick={exportPDF}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Download className="h-4 w-4" /> PDF
          </button>
          <button
            onClick={exportCSV}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-accent"
          >
            <Printer className="h-4 w-4" /> CSV
          </button>
        </div>
      </div>

      <div className="premium-card overflow-hidden">
        <div className="border-b border-border/40 px-4 py-3 text-center">
          <div className="text-sm font-semibold text-primary">{monthLabel(month)}</div>
          <div className="text-xs text-primary/80">Monthly Report</div>
          {isAdmin && targetProfile.full_name && (
            <div className="mt-1 text-xs text-muted-foreground">{targetProfile.full_name}</div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="border border-border/40 px-2 py-2 font-medium">Date</th>
                <th className="border border-border/40 px-2 py-2 font-medium">In</th>
                <th className="border border-border/40 px-2 py-2 font-medium">Out</th>
                <th className="border border-border/40 px-2 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-center">
              {rows.map((r) => {
                const present = r.status === "PRESENT";
                return (
                  <tr key={r.day}>
                    <td className="border border-border/40 px-2 py-2 text-primary underline">{r.day}</td>
                    <td className={`border border-border/40 px-2 py-2 ${present ? "text-emerald-500" : "text-muted-foreground"}`}>{r.in}</td>
                    <td className={`border border-border/40 px-2 py-2 ${present ? "text-emerald-500" : "text-muted-foreground"}`}>{r.out}</td>
                    <td className={`border border-border/40 px-2 py-2 ${present ? "text-foreground" : "text-muted-foreground"}`}>
                      {r.status}
                      {r.late > 0 && <div className="text-[10px] text-yellow-500">{r.late}m late</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
