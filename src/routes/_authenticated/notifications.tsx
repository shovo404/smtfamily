import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Bell, WifiOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data: me } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (me && !me.isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [me, navigate]);

  const { data: notifs } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*, profile:actor_user_id(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("notifications-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => qc.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const markAllRead = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">System alerts & events</p>
        </div>
        <button
          onClick={markAllRead}
          className="rounded-md bg-primary/20 px-3 py-1.5 text-xs font-semibold text-primary"
        >
          Mark all read
        </button>
      </div>

      <div className="space-y-2">
        {(notifs ?? []).map((n) => {
          const actor = (n as { profile?: { full_name?: string; email?: string } }).profile;
          const isOff = n.type === "location_off";
          return (
            <div
              key={n.id}
              className={`premium-card flex items-start gap-3 p-3 ${
                !n.is_read ? "border-primary/40" : ""
              }`}
            >
              <div
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                  isOff ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"
                }`}
              >
                {isOff ? <WifiOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate text-sm font-semibold">{n.title}</div>
                  {!n.is_read && (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                      NEW
                    </span>
                  )}
                </div>
                {actor && (
                  <div className="text-[11px] text-muted-foreground">
                    {actor.full_name ?? actor.email}
                  </div>
                )}
                {n.message && <div className="mt-1 text-xs">{n.message}</div>}
                {(() => {
                  const lk = (n.meta as { last_known?: { latitude: number; longitude: number; accuracy?: number | null; at?: string; maps_url?: string } | null } | null)?.last_known;
                  if (!lk) return null;
                  return (
                    <a
                      href={lk.maps_url ?? `https://www.google.com/maps?q=${lk.latitude},${lk.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block rounded-md bg-primary/15 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/25"
                    >
                      📍 {lk.latitude.toFixed(5)}, {lk.longitude.toFixed(5)} — open in Maps
                    </a>
                  );
                })()}
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
        {notifs && notifs.length === 0 && (
          <div className="premium-card p-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        )}
      </div>
    </div>
  );
}
