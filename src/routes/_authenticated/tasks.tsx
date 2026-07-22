import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks — SMT Family" }] }),
  component: TasksPage,
});

const STATUSES = ["pending", "in_progress", "completed", "overdue"] as const;

function TasksPage() {
  const { me, allowed } = useAdminGuard();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: tasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-simple"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email");
      return data ?? [];
    },
    enabled: !!me?.isAdmin,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: (typeof STATUSES)[number] }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Updated"); },
  });

  const createTask = useMutation({
    mutationFn: async (form: { title: string; description: string; assigned_to: string; due_date: string }) => {
      const { error } = await supabase.from("tasks").insert({
        title: form.title,
        description: form.description || null,
        assigned_to: form.assigned_to,
        assigned_by: me!.user.id,
        due_date: form.due_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Task created"); setShowForm(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const empName = (id: string | null) => employees?.find((e) => e.id === id)?.full_name ?? "—";

  if (!allowed) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">{tasks?.length ?? 0} total</p>
        </div>
        {me?.isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />New Task
          </button>
        )}
      </div>

      {showForm && me?.isAdmin && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            createTask.mutate({
              title: String(f.get("title")),
              description: String(f.get("description")),
              assigned_to: String(f.get("assigned_to")),
              due_date: String(f.get("due_date")),
            });
          }}
          className="premium-card p-6 grid gap-4 sm:grid-cols-2"
        >
          <input name="title" required placeholder="Title" className="rounded-md bg-input px-3 py-2 text-sm sm:col-span-2" />
          <textarea name="description" placeholder="Description" className="rounded-md bg-input px-3 py-2 text-sm sm:col-span-2" />
          <select name="assigned_to" required className="rounded-md bg-input px-3 py-2 text-sm">
            <option value="">Assign to…</option>
            {employees?.map((e) => <option key={e.id} value={e.id}>{e.full_name || e.email}</option>)}
          </select>
          <input name="due_date" type="date" className="rounded-md bg-input px-3 py-2 text-sm" />
          <button className="sm:col-span-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Create</button>
        </form>
      )}

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Assigned to</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(tasks ?? []).map((t) => (
                <tr key={t.id} className="border-t border-border/40">
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.title}</div>
                    {t.description && <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{empName(t.assigned_to)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.due_date ? new Date(t.due_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <select value={t.status} onChange={(e) => updateStatus.mutate({ id: t.id, status: e.target.value as (typeof STATUSES)[number] })}
                      className="rounded bg-input px-2 py-1 text-xs">
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {(tasks ?? []).length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No tasks yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
