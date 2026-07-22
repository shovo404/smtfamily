import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { setRolePermission, setOfficeHours, setAppLogo } from "@/lib/admin-users.functions";
import {
  ALL_ROLES,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  type AppRole,
  type PermissionKey,
} from "@/hooks/use-current-user";
import { Shield, Clock, Image } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — SMT Family" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { me, allowed } = useAdminGuard();
  const qc = useQueryClient();
  const setPermFn = useServerFn(setRolePermission);
  const setHoursFn = useServerFn(setOfficeHours);

  const { data: hours } = useQuery({
    queryKey: ["office-hours"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "office_hours").maybeSingle();
      const v = (data?.value ?? {}) as { start?: string; end?: string };
      return { start: v.start ?? "09:00", end: v.end ?? "18:00" };
    },
  });

  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  useEffect(() => {
    if (hours) { setStart(hours.start); setEnd(hours.end); }
  }, [hours]);

  const saveHours = useMutation({
    mutationFn: async () => { await setHoursFn({ data: { start, end } }); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["office-hours"] });
      toast.success("Office hours updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const { data: rows } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("role_permissions").select("role, permission, enabled");
      if (error) throw error;
      return data ?? [];
    },
    enabled: allowed,
  });

  const toggle = useMutation({
    mutationFn: async (v: { role: AppRole; permission: PermissionKey; enabled: boolean }) => {
      await setPermFn({ data: v });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["role-permissions"] });
      qc.invalidateQueries({ queryKey: ["current-user"] });
      toast.success("Updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (!allowed || !me) return null;

  const canManageSettings = me.isAdmin || me.isHR;
  const canManagePerms = me.perms.managePermissions;

  const setLogoFn = useServerFn(setAppLogo);
  const logoFileRef = useRef<HTMLInputElement | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const { data: appLogo } = useQuery({
    queryKey: ["app-logo"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "app_logo").maybeSingle();
      const v = (data?.value ?? {}) as { url?: string };
      return v.url || null;
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !me) return;
    setLogoUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `app-logo/logo.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = await supabase.storage
        .from("profile-photos")
        .getPublicUrl(path);

      await setLogoFn({ data: { logoUrl: urlData.publicUrl } });
      qc.invalidateQueries({ queryKey: ["app-logo"] });
      toast.success("App logo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoUploading(false);
      if (logoFileRef.current) logoFileRef.current.value = "";
    }
  };

  if (!canManageSettings && !canManagePerms && !me.isAdmin) {
    return (
      <div className="premium-card p-6 text-center text-sm text-muted-foreground">
        You don't have permission to change settings.
      </div>
    );
  }

  const map = new Map<string, boolean>();
  for (const r of rows ?? []) map.set(`${r.role}:${r.permission}`, r.enabled);
  const isEnabled = (role: AppRole, perm: PermissionKey) => map.get(`${role}:${perm}`) ?? false;

  const editableRoles: AppRole[] = ALL_ROLES;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/20 text-primary">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Office hours & role permissions.</p>
        </div>
      </div>

      {canManageSettings && (
        <div className="premium-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Office Hours</h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Anyone checking in after the start time will be marked as late.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="mb-1 text-xs text-muted-foreground">Start</div>
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </label>
            <label className="text-sm">
              <div className="mb-1 text-xs text-muted-foreground">End</div>
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={() => saveHours.mutate()} disabled={saveHours.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {saveHours.isPending ? "Saving…" : "Save Office Hours"}
            </button>
          </div>
        </div>
      )}

      {me.isAdmin && (
        <div className="premium-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Image className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">App Logo</h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Change the app logo. Everyone will see the updated logo on the login page and app header.
          </p>
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-white p-2 shadow">
              {appLogo ? (
                <img src={appLogo} alt="App Logo" className="h-full w-full object-contain" />
              ) : (
                <Image className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <button
                type="button"
                onClick={() => logoFileRef.current?.click()}
                disabled={logoUploading}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {logoUploading ? "Uploading…" : appLogo ? "Change Logo" : "Upload Logo"}
              </button>
              <input
                ref={logoFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
          </div>
        </div>
      )}

      {!canManagePerms && (
        <p className="text-center text-xs text-muted-foreground">
          You don't have permission to edit role permissions.
        </p>
      )}


      {canManagePerms && (
      <div className="space-y-4">
        {editableRoles.map((role) => {
          const locked = role === "admin";
          return (
            <div key={role} className="premium-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-semibold uppercase tracking-wide">{role.replace("_", " ")}</div>
                {locked && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Always full access
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {PERMISSION_KEYS.map((perm) => {
                  const on = locked ? true : isEnabled(role, perm);
                  return (
                    <label
                      key={perm}
                      className={`flex cursor-pointer items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm ${
                        locked ? "opacity-60" : "hover:bg-accent/40"
                      }`}
                    >
                      <span>{PERMISSION_LABELS[perm]}</span>
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={locked || toggle.isPending}
                        onChange={(e) =>
                          toggle.mutate({ role, permission: perm, enabled: e.target.checked })
                        }
                        className="h-5 w-5 accent-primary"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Changes apply on next sign-in or page refresh for affected users.
      </p>
    </div>
  );
}
