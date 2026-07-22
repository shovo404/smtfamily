import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { Plus, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ta")({
  head: () => ({ meta: [{ title: "Travel Allowance — SMT Family" }] }),
  component: TAPage,
});

function TAPage() {
  const { me, allowed } = useAdminGuard();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: list } = useQuery({
    queryKey: ["ta-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ta_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const ids = [...new Set((data ?? []).map((r) => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const map = new Map(profiles?.map((p) => [p.id, p]) ?? []);
      return (data ?? []).map((r) => ({ ...r, profile: map.get(r.user_id) }));
    },
    enabled: allowed,
  });

  const submit = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("ta_requests").insert({
        user_id: me!.user.id,
        from_location: String(form.get("from_location")),
        to_location: String(form.get("to_location")),
        travel_date: String(form.get("travel_date")),
        purpose: String(form.get("purpose") || ""),
        distance_km: Number(form.get("distance_km") || 0),
        transport_type: String(form.get("transport_type") || ""),
        requested_amount: Number(form.get("requested_amount") || 0),
        remarks: String(form.get("remarks") || ""),
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ta-requests"] }); toast.success("Submitted"); setShowForm(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const decide = useMutation({
    mutationFn: async ({ id, status, amount }: { id: string; status: "approved" | "rejected"; amount?: number }) => {
      const { error } = await supabase.from("ta_requests")
        .update({ status, ...(amount !== undefined ? { approved_amount: amount } : {}) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ta-requests"] }); toast.success("Updated"); },
  });

  if (!allowed || !me) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Travel Allowance</h1>
          <p className="text-sm text-muted-foreground">Submit and approve TA requests.</p>
        </div>
        {!me?.isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />New Request
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); submit.mutate(new FormData(e.currentTarget)); }}
          className="premium-card p-6 grid gap-3 sm:grid-cols-2">
          <input name="from_location" required placeholder="From" className="rounded-md bg-input px-3 py-2 text-sm" />
          <input name="to_location" required placeholder="To" className="rounded-md bg-input px-3 py-2 text-sm" />
          <input name="travel_date" type="date" required className="rounded-md bg-input px-3 py-2 text-sm" />
          <input name="transport_type" placeholder="Transport (bus, bike, etc.)" className="rounded-md bg-input px-3 py-2 text-sm" />
          <input name="distance_km" type="number" step="0.1" placeholder="Distance (km)" className="rounded-md bg-input px-3 py-2 text-sm" />
          <input name="requested_amount" type="number" required placeholder="Amount (BDT)" className="rounded-md bg-input px-3 py-2 text-sm" />
          <input name="purpose" placeholder="Purpose" className="rounded-md bg-input px-3 py-2 text-sm sm:col-span-2" />
          <textarea name="remarks" placeholder="Remarks" className="rounded-md bg-input px-3 py-2 text-sm sm:col-span-2" />
          <button className="sm:col-span-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground">Submit</button>
        </form>
      )}

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                {me?.isAdmin && <th className="px-4 py-3 font-medium">Employee</th>}
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {me?.isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {(list ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border/40">
                  {me?.isAdmin && <td className="px-4 py-3">{r.profile?.full_name || r.profile?.email || "—"}</td>}
                  <td className="px-4 py-3">{r.from_location} → {r.to_location}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.travel_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    ৳{r.approved_amount ?? r.requested_amount}
                    {r.approved_amount !== null && r.approved_amount !== r.requested_amount && (
                      <span className="ml-1 text-xs text-muted-foreground line-through">৳{r.requested_amount}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      r.status === "approved" ? "bg-primary/20 text-primary" :
                      r.status === "rejected" ? "bg-destructive/20 text-destructive" :
                      "bg-muted text-muted-foreground"}`}>{r.status}</span>
                  </td>
                  {me?.isAdmin && (
                    <td className="px-4 py-3 text-right">
                      {r.status === "pending" && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => decide.mutate({ id: r.id, status: "approved", amount: r.requested_amount })}
                            className="rounded-md bg-primary/20 p-2 text-primary hover:bg-primary/30" title="Approve">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => decide.mutate({ id: r.id, status: "rejected" })}
                            className="rounded-md bg-destructive/20 p-2 text-destructive hover:bg-destructive/30" title="Reject">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {(list ?? []).length === 0 && (
                <tr><td colSpan={me?.isAdmin ? 6 : 5} className="px-4 py-10 text-center text-muted-foreground">No TA requests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
