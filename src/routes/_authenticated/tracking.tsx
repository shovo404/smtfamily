import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { LiveMap, type LiveMapMarker } from "@/components/live-map";
import { MapPin, WifiOff, ChevronLeft, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tracking")({
  component: TrackingPage,
});

type LocRow = {
  user_id: string;
  latitude: number;
  longitude: number;
  duty_on: boolean;
  updated_at: string;
  accuracy: number | null;
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function TrackingPage() {
  const { data: me } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (me && !me.perms.viewLiveTracking) navigate({ to: "/dashboard", replace: true });
  }, [me, navigate]);

  // Field employee profiles
  const { data: employees } = useQuery({
    queryKey: ["field-employees"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["sr", "fso", "dhr"]);
      const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      if (ids.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      const byId = new Map((profs ?? []).map((p) => [p.id, p]));
      return ids.map((id) => ({
        id,
        name: byId.get(id)?.full_name ?? byId.get(id)?.email ?? "Unknown",
        role: (roles ?? []).find((r) => r.user_id === id)?.role ?? "",
      }));
    },
  });

  const { data: locations } = useQuery({
    queryKey: ["employee-locations"],
    queryFn: async (): Promise<LocRow[]> => {
      const { data } = await supabase.from("employee_locations").select("*");
      return (data ?? []) as LocRow[];
    },
    refetchInterval: 15_000,
  });

  // Realtime updates for current positions
  useEffect(() => {
    const channel = supabase
      .channel("live-locations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employee_locations" },
        () => qc.invalidateQueries({ queryKey: ["employee-locations"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const locByUser = useMemo(() => {
    const m = new Map<string, LocRow>();
    for (const l of locations ?? []) m.set(l.user_id, l);
    return m;
  }, [locations]);

  if (selected) {
    return <EmployeeDetail userId={selected} onBack={() => setSelected(null)} />;
  }

  const liveMarkers: LiveMapMarker[] = (employees ?? [])
    .map((emp): LiveMapMarker | null => {
      const loc = locByUser.get(emp.id);
      if (!loc || !loc.duty_on || loc.latitude === 0) return null;
      return { lat: loc.latitude, lng: loc.longitude, label: emp.name, color: "#22c55e" };
    })
    .filter((m): m is LiveMapMarker => m !== null);

  const liveCount = liveMarkers.length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Live Tracking</h1>
        <p className="text-sm text-muted-foreground">
          Field employees' realtime location & path
        </p>
      </div>

      <div className="premium-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Live Map</h2>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {liveCount} live · {(employees?.length ?? 0) - liveCount} off
          </span>
        </div>
        {liveMarkers.length > 0 ? (
          <LiveMap markers={liveMarkers} height={320} fitToMarkers />
        ) : (
          <div className="grid h-[320px] place-items-center text-sm text-muted-foreground">
            No employees are sharing location right now.
          </div>
        )}
      </div>

      <div className="space-y-2">
        {(employees ?? []).map((emp) => {
          const loc = locByUser.get(emp.id);
          const on = loc?.duty_on && loc.latitude !== 0;
          return (
            <button
              key={emp.id}
              onClick={() => setSelected(emp.id)}
              className="premium-card flex w-full items-center gap-3 p-3 text-left transition hover:bg-accent/40"
            >
              <div
                className={`grid h-10 w-10 place-items-center rounded-full ${
                  on ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                }`}
              >
                {on ? <MapPin className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{emp.name}</div>
                <div className="text-[11px] uppercase text-muted-foreground">{emp.role}</div>
              </div>
              <div className="text-right text-[11px]">
                <div className={on ? "font-semibold text-primary" : "font-semibold text-destructive"}>
                  {on ? "LIVE" : "OFF"}
                </div>
                {loc && (
                  <div className="text-muted-foreground">{timeAgo(loc.updated_at)}</div>
                )}
              </div>
            </button>
          );
        })}
        {employees && employees.length === 0 && (
          <div className="premium-card p-6 text-center text-sm text-muted-foreground">
            No field employees yet.
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeeDetail({ userId, onBack }: { userId: string; onBack: () => void }) {
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .maybeSingle();
      return data;
    },
  });

  const { data: current } = useQuery({
    queryKey: ["employee-location", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_locations")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return data as LocRow | null;
    },
    refetchInterval: 10_000,
  });

  const { data: pings } = useQuery({
    queryKey: ["pings-today", userId],
    queryFn: async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("location_pings")
        .select("latitude, longitude, recorded_at")
        .eq("user_id", userId)
        .gte("recorded_at", since.toISOString())
        .order("recorded_at", { ascending: true })
        .limit(1000);
      return data ?? [];
    },
    refetchInterval: 20_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel(`emp-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employee_locations", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ["employee-location", userId] }),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "location_pings", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ["pings-today", userId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc, userId]);

  const path = (pings ?? []).map((p) => ({ lat: p.latitude, lng: p.longitude }));
  const on = current?.duty_on && current.latitude !== 0;
  const marker =
    on && current
      ? { lat: current.latitude, lng: current.longitude }
      : path.length > 0
      ? path[path.length - 1]
      : undefined;

  return (
    <div className="space-y-3">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>
      <div>
        <h1 className="text-xl font-bold">{profile?.full_name ?? profile?.email ?? "Employee"}</h1>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${
              on ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
            }`}
          >
            {on ? "LIVE" : "OFFLINE"}
          </span>
          {current && (
            <span className="text-muted-foreground">
              <Clock className="mr-1 inline h-3 w-3" />
              {timeAgo(current.updated_at)}
            </span>
          )}
        </div>
      </div>

      <LiveMap
        center={marker}
        marker={marker}
        path={path}
        height={380}
      />

      <div className="premium-card p-3 text-xs">
        <div className="mb-1 font-semibold">Today's path</div>
        <div className="text-muted-foreground">
          {path.length} points recorded
          {marker && (
            <>
              {" · "}Last: {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
            </>
          )}
        </div>
        {marker && (
          <a
            href={`https://www.google.com/maps?q=${marker.lat},${marker.lng}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-primary underline"
          >
            Open in Google Maps
          </a>
        )}
      </div>
    </div>
  );
}
