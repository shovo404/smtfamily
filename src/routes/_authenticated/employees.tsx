import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { firebase } from "@/lib/firebase-client";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import {
  createEmployee,
  resetEmployeePassword,
  deleteEmployee,
  changeEmployeeRole,
  updateEmployeeProfile,
} from "@/lib/admin-users.functions";
import { Search, Power, Plus, KeyRound, Trash2, Pencil, X } from "lucide-react";
import type { AppRole } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/employees")({
  head: () => ({ meta: [{ title: "Employees — SMT Family" }] }),
  component: EmployeesPage,
});

const ALL_ROLES: AppRole[] = ["admin", "hr", "dhr", "sr", "fso"];

function EmployeesPage() {
  const { me, allowed } = useAdminGuard();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const createFn = useServerFn(createEmployee);
  const resetFn = useServerFn(resetEmployeePassword);
  const deleteFn = useServerFn(deleteEmployee);
  const changeRoleFn = useServerFn(changeEmployeeRole);
  const updateProfileFn = useServerFn(updateEmployeeProfile);
  const [editing, setEditing] = useState<{ id: string; full_name: string; phone: string; department: string } | null>(null);

  const { data: list } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data: profiles, error } = await firebase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const { data: roles } = await firebase.from("user_roles").select("user_id, role");
      const roleMap = new Map<string, string[]>();
      (roles ?? []).forEach((r: any) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });
      return (profiles ?? []).map((p: any) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
    },
    enabled: allowed,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await firebase.from("profiles").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success("Updated"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      await changeRoleFn({ data: { userId, role } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success("Role updated"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const resetPw = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      await resetFn({ data: { userId, newPassword } });
    },
    onSuccess: () => toast.success("Password reset"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      await deleteFn({ data: { userId } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success("Employee deleted"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const updateProfile = useMutation({
    mutationFn: async (f: FormData) => {
      if (!editing) return;
      await updateProfileFn({
        data: {
          userId: editing.id,
          full_name: String(f.get("full_name")),
          phone: String(f.get("phone") || ""),
          department: String(f.get("department") || ""),
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
    mutationFn: async (form: FormData) => {
      await createFn({
        data: {
          email: String(form.get("email")).trim(),
          password: String(form.get("password")),
          full_name: String(form.get("full_name")),
          phone: String(form.get("phone") || "") || undefined,
          department: String(form.get("department") || "") || undefined,
          role: String(form.get("role")) as AppRole,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee created");
      setShowForm(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create"),
  });

  if (!allowed || !me) return null;

  const canManage = me.perms.manageEmployees;
  const canDelete = me.perms.deleteEmployees;
  const canReset = me.perms.resetPasswords;
  const canChangeRole = me.perms.changeRoles;
  const viewOnly = me.isDHR;

  const assignableRoles: AppRole[] = ["admin", "hr", "dhr", "sr", "fso"];

  const filtered = (list ?? []).filter((e: any) =>
    (e.full_name ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (e.email ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const handleReset = (userId: string, name: string) => {
    const pw = window.prompt(`New password for ${name} (min 6 chars):`);
    if (!pw) return;
    resetPw.mutate({ userId, newPassword: pw });
  };

  const handleDelete = (userId: string, name: string) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    remove.mutate({ userId });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Employees</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} employees</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
            className="w-full rounded-md bg-input pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        {canManage && (
          <button onClick={() => setShowForm(!showForm)} className="flex shrink-0 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" />Add
          </button>
        )}
      </div>

      {showForm && canManage && (
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate(new FormData(e.currentTarget)); }}
          className="premium-card p-4 grid gap-3"
        >
          <input name="full_name" required placeholder="Full name" className="rounded-md bg-input px-3 py-2 text-sm" />
          <input name="email" type="email" required placeholder="Email" className="rounded-md bg-input px-3 py-2 text-sm" />
          <input name="password" required minLength={6} placeholder="Temporary password (min 6)" className="rounded-md bg-input px-3 py-2 text-sm" />
          <select name="role" required defaultValue="sr" className="rounded-md bg-input px-3 py-2 text-sm">
            {assignableRoles.map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
          </select>
          <input name="phone" placeholder="Phone" className="rounded-md bg-input px-3 py-2 text-sm" />
          <input name="department" placeholder="Department" className="rounded-md bg-input px-3 py-2 text-sm" />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
            <button disabled={create.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      )}

      {/* Mobile card list */}
      <div className="space-y-3">
        {filtered.map((emp: any) => {
          const isSuper = emp.roles.includes("super_admin");
          const canEditThis = canChangeRole;
          const canDeleteThis = canDelete && emp.id !== me.user.id;
          return (
            <div key={emp.id} className="premium-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{emp.full_name || "—"}</div>
                  <div className="truncate text-xs text-muted-foreground">{emp.email}</div>
                  {emp.phone && <div className="text-xs text-muted-foreground">{emp.phone}</div>}
                  {emp.department && <div className="text-xs text-muted-foreground">{emp.department}</div>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${emp.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {emp.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {canEditThis && !viewOnly ? (
                  <select
                    value={(emp.roles[0] as AppRole) ?? "sr"}
                    onChange={(e) => setRole.mutate({ userId: emp.id, role: e.target.value as AppRole })}
                    className="rounded bg-input px-2 py-1 text-xs"
                  >
                    {assignableRoles.map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                    {isSuper && <option value="super_admin">ADMIN (legacy)</option>}
                  </select>
                ) : (
                  <span className="rounded bg-accent/60 px-2 py-1 text-xs uppercase">
                    {emp.roles[0] ?? "sr"}
                  </span>
                )}

                {!viewOnly && (
                  <>
                    <button
                      onClick={() => setEditing({ id: emp.id, full_name: emp.full_name || "", phone: emp.phone || "", department: emp.department || "" })}
                      className="rounded-md border border-border p-2 hover:bg-accent"
                      title="Edit profile"
                      disabled={!canManage}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleActive.mutate({ id: emp.id, is_active: !emp.is_active })}
                      className="ml-auto rounded-md border border-border p-2 hover:bg-accent"
                      title="Toggle active"
                      disabled={!canManage}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    {canReset && (
                      <button
                        onClick={() => handleReset(emp.id, emp.full_name || emp.email || "user")}
                        className="rounded-md border border-border p-2 hover:bg-accent"
                        title="Reset password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                    )}
                    {canDeleteThis && (
                      <button
                        onClick={() => handleDelete(emp.id, emp.full_name || emp.email || "user")}
                        className="rounded-md border border-destructive/40 p-2 text-destructive hover:bg-destructive/10"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="premium-card p-10 text-center text-sm text-muted-foreground">No employees found.</div>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {viewOnly ? "You have view-only access." : "Only Super Admin, Admin, and HR can create employees."}
      </p>

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
              <input name="phone" defaultValue={editing.phone}
                className="w-full rounded-md bg-input px-3 py-2 text-sm" placeholder="Phone" />
              <input name="department" defaultValue={editing.department}
                className="w-full rounded-md bg-input px-3 py-2 text-sm" placeholder="Department" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)}
                  className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
                <button disabled={updateProfile.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  {updateProfile.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
