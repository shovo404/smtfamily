import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { firebase } from "@/lib/firebase-client";
import { useCurrentUser, type AppRole } from "@/hooks/use-current-user";
import {
  createEmployee,
  resetEmployeePassword,
  deleteEmployee,
  changeEmployeeRole,
  updateEmployeeProfile,
  resetEmployeeAttendance,
} from "@/lib/admin-users.functions";
import { Search, Power, Plus, KeyRound, Trash2, Pencil, X, RotateCcw, CheckSquare, Square, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/employees")({
  head: () => ({ meta: [{ title: "Employees — SMT Family" }] }),
  component: EmployeesPage,
});

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "hr", label: "HR" },
  { value: "dsr", label: "DSR" },
  { value: "sr", label: "SR" },
];

type ConfirmAction = {
  type: "reset" | "reset-bulk" | "reset-all";
  userIds?: string[];
  names?: string;
} | null;

function EmployeesPage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<{ id: string; full_name: string; phone: string; department: string; employee_id: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<ConfirmAction>(null);

  const [formData, setFormData] = useState({
    full_name: "", email: "", phone: "", password: "",
    role: "sr" as AppRole, department: "", employee_id: "",
  });

  const { data: list } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data: users, error } = await firebase.from("users").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (users ?? []).map((p: any) => ({ ...p, roles: p.role ? [p.role] : [] }));
    },
    enabled: !!me?.isStaff,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await firebase.from("users").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success("Updated"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      await changeEmployeeRole({ data: { userId, role } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success("Role updated"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const resetPw = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      await resetEmployeePassword({ data: { userId, newPassword } });
    },
    onSuccess: () => toast.success("Password reset email sent"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      await deleteEmployee({ data: { userId } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success("Employee deactivated"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const updateProfile = useMutation({
    mutationFn: async (f: FormData) => {
      if (!editing) return;
      await updateEmployeeProfile({
        data: {
          userId: editing.id,
          full_name: String(f.get("full_name")),
          phone: String(f.get("phone") || ""),
          department: String(f.get("department") || ""),
          employee_id: String(f.get("employee_id") || ""),
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["current-user"] });
      toast.success("Profile updated");
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const create = useMutation({
    mutationFn: async () => {
      await createEmployee({ data: formData });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee created");
      setShowForm(false);
      setFormData({ full_name: "", email: "", phone: "", password: "", role: "sr", department: "", employee_id: "" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create"),
  });

  const resetAtt = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      return resetEmployeeAttendance({ data: { userId } });
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success(`Attendance reset successfully (${result.details?.join(", ")})`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Reset failed"),
  });

  if (!me || !me.isStaff) return null;

  const canManage = me.perms.manageEmployees;
  const canDelete = me.perms.deleteEmployees;
  const canReset = me.perms.resetPasswords;
  const canChangeRole = me.perms.changeRoles;
  const isSuperAdmin = me.isSuperAdmin;

  const filtered = (list ?? []).filter((e: any) =>
    (e.full_name ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (e.email ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (e.employee_id ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const handleResetPw = (userId: string, name: string, email: string) => {
    if (!confirm(`Send password reset email to ${name} (${email})?`)) return;
    resetPw.mutate({ userId, newPassword: "" });
  };

  const handleDelete = (userId: string, name: string) => {
    if (!confirm(`Deactivate ${name}? They will not be able to sign in.`)) return;
    remove.mutate({ userId });
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSingleReset = (userId: string) => {
    setConfirm({ type: "reset", userIds: [userId] });
  };

  const executeReset = async () => {
    if (!confirm) return;
    const ids = confirm.type === "reset-all"
      ? filtered.map((e: any) => e.id)
      : confirm.userIds ?? [];
    for (const id of ids) {
      await resetAtt.mutateAsync({ userId: id });
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} employees</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => {
              if (filtered.length === 0) return;
              setConfirm({ type: "reset-all" });
            }}
            disabled={filtered.length === 0}
            className="flex shrink-0 items-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />Reset All
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or ID\u2026"
            className="w-full rounded-md bg-input pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        {canManage && (
          <button onClick={() => setShowForm(!showForm)} className="flex shrink-0 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" />Add
          </button>
        )}
      </div>

      {isSuperAdmin && filtered.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
          >
            {selected.size === filtered.length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            {selected.size === filtered.length ? "Deselect All" : `Select All (${filtered.length})`}
          </button>
          {selected.size > 0 && (
            <>
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>
              <button
                onClick={() => setConfirm({ type: "reset-bulk", userIds: [...selected] })}
                className="flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
              >
                <RotateCcw className="h-3.5 w-3.5" />Reset Selected
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}

      {showForm && canManage && (
        <div className="premium-card p-4 grid gap-3">
          <h3 className="font-semibold text-base">Create Employee</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={formData.full_name} onChange={(e) => handleFormChange("full_name", e.target.value)}
              required placeholder="Full Name *"
              className="rounded-md bg-input px-3 py-2 text-sm col-span-full" />
            <input
              value={formData.email} onChange={(e) => handleFormChange("email", e.target.value)}
              type="email" required placeholder="Email *"
              className="rounded-md bg-input px-3 py-2 text-sm" />
            <input
              value={formData.password} onChange={(e) => handleFormChange("password", e.target.value)}
              required minLength={6} placeholder="Password * (min 6)"
              className="rounded-md bg-input px-3 py-2 text-sm" />
            <input
              value={formData.phone} onChange={(e) => handleFormChange("phone", e.target.value)}
              placeholder="Phone"
              className="rounded-md bg-input px-3 py-2 text-sm" />
            <input
              value={formData.employee_id} onChange={(e) => handleFormChange("employee_id", e.target.value)}
              placeholder="Employee ID"
              className="rounded-md bg-input px-3 py-2 text-sm" />
            <input
              value={formData.department} onChange={(e) => handleFormChange("department", e.target.value)}
              placeholder="Department / District"
              className="rounded-md bg-input px-3 py-2 text-sm" />
            <select
              value={formData.role} onChange={(e) => handleFormChange("role", e.target.value)}
              required className="rounded-md bg-input px-3 py-2 text-sm">
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
            <button
              disabled={create.isPending || !formData.full_name || !formData.email || !formData.password}
              onClick={() => create.mutate()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {create.isPending ? "Creating\u2026" : "Create Employee"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((emp: any) => {
          const isSuper = emp.role === "super_admin";
          const canEditThis = canChangeRole && !isSuper;
          const canDeleteThis = canDelete && emp.id !== me.user.id && !isSuper;
          const isSelected = selected.has(emp.id);
          return (
            <div key={emp.id} className={`premium-card p-4 ${isSelected ? "ring-2 ring-primary/50" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                {isSuperAdmin && (
                  <button
                    onClick={() => toggleSelect(emp.id)}
                    className="mt-1 shrink-0"
                  >
                    {isSelected
                      ? <CheckSquare className="h-4 w-4 text-primary" />
                      : <Square className="h-4 w-4 text-muted-foreground" />}
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{emp.full_name || "\u2014"}</div>
                  <div className="truncate text-xs text-muted-foreground">{emp.email}</div>
                  {emp.employee_id && <div className="text-xs text-muted-foreground">ID: {emp.employee_id}</div>}
                  {emp.phone && <div className="text-xs text-muted-foreground">{emp.phone}</div>}
                  {emp.department && <div className="text-xs text-muted-foreground">{emp.department}</div>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${emp.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {emp.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {canEditThis ? (
                  <select
                    value={(emp.role as AppRole) ?? "sr"}
                    onChange={(e) => setRole.mutate({ userId: emp.id, role: e.target.value as AppRole })}
                    className="rounded bg-input px-2 py-1 text-xs"
                  >
                    {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    {isSuper && <option value="super_admin">SUPER ADMIN</option>}
                  </select>
                ) : (
                  <span className="rounded bg-accent/60 px-2 py-1 text-xs uppercase">
                    {emp.role ?? "sr"}
                  </span>
                )}

                <button
                  onClick={() => setEditing({
                    id: emp.id,
                    full_name: emp.full_name || "",
                    phone: emp.phone || "",
                    department: emp.department || "",
                    employee_id: emp.employee_id || "",
                  })}
                  className="rounded-md border border-border p-2 hover:bg-accent"
                  title="Edit profile"
                  disabled={!canManage}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleActive.mutate({ id: emp.id, is_active: !emp.is_active })}
                  className="rounded-md border border-border p-2 hover:bg-accent"
                  title="Toggle active"
                  disabled={!canManage}
                >
                  <Power className="h-4 w-4" />
                </button>
                {isSuperAdmin && (
                  <button
                    onClick={() => handleSingleReset(emp.id)}
                    className="rounded-md border border-destructive/40 p-2 text-destructive hover:bg-destructive/10"
                    title="Reset attendance"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                {canReset && (
                  <button
                    onClick={() => handleResetPw(emp.id, emp.full_name || emp.email || "user", emp.email)}
                    className="rounded-md border border-border p-2 hover:bg-accent"
                    title="Send password reset email"
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>
                )}
                {canDeleteThis && (
                  <button
                    onClick={() => handleDelete(emp.id, emp.full_name || emp.email || "user")}
                    className="rounded-md border border-destructive/40 p-2 text-destructive hover:bg-destructive/10"
                    title="Deactivate"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="premium-card p-10 text-center text-sm text-muted-foreground">No employees found.</div>
        )}
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
              {confirm.type === "reset-all"
                ? "Are you sure you want to reset ALL employees' attendance records?"
                : confirm.type === "reset-bulk"
                  ? `Are you sure you want to reset attendance for ${confirm.userIds?.length} selected employees?`
                  : "Are you sure you want to reset this employee's attendance records?"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              This will delete all attendance records, check-in/out history, face attendance photos, GPS history, and route history. The employee account, profile, permissions, tasks, and notifications will remain unchanged.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="rounded-md border border-border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={executeReset}
                disabled={resetAtt.isPending}
                className="flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {resetAtt.isPending ? "Resetting\u2026" : "Reset Attendance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="premium-card w-full max-w-md p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Edit Employee</h3>
              <button onClick={() => setEditing(null)} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); updateProfile.mutate(new FormData(e.currentTarget)); }}
              className="mt-4 space-y-3"
            >
              <input name="full_name" defaultValue={editing.full_name} required
                className="w-full rounded-md bg-input px-3 py-2 text-sm" placeholder="Full name" />
              <input name="employee_id" defaultValue={editing.employee_id}
                className="w-full rounded-md bg-input px-3 py-2 text-sm" placeholder="Employee ID" />
              <input name="phone" defaultValue={editing.phone}
                className="w-full rounded-md bg-input px-3 py-2 text-sm" placeholder="Phone" />
              <input name="department" defaultValue={editing.department}
                className="w-full rounded-md bg-input px-3 py-2 text-sm" placeholder="Department / District" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)}
                  className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
                <button disabled={updateProfile.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  {updateProfile.isPending ? "Saving\u2026" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


