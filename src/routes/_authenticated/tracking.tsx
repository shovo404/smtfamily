import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { firebase } from "@/lib/firebase-client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { LiveMap, type LiveMapMarker } from "@/components/live-map";
import { MapPin, WifiOff, ChevronLeft, Clock, Route as RouteIcon, Calendar, Users, Navigation } from "lucide-react";

const MYMENSINGH = { lat: 24.75, lng: 90.4 };

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
  speed: number | null;
};

type PingRow = {
  latitude: number;
  longitude: number;
  recorded_at: string;
  speed: number | null;
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: "2-digit", month: "short" });
}

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function fmtDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function dateRange(key: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();
  if (key === "today") {
    const s = new Date(now);
    s.setHours(0, 0, 0, 0);
    return { start: s.toISOString(), end };
  }
  if (key === "yesterday") {
    const s = new Date(now);
    s.setDate(s.getDate() - 1);
    s.setHours(0, 0, 0, 0);
    const e = new Date(s);
    e.setHours(23, 59, 59, 999);
    return { start: s.toISOString(), end: e.toISOString() };
  }
  return { start: "", end };
}

function TrackingPage() {
  const { data: me } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (me && !me.perms.viewLiveTracking) navigate({ to: "/dashboard", replace: true });
  }, [me, navigate]);

  const { data: employees } = useQuery({
    queryKey: ["field-employees"],
    queryFn: async () => {
      const { data: fieldUsers } = await firebase
        .from("users")
        .select("id, full_name, email, employee_id, department, role")
        .eq("is_active", true);
      return (fieldUsers ?? []).map((u: any) => ({
        id: u.id,
        name: u.full_name ?? u.email ?? "Unknown",
        role: u.role ?? "",
        employee_id: u.employee_id ?? "",
        department: u.department ?? "",
      }));
    },
  });

  const { data: locations } = useQuery({
    queryKey: ["employee-locations"],
    queryFn: async (): Promise<LocRow[]> => {
      const { data } = await firebase.from("employee_locations").select("*");
      return (data ?? []) as LocRow[];
    },
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const channel = firebase
      .channel("live-locations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employee_locations" },
        () => qc.invalidateQueries({ queryKey: ["employee-locations"] }),
      )
      .subscribe();
    return () => { firebase.removeChannel(channel); };
  }, [qc]);

  const locByUser = useMemo(() => {
    const m = new Map<string, LocRow>();
    for (const l of locations ?? []) m.set(l.user_id, l);
    return m;
  }, [locations]);

  if (selected) {
    return <EmployeeDetail userId={selected} name={employees?.find((e: any) => e.id === selected)?.name} onBack={() => setSelected(null)} />;
  }

  const liveMarkers: LiveMapMarker[] = [];
  const markerMeta = new Map<string, Record<string, string>>();
  let activeCount = 0;

  for (const emp of employees ?? []) {
    const loc = locByUser.get(emp.id);
    const on = loc?.duty_on && loc.latitude !== 0;
    if (!loc || loc.latitude === 0) continue;
    if (on) activeCount++;
    const meta: Record<string, string> = {
      name: emp.name,
      role: emp.role.toUpperCase(),
      employee_id: emp.employee_id,
      department: emp.department,
      status: on ? "live" : "offline",
      updated: timeAgo(loc.updated_at),
    };
    markerMeta.set(emp.id, meta);
    liveMarkers.push({
      id: emp.id,
      lat: loc.latitude,
      lng: loc.longitude,
      label: emp.name,
      color: on ? "#22c55e" : "#ef4444",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Employee Tracking</h1>
          <p className="text-sm text-muted-foreground">Real-time employee locations &amp; movement history</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
          <Users className="h-4 w-4" />
          {activeCount} active
        </div>
      </div>

      <div className="premium-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Live Map</h2>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Live {activeCount}</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Off {liveMarkers.length - activeCount}</span>
          </div>
        </div>
        {liveMarkers.length > 0 ? (
          <LiveMap markers={liveMarkers} height={420} fitToMarkers markerMeta={markerMeta} />
        ) : (
          <div className="grid h-[420px] place-items-center text-sm text-muted-foreground">
            <div className="text-center">
              <MapPin className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p>No employees are sharing location right now.</p>
            </div>
          </div>
        )}
      </div>

      <h3 className="font-semibold text-sm text-muted-foreground">All Employees</h3>
      <div className="space-y-2">
        {(employees ?? []).map((emp: any) => {
          const loc = locByUser.get(emp.id);
          const on = loc?.duty_on && loc.latitude !== 0;
          return (
            <button
              key={emp.id}
              onClick={() => setSelected(emp.id)}
              className="premium-card flex w-full items-center gap-3 p-3 text-left transition hover:bg-accent/40"
            >
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                  on ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                }`}
              >
                {on ? <Navigation className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{emp.name}</div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="uppercase">{emp.role}</span>
                  {emp.department && <><span>·</span><span>{emp.department}</span></>}
                </div>
              </div>
              <div className="text-right text-[11px]">
                <div className={on ? "font-semibold text-green-500" : "font-semibold text-red-500"}>
                  {on ? "LIVE" : "OFF"}
                </div>
                {loc && <div className="text-muted-foreground">{timeAgo(loc.updated_at)}</div>}
              </div>
            </button>
          );
        })}
        {employees && employees.length === 0 && (
          <div className="premium-card p-6 text-center text-sm text-muted-foreground">No field employees yet.</div>
        )}
      </div>
    </div>
  );
}

function EmployeeDetail({ userId, name, onBack }: { userId: string; name?: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "custom">("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await firebase
        .from("profiles")
        .select("full_name, email, employee_id, department")
        .eq("id", userId)
        .maybeSingle();
      return data;
    },
  });

  const { data: current } = useQuery({
    queryKey: ["employee-location", userId],
    queryFn: async () => {
      const { data } = await firebase
        .from("employee_locations")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return data as LocRow | null;
    },
    refetchInterval: 10_000,
  });

  const range = dateFilter === "custom"
    ? { start: customStart ? new Date(customStart).toISOString() : "", end: customEnd ? new Date(customEnd + "T23:59:59").toISOString() : new Date().toISOString() }
    : dateRange(dateFilter);

  const { data: pings } = useQuery({
    queryKey: ["pings-range", userId, range.start, range.end],
    queryFn: async () => {
      if (!range.start) return [];
      const { data } = await firebase
        .from("location_pings")
        .select("latitude, longitude, recorded_at, speed")
        .eq("user_id", userId)
        .gte("recorded_at", range.start)
        .lte("recorded_at", range.end)
        .order("recorded_at", { ascending: true })
        .limit(5000);
      return (data ?? []) as PingRow[];
    },
    enabled: !!range.start,
  });

  useEffect(() => {
    const ch = firebase
      .channel(`emp-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employee_locations", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ["employee-location", userId] }),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "location_pings", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ["pings-range", userId, range.start, range.end] }),
      )
      .subscribe();
    return () => { firebase.removeChannel(ch); };
  }, [qc, userId, range.start, range.end]);

  const path = ((pings ?? []) as any[]).map((p: any) => ({ lat: p.latitude, lng: p.lng }));
  const on = current?.duty_on && current.latitude !== 0;
  const marker =
    on && current
      ? { id: userId, lat: current.latitude, lng: current.longitude, label: profile?.full_name || name || "Employee", color: "#22c55e" as const }
      : path.length > 0
      ? { id: userId, lat: path[path.length - 1].lat, lng: path[path.length - 1].lng, label: profile?.full_name || name || "Employee", color: "#ef4444" as const }
      : undefined;

  const totalDistance = useMemo(() => {
    let d = 0;
    const pingsArr = (pings ?? []) as any[];
    for (let i = 1; i < pingsArr.length; i++) {
      d += distanceMeters(
        { lat: pingsArr[i - 1].latitude, lng: pingsArr[i - 1].lng },
        { lat: pingsArr[i].latitude, lng: pingsArr[i].lng },
      );
    }
    return d;
  }, [pings]);

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to all employees
      </button>

      <div>
        <h1 className="text-xl font-bold">{profile?.full_name ?? profile?.email ?? name ?? "Employee"}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${
              on ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-500"
            }`}
          >
            {on ? "● LIVE" : "○ OFFLINE"}
          </span>
          {current && (
            <span className="text-muted-foreground">
              <Clock className="mr-1 inline h-3 w-3" />
              {timeAgo(current.updated_at)}
            </span>
          )}
          {profile?.employee_id && (
            <span className="text-muted-foreground">ID: {profile.employee_id}</span>
          )}
          {profile?.department && (
            <span className="text-muted-foreground">{profile.department}</span>
          )}
        </div>
      </div>

      <div className="premium-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <RouteIcon className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Movement Route</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {(["today", "yesterday", "custom"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setDateFilter(key)}
                className={`rounded-full px-2.5 py-1 font-medium transition ${
                  dateFilter === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent/60 hover:bg-accent"
                }`}
              >
                {key === "today" ? "Today" : key === "yesterday" ? "Yesterday" : "Custom"}
              </button>
            ))}
          </div>
        </div>
        {dateFilter === "custom" && (
          <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded border border-border bg-background px-2 py-1 text-xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded border border-border bg-background px-2 py-1 text-xs"
            />
          </div>
        )}
        <LiveMap
          marker={marker}
          path={path}
          height={400}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="premium-card p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Points</div>
          <div className="mt-1 text-lg font-bold">{pings?.length ?? 0}</div>
        </div>
        <div className="premium-card p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Distance</div>
          <div className="mt-1 text-lg font-bold">{totalDistance > 0 ? fmtDistance(totalDistance) : "—"}</div>
        </div>
        <div className="premium-card p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">First Seen</div>
          <div className="mt-1 text-sm font-semibold">
            {pings && pings.length > 0 ? fmtTime(pings[0].recorded_at) : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {pings && pings.length > 0 ? fmtDate(pings[0].recorded_at) : ""}
          </div>
        </div>
        <div className="premium-card p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Last Seen</div>
          <div className="mt-1 text-sm font-semibold">
            {pings && pings.length > 0 ? fmtTime(pings[pings.length - 1].recorded_at) : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {pings && pings.length > 0 ? fmtDate(pings[pings.length - 1].recorded_at) : ""}
          </div>
        </div>
      </div>

      {pings && pings.length > 0 && (
        <details className="premium-card p-3">
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
            Route Timestamps ({pings.length} points)
          </summary>
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
            {[...pings].reverse().slice(0, 100).map((p, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border/20 py-1">
                <span className="text-muted-foreground">{fmtTime(p.recorded_at)}</span>
                <span className="text-muted-foreground/60">
                  {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                  {p.speed != null && ` · ${(p.speed * 3.6).toFixed(1)} km/h`}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {marker && (
        <a
          href={`https://www.google.com/maps?q=${marker.lat},${marker.lng}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary underline"
        >
          <MapPin className="h-3 w-3" /> Open last location in Google Maps
        </a>
      )}
    </div>
  );
}
