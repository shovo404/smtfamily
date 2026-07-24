import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { firebase, supabase } from "@/lib/firebase-client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { resetEmployeeAttendance, updateAttendanceTimes, resetUserMonthAttendance } from "@/lib/admin-users.functions";
import { logAuditEvent } from "@/lib/audit-log";
import {
  Search, RotateCcw, Pencil, X, AlertTriangle, Download, Calendar,
  Users, UserCheck, UserX, LogIn, Clock, Square, CheckSquare, ChevronLeft, ChevronRight
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/attendance-management")({
  head: () => ({ meta: [{ title: "Attendance Management — SMT Family" }] }),
  component: AttendanceManagementPage,
});

function todayStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseHHMM(s: string): { h: number; m: number } {
  const [h, m] = s.split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}

function lateMinutes(checkIn: string | null, workDate: string, start: string): number {
  if (!checkIn) return 0;
  const { h, m } = parseHHMM(start);
  const startDate = new Date(`${workDate}T00:00:00`);
  startDate.setHours(h, m, 0, 0);
  const diff = Math.floor((new Date(checkIn).getTime() - startDate.getTime()) / 60000);
  return diff > 0 ? diff : 0;
}

function fmtMins(mins: number): string {
  if (mins <= 0) return "On time";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m late` : `${m}m late`;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function getMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function AttendancePhoto({ path, label }: { path?: string | null; label: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;
    let active = true;
    firebase.storage.from("attendance-faces").getPublicUrl(path).then(({ data, error }) => {
      if (active && !error) setUrl(data.publicUrl);
    });
    return () => { active = false; };
  }, [path]);

  if (!path) return <span className="text-muted-foreground">\u2014</span>;
  if (!url) return <span className="text-muted-foreground">Saved</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" title={`Open ${label} photo`}>
      <img src={url} alt={label} className="h-8 w-8 rounded border border-border object-cover" />
    </a>
  );
}

type ConfirmAction = {
  type: "reset" | "reset-bulk";
  userIds: string[];
} | null;

type EditRecord = {
  id: string;
  name: string;
  check_in: string | null;
  check_out: string | null;
};

type DrillDown = {
  userId: string;
  name: string;
} | null;

function EditAttendanceModal({
  record,
  onCancel,
  onSave,
}: {
  record: EditRecord;
  onCancel: () => void;
  onSave: (check_in: string | null, check_out: string | null) => void;
}) {
  const [ci, setCi] = useState(toLocalInput(record.check_in));
  const [co, setCo] = useState(toLocalInput(record.check_out));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="premium-card w-full max-w-md p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Edit Attendance \u2014 {record.name}</h3>
          <button onClick={onCancel} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <div className="mb-1 text-xs text-muted-foreground">Check In</div>
            <input type="datetime-local" value={ci} onChange={(e) => setCi(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <label className="block text-sm">
            <div className="mb-1 text-xs text-muted-foreground">Check Out</div>
            <input type="datetime-local" value={co} onChange={(e) => setCo(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2" />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
          <button onClick={() => onSave(ci || null, co || null)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function AttendanceManagementPage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [date, setDate] = useState(todayStr());
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [editRecord, setEditRecord] = useState<EditRecord | null>(null);
  const [drillDown, setDrillDown] = useState<DrillDown>(null);

  const { data: hours } = useQuery({
    queryKey: ["office-hours"],
    queryFn: async () => {
      const { data, error } = await firebase.from("app_settings").select("value").eq("key", "office_hours").maybeSingle();
      if (error) return { start: "09:00", end: "18:00" };
      const v = (data?.value ?? {}) as { start?: string; end?: string };
      return { start: v.start ?? "09:00", end: v.end ?? "18:00" };
    },
  });
  const officeStart = hours?.start ?? "09:00";

  const { data: employees } = useQuery({
    queryKey: ["employees-att-mgmt"],
    queryFn: async () => {
      const { data, error } = await firebase.from("users").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p: any) => ({ ...p, roles: p.role ? [p.role] : [] }));
    },
    enabled: !!me?.isAdmin,
  });

  const { data: attendanceRows } = useQuery({
    queryKey: ["attendance-mgmt", date],
    queryFn: async () => {
      const { data, error } = await firebase.from("attendance").select("*").eq("work_date", date);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!me?.isAdmin && !!date,
  });

  const attMap = new Map((attendanceRows ?? []).map((a: any) => [a.user_id, a]));

  const processed = (employees ?? []).map((emp: any) => {
    const att = attMap.get(emp.id);
    const checkIn = att?.check_in ?? null;
    const checkOut = att?.check_out ?? null;
    const lm = lateMinutes(checkIn, date, officeStart);
    const hoursWorked = checkIn && checkOut
      ? ((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3600000).toFixed(1)
      : null;
    return {
      ...emp,
      attendance: att ?? null,
      checkIn,
      checkOut,
      lateMins: lm,
      hoursWorked,
      isPresent: !!checkIn,
      isLate: lm > 0,
    };
  });

  const filtered = processed.filter((e: any) =>
    (e.full_name ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (e.email ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (e.employee_id ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const stats = (() => {
    const total = processed.length;
    const present = processed.filter((e: any) => e.isPresent).length;
    const late = processed.filter((e: any) => e.isLate).length;
    const absent = total - present;
    const onTime = present - late;
    return { total, present, absent, late, onTime };
  })();

  const resetMut = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      return resetEmployeeAttendance({ data: { userId } });
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["attendance-mgmt"] });
      toast.success(`Attendance reset (${result.details?.join(", ")})`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Reset failed: " + String(e)),
  });

  const executeReset = async () => {
    if (!confirm) return;
    for (const id of confirm.userIds) {
      await resetMut.mutateAsync({ userId: id });
    }
    setSelected(new Set());
    setConfirm(null);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((e: any) => e.id)));
    }
  };

  const handleSaveEdit = async (check_in: string | null, check_out: string | null) => {
    if (!editRecord) return;
    try {
      await updateAttendanceTimes({
        data: {
          attendanceId: editRecord.id,
          check_in: check_in ? new Date(check_in).toISOString() : null,
          check_out: check_out ? new Date(check_out).toISOString() : null,
        },
      });
      toast.success("Attendance updated");
      setEditRecord(null);
      qc.invalidateQueries({ queryKey: ["attendance-mgmt"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const exportCSV = () => {
    const headers = ["Employee Name", "Email", "Employee ID", "Role", "Check In", "Check Out", "Hours", "Late", "Status"];
    const rows = filtered.map((e: any) => [
      e.full_name || "",
      e.email || "",
      e.employee_id || "",
      e.role || "",
      e.checkIn ? new Date(e.checkIn).toLocaleString() : "",
      e.checkOut ? new Date(e.checkOut).toLocaleString() : "",
      e.hoursWorked || "",
      e.checkIn ? (e.isLate ? fmtMins(e.lateMins) : "On time") : "",
      e.isPresent ? (e.isLate ? "Late" : "Present") : "Absent",
    ]);
    const csv = [headers.join(","), ...rows.map((r: string[]) => r.map((c: string) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    const pad = (n: number) => String(n).padStart(2, "0");
    setDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  };

  if (!me || !me.isAdmin) {
    return (
      <div className="premium-card p-10 text-center text-sm text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Attendance Management</h1>
          <p className="text-sm text-muted-foreground">View and manage daily employee attendance</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex shrink-0 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
            <Download className="h-4 w-4" />Export CSV
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 rounded-md border border-border">
          <button onClick={() => changeDate(-1)} className="rounded-l-md p-2 hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-44 rounded-none bg-input py-2 pl-9 pr-3 text-sm outline-none"
            />
          </div>
          <button onClick={() => changeDate(1)} className="rounded-r-md p-2 hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
        </div>
        {date !== todayStr() && (
          <button onClick={() => setDate(todayStr())} className="rounded-md border border-border px-3 py-2 text-xs hover:bg-accent">
            Today
          </button>
        )}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or ID\u2026"
            className="w-full rounded-md bg-input pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="premium-card p-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary"><Users className="h-4 w-4" /></div>
            <div><div className="text-[10px] uppercase text-muted-foreground">Total</div><div className="text-lg font-bold">{stats.total}</div></div>
          </div>
        </div>
        <div className="premium-card p-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary"><LogIn className="h-4 w-4" /></div>
            <div><div className="text-[10px] uppercase text-muted-foreground">Present</div><div className="text-lg font-bold">{stats.present}</div></div>
          </div>
        </div>
        <div className="premium-card p-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-yellow-500/20 text-yellow-300"><Clock className="h-4 w-4" /></div>
            <div><div className="text-[10px] uppercase text-muted-foreground">On Time</div><div className="text-lg font-bold">{stats.onTime}</div></div>
          </div>
        </div>
        <div className="premium-card p-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-destructive/20 text-destructive"><AlertTriangle className="h-4 w-4" /></div>
            <div><div className="text-[10px] uppercase text-muted-foreground">Late</div><div className="text-lg font-bold">{stats.late}</div></div>
          </div>
        </div>
        <div className="premium-card p-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><UserX className="h-4 w-4" /></div>
            <div><div className="text-[10px] uppercase text-muted-foreground">Absent</div><div className="text-lg font-bold">{stats.absent}</div></div>
          </div>
        </div>
      </div>

      {me.isSuperAdmin && filtered.length > 0 && (
        <div className="flex items-center gap-2">
          <button onClick={toggleSelectAll} className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
            {selected.size === filtered.length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            {selected.size === filtered.length ? "Deselect All" : `Select All (${filtered.length})`}
          </button>
          {selected.size > 0 && (
            <>
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>
              <button onClick={() => setConfirm({ type: "reset-bulk", userIds: [...selected] })}
                className="flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">
                <RotateCcw className="h-3.5 w-3.5" />Reset Selected
              </button>
              <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
            </>
          )}
        </div>
      )}

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                {me.isSuperAdmin && <th className="px-3 py-3 font-medium w-8"></th>}
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Check In</th>
                <th className="px-4 py-3 font-medium">Check Out</th>
                <th className="px-4 py-3 font-medium">Hours</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Photos</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp: any) => {
                const isSelected = selected.has(emp.id);
                return (
                  <tr key={emp.id} className={`border-t border-border/40 ${isSelected ? "bg-primary/5" : ""} ${emp.attendance ? "cursor-pointer hover:bg-accent/30" : ""}`}
                    onClick={() => emp.attendance ? setDrillDown({ userId: emp.id, name: emp.full_name || emp.email }) : undefined}>
                    {me.isSuperAdmin && (
                      <td className="px-3 py-3">
                        <button onClick={(e) => { e.stopPropagation(); toggleSelect(emp.id); }}>
                          {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="font-medium">{emp.full_name || "\u2014"}</div>
                      <div className="text-[11px] text-muted-foreground">{emp.email}{emp.employee_id ? ` \u00B7 ${emp.employee_id}` : ""}</div>
                    </td>
                    <td className="px-4 py-3 text-xs uppercase text-muted-foreground">{emp.role ?? "\u2014"}</td>
                    <td className="px-4 py-3">{formatTime(emp.checkIn)}</td>
                    <td className="px-4 py-3">{formatTime(emp.checkOut)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{emp.hoursWorked ? `${emp.hoursWorked}h` : "\u2014"}</td>
                    <td className="px-4 py-3">
                      {emp.isPresent ? (
                        emp.isLate
                          ? <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-semibold text-yellow-300">{fmtMins(emp.lateMins)}</span>
                          : <span className="text-xs text-primary">On time</span>
                      ) : <span className="text-xs text-muted-foreground">Absent</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 items-center">
                        <AttendancePhoto path={emp.attendance?.check_in_photo_url} label="In" />
                        <AttendancePhoto path={emp.attendance?.check_out_photo_url} label="Out" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {emp.attendance && (
                          <button onClick={(e) => { e.stopPropagation(); setEditRecord({
                            id: emp.attendance.id,
                            name: emp.full_name || emp.email,
                            check_in: emp.attendance.check_in,
                            check_out: emp.attendance.check_out,
                          }); }}
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent">
                            <Pencil className="h-3 w-3" />Edit
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setConfirm({ type: "reset", userIds: [emp.id] }); }}
                          className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">
                          <RotateCcw className="h-3 w-3" />Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={me.isSuperAdmin ? 9 : 8} className="px-4 py-10 text-center text-muted-foreground">No employees found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border/40 px-4 py-2 text-xs text-muted-foreground flex justify-between">
          <span>{filtered.length} employees shown</span>
          <span>{date === todayStr() ? "Today" : formatDate(date)}</span>
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="premium-card w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive/20 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Reset Attendance</h3>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm">
              {confirm.type === "reset-bulk"
                ? `Are you sure you want to reset attendance for ${confirm.userIds.length} selected employees?`
                : "Are you sure you want to reset this employee's attendance records?"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              This will delete all attendance records, check-in/out history, face attendance photos, GPS history, and route history. The employee account, profile, permissions, tasks, and notifications will remain unchanged.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirm(null)} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
              <button onClick={executeReset} disabled={resetMut.isPending}
                className="flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
                {resetMut.isPending ? "Resetting\u2026" : "Reset Attendance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editRecord && (
        <EditAttendanceModal
          record={editRecord}
          onCancel={() => setEditRecord(null)}
          onSave={handleSaveEdit}
        />
      )}

      {drillDown && (
        <DrillDownModal
          userId={drillDown.userId}
          name={drillDown.name}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  );
}

function DrillDownModal({ userId, name, onClose }: { userId: string; name: string; onClose: () => void }) {
  const qc = useQueryClient();
  const monthStart = getMonthStart();
  const [selectedMonth, setSelectedMonth] = useState(monthStart);
  const [editing, setEditing] = useState<{ id: string; check_in: string | null; check_out: string | null } | null>(null);

  const { data: hours } = useQuery({
    queryKey: ["office-hours"],
    queryFn: async () => {
      const { data, error } = await firebase.from("app_settings").select("value").eq("key", "office_hours").maybeSingle();
      if (error) return { start: "09:00", end: "18:00" };
      const v = (data?.value ?? {}) as { start?: string; end?: string };
      return { start: v.start ?? "09:00", end: v.end ?? "18:00" };
    },
  });
  const officeStart = hours?.start ?? "09:00";

  const { data: monthData } = useQuery({
    queryKey: ["attendance-drilldown", userId, selectedMonth],
    queryFn: async () => {
      const { data, error } = await firebase
        .from("attendance")
        .select("*")
        .eq("user_id", userId)
        .gte("work_date", selectedMonth);
      if (error) throw error;
      return (data ?? []).sort((a: any, b: any) => (b.work_date || "").localeCompare(a.work_date || ""));
    },
  });

  const summary = (() => {
    const rows = monthData ?? [];
    let present = 0, late = 0, totalHrs = 0;
    for (const a of rows) {
      if (a.check_in) {
        present++;
        if (lateMinutes(a.check_in, a.work_date, officeStart) > 0) late++;
        if (a.check_out) totalHrs += (new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 3600000;
      }
    }
    return { present, late, totalHrs, total: rows.length };
  })();

  const handleResetMonth = async () => {
    const month = selectedMonth.slice(0, 7);
    if (!confirm(`Reset all attendance for ${name} in ${month}?`)) return;
    try {
      await resetUserMonthAttendance({ data: { userId, month } });
      toast.success("Attendance reset for month");
      qc.invalidateQueries({ queryKey: ["attendance-drilldown"] });
      qc.invalidateQueries({ queryKey: ["attendance-mgmt"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleDrillEdit = async (check_in: string | null, check_out: string | null) => {
    if (!editing) return;
    try {
      await updateAttendanceTimes({
        data: {
          attendanceId: editing.id,
          check_in: check_in ? new Date(check_in).toISOString() : null,
          check_out: check_out ? new Date(check_out).toISOString() : null,
        },
      });
      toast.success("Updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["attendance-drilldown"] });
      qc.invalidateQueries({ queryKey: ["attendance-mgmt"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleMonthChange = (delta: number) => {
    const d = new Date(selectedMonth);
    d.setMonth(d.getMonth() + delta);
    const pad = (n: number) => String(n).padStart(2, "0");
    setSelectedMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="premium-card w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
          <div>
            <h3 className="font-semibold">{name}</h3>
            <p className="text-xs text-muted-foreground">Drill-down attendance history</p>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <button onClick={() => handleMonthChange(-1)} className="rounded p-1 hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm font-medium">
              {new Date(selectedMonth + "T00:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
            <button onClick={() => handleMonthChange(1)} className="rounded p-1 hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <button onClick={handleResetMonth} className="flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">
            <RotateCcw className="h-3 w-3" />Reset Month
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 px-5 py-3 border-b border-border/40 bg-muted/30">
          <div className="text-center">
            <div className="text-[10px] uppercase text-muted-foreground">Present</div>
            <div className="text-lg font-semibold text-primary">{summary.present}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase text-muted-foreground">Late</div>
            <div className="text-lg font-semibold text-yellow-400">{summary.late}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase text-muted-foreground">Total Hrs</div>
            <div className="text-lg font-semibold">{summary.totalHrs.toFixed(1)}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left sticky top-0">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Check In</th>
                <th className="px-4 py-3 font-medium">Check Out</th>
                <th className="px-4 py-3 font-medium">Hours</th>
                <th className="px-4 py-3 font-medium">Late</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {(monthData ?? []).map((a: any) => {
                const h = a.check_in && a.check_out
                  ? ((new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 3600000).toFixed(1)
                  : null;
                const lm = lateMinutes(a.check_in, a.work_date, officeStart);
                return (
                  <tr key={a.id} className="border-t border-border/40">
                    <td className="px-5 py-3 font-medium">{new Date(a.work_date).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatTime(a.check_in)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatTime(a.check_out)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{h ? `${h}h` : "\u2014"}</td>
                    <td className="px-4 py-3">
                      {a.check_in ? (
                        lm > 0
                          ? <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-semibold text-yellow-300">{fmtMins(lm)}</span>
                          : <span className="text-xs text-primary">On time</span>
                      ) : <span className="text-xs text-muted-foreground">\u2014</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEditing({
                        id: a.id,
                        check_in: a.check_in,
                        check_out: a.check_out,
                      })}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent">
                        <Pencil className="h-3 w-3" />Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {(monthData ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No records for this month.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4">
          <div className="premium-card w-full max-w-md p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Edit Attendance Record</h3>
              <button onClick={() => setEditing(null)} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <div className="mb-1 text-xs text-muted-foreground">Check In</div>
                <input type="datetime-local" defaultValue={toLocalInput(editing.check_in)}
                  onChange={(e) => setEditing({ ...editing, check_in: e.target.value || null })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2" />
              </label>
              <label className="block text-sm">
                <div className="mb-1 text-xs text-muted-foreground">Check Out</div>
                <input type="datetime-local" defaultValue={toLocalInput(editing.check_out)}
                  onChange={(e) => setEditing({ ...editing, check_out: e.target.value || null })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2" />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
              <button onClick={() => handleDrillEdit(
                editing.check_in ? new Date(editing.check_in).toISOString() : null,
                editing.check_out ? new Date(editing.check_out).toISOString() : null,
              )} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
