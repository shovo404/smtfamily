import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import type { LiveMapProps, LiveMapMarker } from "./live-map";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function coloredDot(color: string, pulse?: boolean) {
  const pulseAnim = pulse
    ? `@keyframes pulse{0%{box-shadow:0 0 0 0 ${color}88}70%{box-shadow:0 0 0 12px ${color}00}100%{box-shadow:0 0 0 0 ${color}00}}`
    : "";
  const html = `<style>${pulseAnim}</style><div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 0 2px ${color}44, 0 2px 6px rgba(0,0,0,.4);animation:${pulse ? "pulse 2s infinite" : "none"}"></div>`;
  return L.divIcon({ html, className: "", iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -14] });
}

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) {
      map.setView([24.75, 90.4], 10);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(points, { padding: [50, 50], maxZoom: 15 });
    }
  }, [map, points]);
  return null;
}

export default function LiveMapInner({ center, marker, markers, path, height, fitToMarkers, markerMeta }: LiveMapProps & { markerMeta?: Map<string, Record<string, string>> }) {
  const allMarkers: LiveMapMarker[] = markers ?? (marker ? [marker] : []);
  const c = center ?? allMarkers[0] ?? path?.[path.length - 1] ?? { lat: 24.75, lng: 90.4 };
  const boundsPoints = useMemo(
    () => allMarkers.map((m) => [m.lat, m.lng] as [number, number]),
    [allMarkers],
  );

  const uniqueMarkers = useMemo(() => {
    const seen = new Set<string>();
    return allMarkers.filter((m) => {
      const key = m.id || `${m.lat}-${m.lng}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allMarkers]);

  return (
    <div className="overflow-hidden rounded-xl" style={{ height: height ?? 400 }}>
      <MapContainer
        center={[c.lat, c.lng]}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {path && path.length > 1 && (
          <Polyline
            positions={path.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: "#3b82f6", weight: 4, opacity: 0.7 }}
          />
        )}
        {uniqueMarkers.map((m) => {
          const meta = markerMeta?.get(m.id || "");
          const isLive = meta?.get("status") === "live";
          return (
            <Marker
              key={m.id || `${m.lat}-${m.lng}`}
              position={[m.lat, m.lng]}
              icon={m.color ? coloredDot(m.color, isLive) : defaultIcon}
            >
              <Popup>
                <div className="min-w-[180px] text-sm">
                  {meta ? (
                    <>
                      <div className="mb-1 font-semibold text-base">{meta.get("name") || "Employee"}</div>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {meta.has("employee_id") && <div>ID: {meta.get("employee_id")}</div>}
                        {meta.has("department") && <div>Dept: {meta.get("department")}</div>}
                        {meta.has("role") && <div>Role: {meta.get("role")}</div>}
                        {meta.has("status") && (
                          <div className={isLive ? "text-green-600 font-medium" : "text-red-500"}>
                            {isLive ? "● LIVE" : "○ OFFLINE"}
                          </div>
                        )}
                        {meta.has("updated") && <div>Updated: {meta.get("updated")}</div>}
                        <div className="text-[10px] text-muted-foreground/60">
                          {m.lat.toFixed(5)}, {m.lng.toFixed(5)}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="font-medium">{m.label || "Location"}</div>
                  )}
                  <a
                    href={`https://www.google.com/maps?q=${m.lat},${m.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-block text-[11px] text-blue-600 underline"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
        {fitToMarkers && <FitBounds points={boundsPoints} />}
      </MapContainer>
    </div>
  );
}