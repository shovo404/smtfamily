import { useEffect, useRef, useState } from "react";
import { Camera, MapPin } from "lucide-react";
import { toast } from "sonner";

type PermissionState = "checking" | "needed" | "granted" | "denied" | "unsupported";

function hasCameraSupport() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * A browser can only show camera/location prompts from a user action.  This
 * gate appears immediately after sign-in and asks for both permissions in one
 * clear action, instead of waiting until an employee tries to check in.
 */
export function DevicePermissionGate() {
  const [camera, setCamera] = useState<PermissionState>("checking");
  const [location, setLocation] = useState<PermissionState>("checking");
  const [requesting, setRequesting] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    if (!hasCameraSupport()) setCamera("unsupported");
    else setCamera("needed");

    if (!navigator.geolocation) {
      setLocation("unsupported");
      return;
    }
    navigator.permissions?.query({ name: "geolocation" as PermissionName })
      .then((status) => setLocation(status.state === "granted" ? "granted" : status.state === "denied" ? "denied" : "needed"))
      .catch(() => setLocation("needed"));
  }, []);

  const requestPermissions = async () => {
    setRequesting(true);
    const cameraRequest = hasCameraSupport()
      ? navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
          .then((stream) => {
            stream.getTracks().forEach((track) => track.stop());
            setCamera("granted");
          })
          .catch(() => setCamera("denied"))
      : Promise.resolve();
    const locationRequest = navigator.geolocation
      ? new Promise<void>((resolve) => navigator.geolocation.getCurrentPosition(
          () => { setLocation("granted"); resolve(); },
          () => { setLocation("denied"); resolve(); },
          { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
        ))
      : Promise.resolve();
    await Promise.all([cameraRequest, locationRequest]);
    setRequesting(false);
    toast.success("Permission request completed");
  };

  const needsAction = camera === "needed" || camera === "denied" || location === "needed" || location === "denied";
  if (!needsAction || requesting) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4">
      <section className="premium-card w-full max-w-md p-6" aria-modal="true" role="dialog">
        <h2 className="text-lg font-semibold">Enable device access</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Camera is used for face attendance and location lets your administrator see your work location.
        </p>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /> Camera: {camera === "denied" ? "blocked — allow it in device settings" : "required"}</div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Location: {location === "denied" ? "blocked — allow it in device settings" : "required"}</div>
        </div>
        <button onClick={requestPermissions} className="mt-5 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
          Allow camera and location
        </button>
      </section>
    </div>
  );
}
