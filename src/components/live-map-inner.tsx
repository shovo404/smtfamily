import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import type { LiveMapProps, LiveMapMarker } from "./live-map";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function coloredDot(color: string) {
  const html = `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 0 2px ${color}55, 0 2px 6px rgba(0,0,0,.4)"></div>`;
  return L.divIcon({ html, className: "", iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -10] });
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
    }
  }, [map, points]);
  return null;
}

export default function LiveMapInner({ center, marker, markers, path, height, fitToMarkers }: LiveMapProps) {
  const all: LiveMapMarker[] = markers ?? (marker ? [marker] : []);
  const c = center ?? all[0] ?? path?.[path.length - 1] ?? { lat: 23.8103, lng: 90.4125 };
  const points = all.map((m) => [m.lat, m.lng] as [number, number]);
  return (
    <div className="overflow-hidden rounded-xl" style={{ height: height ?? 320 }}>
      <MapContainer
        center={[c.lat, c.lng]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {path && path.length > 1 && (
          <Polyline
            positions={path.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: "#22c55e", weight: 4 }}
          />
        )}
        {all.map((m, i) => (
          <Marker
            key={`${m.lat}-${m.lng}-${i}`}
            position={[m.lat, m.lng]}
            icon={m.color ? coloredDot(m.color) : defaultIcon}
          >
            {m.label && <Popup>{m.label}</Popup>}
          </Marker>
        ))}
        {center && !fitToMarkers && <Recenter lat={center.lat} lng={center.lng} />}
        {fitToMarkers && points.length > 0 && <FitBounds points={points} />}
      </MapContainer>
    </div>
  );
}
