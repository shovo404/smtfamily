import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "hr" | "dhr" | "sr" | "dsr" | "fso";
// Roles offered in the UI. super_admin and dsr are retained in the DB enum
// for backward compatibility but are no longer selectable in the app.

export const PERMISSION_KEYS = [
  "manageEmployees",
  "deleteEmployees",
  "changeRoles",
  "resetPasswords",
  "viewTasks",
  "manageTasks",
  "viewTA",
  "manageTA",
  "viewLiveTracking",
  "viewReports",
  "manageSettings",
  "managePermissions",
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  manageEmployees: "Manage Employees",
  deleteEmployees: "Delete Employees",
  changeRoles: "Change Roles",
  resetPasswords: "Reset Passwords",
  viewTasks: "View Tasks",
  manageTasks: "Manage Tasks",
  viewTA: "View TA",
  manageTA: "Approve TA",
  viewLiveTracking: "Live Tracking",
  viewReports: "View Reports",
  manageSettings: "Manage Settings",
  managePermissions: "Edit Permissions",
};

export const ALL_ROLES: AppRole[] = ["admin", "hr", "dhr", "sr", "fso"];

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const [{ data: profile }, { data: roles }, { data: permRows }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("role_permissions").select("role, permission, enabled"),
      ]);
      const roleSet = new Set((roles ?? []).map((r) => r.role as AppRole));
      const isSuperAdmin = roleSet.has("super_admin");
      const isAdmin = isSuperAdmin || roleSet.has("admin");
      const isHR = roleSet.has("hr");
      const isDHR = roleSet.has("dhr");
      const isField = roleSet.has("sr") || roleSet.has("dsr") || roleSet.has("fso");
      const isStaff = isAdmin || isHR || isDHR;

      // Merge DB perms across all roles the user holds (OR)
      const perms = Object.fromEntries(PERMISSION_KEYS.map((k) => [k, false])) as Record<PermissionKey, boolean>;
      for (const row of permRows ?? []) {
        if (!roleSet.has(row.role as AppRole)) continue;
        if (row.enabled && (PERMISSION_KEYS as readonly string[]).includes(row.permission)) {
          perms[row.permission as PermissionKey] = true;
        }
      }
      // Admin (or legacy super_admin) always has full access, regardless of DB rows
      if (isAdmin) {
        for (const k of PERMISSION_KEYS) perms[k] = true;
      }

      return {
        user,
        profile,
        roles: roleSet,
        isAdmin,
        isSuperAdmin,
        isHR,
        isDHR,
        isStaff,
        isField,
        isViewOnly: isDHR && !isAdmin && !isHR,
        perms,
      };
    },
  });
}
