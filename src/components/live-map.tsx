import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";

const Inner = lazy(() => import("./live-map-inner"));

export type LiveMapPoint = { lat: number; lng: number };
export type LiveMapMarker = LiveMapPoint & { label?: string; color?: string };
export type LiveMapProps = {
  center?: LiveMapPoint;
  marker?: LiveMapMarker;
  markers?: LiveMapMarker[];
  path?: LiveMapPoint[];
  height?: number;
  fitToMarkers?: boolean;
};

export function LiveMap(props: LiveMapProps) {
  return (
    <ClientOnly
      fallback={
        <div
          className="grid place-items-center rounded-xl bg-accent/40 text-xs text-muted-foreground"
          style={{ height: props.height ?? 320 }}
        >
          Loading map…
        </div>
      }
    >
      <Suspense
        fallback={
          <div
            className="grid place-items-center rounded-xl bg-accent/40 text-xs text-muted-foreground"
            style={{ height: props.height ?? 320 }}
          >
            Loading map…
          </div>
        }
      >
        <Inner {...props} />
      </Suspense>
    </ClientOnly>
  );
}
