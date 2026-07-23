import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { firebase } from "@/lib/firebase-client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { updateAttendanceTimes, resetUserMonthAttendance } from "@/lib/admin-users.functions";
import { LogIn, LogOut, MapPin, Camera, X, Pencil, Clock, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({ meta: [{ title: "Attendance — SMT Family" }] }),
  component: AttendancePage,
});

function todayStr() { return new Date().toISOString().slice(0, 10); }

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

function getGPS(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

function FaceCaptureModal({
  title,
  onCancel,
  onCapture,
}: {
  title: string;
  onCancel: () => void;
  onCapture: (blob: Blob) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Camera unavailable");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const snap = async () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => { if (blob) onCapture(blob); }, "image/jpeg", 0.85);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="premium-card w-full max-w-md p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onCancel} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 aspect-[4/3] w-full overflow-hidden rounded-md bg-black">
          {err ? (
            <div className="grid h-full place-items-center p-4 text-center text-sm text-destructive">{err}</div>
          ) : (
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
          <button disabled={!ready || !!err} onClick={snap}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            <Camera className="h-4 w-4" />Capture
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Look at the camera. The photo is stored privately as attendance proof.
        </p>
      </div>
    </div>
  );
}

function AttendancePage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [captureMode, setCaptureMode] = useState<"in" | "out" | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; check_in: string | null; check_out: string | null } | null>(null);
  const updateAttFn = useServerFn(updateAttendanceTimes);
  const resetAttFn = useServerFn(resetUserMonthAttendance);

  const handleReset = async (userId: string, name: string) => {
    const d = new Date();
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!confirm(`Reset all attendance for ${name} in ${month}? This clears the month so they can check-in again today.`)) return;
    try {
      await resetAttFn({ data: { userId, month } });
      toast.success("Attendance reset");
      qc.invalidateQueries({ queryKey: ["attendance-admin"] });
      qc.invalidateQueries({ queryKey: ["attendance-today"] });
      qc.invalidateQueries({ queryKey: ["attendance-mine"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const { data: hours } = useQuery({
    queryKey: ["office-hours"],
    queryFn: async () => {
      const { data, error } = await firebase.from("app_settings").select("value").eq("key", "office_hours").maybeSingle();
      if (error) {
        console.warn("Office hours query error:", error.message);
        return { start: "09:00", end: "18:00" };
      }
      const v = (data?.value ?? {}) as { start?: string; end?: string };
      return { start: v.start ?? "09:00", end: v.end ?? "18:00" };
    },
  });
  const officeStart = hours?.start ?? "09:00";
  const officeEnd = hours?.end ?? "18:00";

  const { data: today } = useQuery({
    queryKey: ["attendance-today", me?.user.id],
    queryFn: async () => {
      const { data, error } = await firebase.from("attendance").select("*").eq("user_id", me!.user.id).eq("work_date", todayStr()).maybeSingle();
      if (error) {
        console.warn("Today attendance query error:", error.message);
        return null;
      }
      return data;
    },
    enabled: !!me,
  });

  const monthStart = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  })();
  const { data: history } = useQuery({
    queryKey: ["attendance-mine", me?.user.id, monthStart],
    queryFn: async () => {
      const { data, error } = await firebase
        .from("attendance")
        .select("*")
        .eq("user_id", me!.user.id)
        .gte("work_date", monthStart);
      if (error) {
        console.warn("Attendance history query error:", error.message);
        return [];
      }
      return (data ?? []).sort((a: any, b: any) => (b.work_date || "").localeCompare(a.work_date || ""));
    },
    enabled: !!me,
  });

  const monthSummary = (() => {
    const rows = history ?? [];
    let present = 0, late = 0, totalHrs = 0;
    for (const a of rows) {
      if (a.check_in) {
        present++;
        if (lateMinutes(a.check_in, a.work_date, officeStart) > 0) late++;
        if (a.check_out) totalHrs += (new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 3600000;
      }
    }
    return { present, late, totalHrs };
  })();

  const { data: adminList } = useQuery({
    queryKey: ["attendance-admin", todayStr()],
    queryFn: async () => {
      const { data, error } = await firebase.from("attendance").select("*").eq("work_date", todayStr());
      if (error) {
        console.warn("Admin attendance query error:", error.message);
        return [];
      }
      const sorted = (data ?? []).sort((a: any, b: any) => ((b.check_in || "") < (a.check_in || "") ? -1 : 1));
      const ids = [...new Set(sorted.map((a: any) => a.user_id))];
      const { data: profiles } = await firebase.from("profiles").select("id, full_name, email").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const map = new Map(profiles?.map((p: any) => [p.id, p]) ?? []);
      return sorted.map((a: any) => ({ ...a, profile: map.get(a.user_id) }));
    },
    enabled: !!me?.isAdmin,
  });

  const saveEdit = async (check_in: string | null, check_out: string | null) => {
    if (!editing) return;
    try {
      await updateAttFn({ data: {
        attendanceId: editing.id,
        check_in: check_in ? new Date(check_in).toISOString() : null,
        check_out: check_out ? new Date(check_out).toISOString() : null,
      }});
      toast.success("Attendance updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["attendance-admin"] });
      qc.invalidateQueries({ queryKey: ["attendance-today"] });
      qc.invalidateQueries({ queryKey: ["attendance-mine"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const uploadPhoto = async (blob: Blob, kind: "in" | "out"): Promise<string> => {
    const path = `${me!.user.id}/${todayStr()}-${kind}-${Date.now()}.jpg`;
    const { error } = await firebase.storage.from("attendance-faces").upload(path, blob, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (error) throw error;
    return path;
  };

  const handleCapture = async (blob: Blob) => {
    if (!me || !captureMode) return;
    const kind = captureMode;
    setCaptureMode(null);
    setBusy(true);
    try {
      const [photoPath, gps] = await Promise.all([uploadPhoto(blob, kind), getGPS()]);
      const now = new Date().toISOString();
      const todayStrLocal = todayStr();
      if (kind === "in") {
        const { error } = await firebase.from("attendance").upsert({
          user_id: me.user.id,
          work_date: todayStrLocal,
          check_in: now,
          check_in_lat: gps?.lat ?? null,
          check_in_lng: gps?.lng ?? null,
          check_in_photo_url: photoPath,
          check_in_face_verified: true,
        }, { onConflict: "user_id,work_date" });
        if (error) throw error;
        toast.success("Checked in");
      } else {
        const { error } = await firebase.from("attendance").update({
          check_out: now,
          check_out_lat: gps?.lat ?? null,
          check_out_lng: gps?.lng ?? null,
          check_out_photo_url: photoPath,
          check_out_face_verified: true,
        }).eq("user_id", me.user.id).eq("work_date", todayStrLocal);
        if (error) throw error;
        toast.success("Checked out");
      }
      qc.invalidateQueries({ queryKey: ["attendance-today"] });
      qc.invalidateQueries({ queryKey: ["attendance-mine"] });
      qc.invalidateQueries({ queryKey: ["attendance-admin"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        {!me?.isAdmin && (
          <>
            <p className="text-sm text-muted-foreground">Face + GPS verified check-in / check-out for today.</p>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" /> Office hours: {officeStart} – {officeEnd}
            </div>
          </>
        )}
      </div>

      {!me?.isAdmin && (
        <div className="premium-card p-6 space-y-5">
          <div className="grid gap-4 grid-cols-2">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Check In</div>
              <div className="mt-1 text-lg font-semibold">{today?.check_in ? new Date(today.check_in).toLocaleTimeString() : "—"}</div>
              {today?.check_in_face_verified && <div className="text-[10px] text-primary">Face verified</div>}
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Check Out</div>
              <div className="mt-1 text-lg font-semibold">{today?.check_out ? new Date(today.check_out).toLocaleTimeString() : "—"}</div>
              {today?.check_out_face_verified && <div className="text-[10px] text-primary">Face verified</div>}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => setCaptureMode("in")} disabled={!!today?.check_in || busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
              <LogIn className="h-4 w-4" />Face Check In
            </button>
            <button onClick={() => setCaptureMode("out")} disabled={!today?.check_in || !!today?.check_out || busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-40">
              <LogOut className="h-4 w-4" />Face Check Out
            </button>
          </div>
        </div>
      )}

      {!me?.isAdmin && today && (
        <div className="premium-card p-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Today's Summary</div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-[10px] text-muted-foreground">Check In</div>
              <div className="font-semibold">{today.check_in ? new Date(today.check_in).toLocaleTimeString() : "—"}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Check Out</div>
              <div className="font-semibold">{today.check_out ? new Date(today.check_out).toLocaleTimeString() : "—"}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Status</div>
              {(() => {
                const lm = lateMinutes(today.check_in, today.work_date, officeStart);
                return (
                  <div className={`font-semibold ${lm > 0 ? "text-yellow-400" : "text-primary"}`}>
                    {today.check_in ? fmtMins(lm) : "—"}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {!me?.isAdmin && (
      <div className="premium-card overflow-hidden">
        <div className="border-b border-border/40 px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold">This Month's Attendance</h2>
          <span className="text-[11px] text-muted-foreground">
            {new Date().toLocaleString(undefined, { month: "long", year: "numeric" })}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 border-b border-border/40 px-4 py-3 text-center">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Present</div>
            <div className="text-lg font-semibold text-primary">{monthSummary.present}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Late</div>
            <div className="text-lg font-semibold text-yellow-400">{monthSummary.late}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Total Hrs</div>
            <div className="text-lg font-semibold">{monthSummary.totalHrs.toFixed(1)}</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Check In</th>
                <th className="px-4 py-3 font-medium">Check Out</th>
                <th className="px-4 py-3 font-medium">Hours</th>
                <th className="px-4 py-3 font-medium">Late</th>
              </tr>
            </thead>
            <tbody>
              {(history ?? []).map((a: any) => {
                const hours = a.check_in && a.check_out
                  ? ((new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 3600000).toFixed(1)
                  : "—";
                const lm = lateMinutes(a.check_in, a.work_date, officeStart);
                return (
                  <tr key={a.id} className="border-t border-border/40">
                    <td className="px-4 py-3 font-medium">{new Date(a.work_date).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.check_in ? new Date(a.check_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.check_out ? new Date(a.check_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{hours}</td>
                    <td className={`px-4 py-3 text-xs ${lm > 0 ? "text-yellow-400" : "text-muted-foreground"}`}>
                      {a.check_in ? fmtMins(lm) : "—"}
                    </td>
                  </tr>
                );
              })}
              {(history ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No records this month yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}



      {me?.isAdmin && (
        <div className="premium-card overflow-hidden">
          <div className="border-b border-border/40 px-4 py-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Today's Attendance (All Employees)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Check In</th>
                  <th className="px-4 py-3 font-medium">Check Out</th>
                  <th className="px-4 py-3 font-medium">Hours</th>
                  <th className="px-4 py-3 font-medium">Late</th>
                  <th className="px-4 py-3 font-medium">GPS</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(adminList ?? []).map((a: any) => {
                  const hours = a.check_in && a.check_out
                    ? ((new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 3600000).toFixed(1)
                    : "—";
                  const lm = lateMinutes(a.check_in, a.work_date, officeStart);
                  return (
                    <tr key={a.id} className="border-t border-border/40">
                      <td className="px-4 py-3 font-medium">{a.profile?.full_name || a.profile?.email || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.check_in ? new Date(a.check_in).toLocaleTimeString() : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.check_out ? new Date(a.check_out).toLocaleTimeString() : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{hours}</td>
                      <td className="px-4 py-3 text-xs">
                        {a.check_in ? (
                          lm > 0
                            ? <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 font-semibold text-yellow-300">{fmtMins(lm)}</span>
                            : <span className="text-primary">On time</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {a.check_in_lat != null ? `${a.check_in_lat.toFixed(3)}, ${a.check_in_lng?.toFixed(3)}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditing({
                              id: a.id,
                              name: a.profile?.full_name || a.profile?.email || "Employee",
                              check_in: a.check_in,
                              check_out: a.check_out,
                            })}
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent">
                            <Pencil className="h-3 w-3" />Edit
                          </button>
                          <button
                            onClick={() => handleReset(a.user_id, a.profile?.full_name || a.profile?.email || "Employee")}
                            className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">
                            <RotateCcw className="h-3 w-3" />Reset
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(adminList ?? []).length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No attendance today.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border/40 px-4 py-2 text-[11px] text-muted-foreground">
            Face photos are stored privately and are not displayed here per policy.
          </div>
        </div>
      )}

      {captureMode && (
        <FaceCaptureModal
          title={captureMode === "in" ? "Face Check-In" : "Face Check-Out"}
          onCancel={() => setCaptureMode(null)}
          onCapture={handleCapture}
        />
      )}

      {editing && (
        <EditAttendanceModal
          record={editing}
          onCancel={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  );
}

function EditAttendanceModal({
  record,
  onCancel,
  onSave,
}: {
  record: { id: string; name: string; check_in: string | null; check_out: string | null };
  onCancel: () => void;
  onSave: (check_in: string | null, check_out: string | null) => void;
}) {
  const [ci, setCi] = useState(toLocalInput(record.check_in));
  const [co, setCo] = useState(toLocalInput(record.check_out));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="premium-card w-full max-w-md p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Edit Attendance — {record.name}</h3>
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
        <p className="mt-3 text-[11px] text-muted-foreground">
          Times are in your local timezone. Late status will be recalculated automatically.
        </p>
      </div>
    </div>
  );
}
