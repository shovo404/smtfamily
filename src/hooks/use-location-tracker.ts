import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { firebase } from "@/lib/firebase-client";
import { useCurrentUser } from "@/hooks/use-current-user";

const MIN_INSERT_INTERVAL_MS = 30_000; // insert a ping every ~30s max
const MIN_MOVE_METERS = 15; // or when moved >15m

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

export function useLocationTracker() {
  const { data: me } = useCurrentUser();
  const watchId = useRef<number | null>(null);
  const lastInsert = useRef<{ t: number; lat: number; lng: number } | null>(null);
  const lastKnown = useRef<{ lat: number; lng: number; acc: number | null; at: string } | null>(null);
  const notifiedOff = useRef(false);

  // Only track field employees (SO, FI) — not admins/HR/staff
  const isFieldRole = me?.roles.has("so") || me?.roles.has("fi");
  const shouldTrack = !!(me && isFieldRole);
  const userId = me?.user.id;
  const fullName = me?.profile?.full_name ?? me?.user.email ?? "Unknown user";
  const roleLabel = me?.roles.has("so")
    ? "SO"
    : me?.roles.has("fi")
    ? "FI"
    : "Field";

  useEffect(() => {
    if (!shouldTrack || !userId) return;
    if (typeof window === "undefined" || !navigator.geolocation) return;

    // Prime last-known from server so first-open denials still carry coords
    void firebase
      .from("employee_locations")
      .select("latitude, longitude, accuracy, updated_at")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data && (Number(data.latitude) || Number(data.longitude))) {
          lastKnown.current = {
            lat: Number(data.latitude),
            lng: Number(data.longitude),
            acc: (data.accuracy as number | null) ?? null,
            at: data.updated_at ?? new Date().toISOString(),
          };
        }
      });

    const notifyOff = async (reason: string) => {
      if (notifiedOff.current) return;
      notifiedOff.current = true;
      const lk = lastKnown.current;
      try {
        // Flip duty off but PRESERVE last known coords (do not overwrite with 0,0)
        if (lk) {
          await firebase.from("employee_locations").upsert({
            user_id: userId,
            latitude: lk.lat,
            longitude: lk.lng,
            accuracy: lk.acc,
            duty_on: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
        } else {
          await firebase.from("employee_locations").upsert({
            user_id: userId,
            latitude: 0,
            longitude: 0,
            duty_on: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
        }

        const coordText = lk
          ? ` • last @ ${lk.lat.toFixed(5)}, ${lk.lng.toFixed(5)}`
          : " • no last known location";
        await firebase.from("notifications").insert({
          type: "location_off",
          title: `${roleLabel} location OFF — ${fullName}`,
          message: `${reason}${coordText}`,
          actor_user_id: userId,
          meta: {
            at: new Date().toISOString(),
            reason,
            role: roleLabel,
            name: fullName,
            last_known: lk
              ? {
                  latitude: lk.lat,
                  longitude: lk.lng,
                  accuracy: lk.acc,
                  at: lk.at,
                  maps_url: `https://www.google.com/maps?q=${lk.lat},${lk.lng}`,
                }
              : null,
          },
        });
      } catch (e) {
        console.error("notifyOff failed", e);
      }
    };

    const onPos = async (pos: GeolocationPosition) => {
      notifiedOff.current = false;
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = pos.coords.accuracy ?? null;
      const speed = pos.coords.speed ?? null;
      const heading = pos.coords.heading ?? null;
      const now = Date.now();
      const iso = new Date().toISOString();
      lastKnown.current = { lat, lng, acc, at: iso };

      // Always update current position (upsert)
      const { error: locationError } = await firebase.from("employee_locations").upsert({
        user_id: userId,
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        speed,
        duty_on: true,
        updated_at: iso,
      }, { onConflict: "user_id" });
      if (locationError) {
        console.error("Unable to save live location", locationError.message);
        return;
      }

      // Throttle history inserts
      const last = lastInsert.current;
      const moved = last ? distanceMeters({ lat: last.lat, lng: last.lng }, { lat, lng }) : Infinity;
      if (!last || now - last.t >= MIN_INSERT_INTERVAL_MS || moved >= MIN_MOVE_METERS) {
        lastInsert.current = { t: now, lat, lng };
        await firebase.from("location_pings").insert({
          user_id: userId,
          latitude: lat,
          longitude: lng,
          accuracy: acc,
          speed,
          heading,
        });
      }
    };

    const onErr = (err: GeolocationPositionError) => {
      const reason =
        err.code === err.PERMISSION_DENIED
          ? "User denied location permission"
          : err.code === err.POSITION_UNAVAILABLE
          ? "GPS/position unavailable"
          : err.code === err.TIMEOUT
          ? "Location request timed out"
          : "Unknown location error";
      toast.error(`Location: ${reason}`);
      void notifyOff(reason);
    };

    watchId.current = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 10_000,
      timeout: 20_000,
    });

    // Detect permission revoke via Permissions API
    let permStatus: PermissionStatus | null = null;
    const onPermChange = () => {
      if (permStatus?.state === "denied") {
        void notifyOff("Location permission revoked");
      }
    };
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((s) => {
          permStatus = s;
          if (s.state === "denied") {
            void notifyOff("Location permission is denied");
          }
          s.addEventListener("change", onPermChange);
        })
        .catch(() => {});
    }

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      permStatus?.removeEventListener("change", onPermChange);
    };
  }, [shouldTrack, userId, fullName, roleLabel]);
}
