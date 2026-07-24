import { useQuery } from "@tanstack/react-query";
import { firebase } from "@/lib/firebase-client";

export type AppRole = "super_admin" | "admin" | "hr" | "dhr" | "sr" | "dsr" | "fso";
export const ALL_ROLES: AppRole[] = ["super_admin", "admin", "hr", "dhr", "sr", "dsr", "fso"];

export const PERMISSION_KEYS = [
  "manageEmployees", "deleteEmployees", "changeRoles", "resetPasswords",
  "viewTasks", "manageTasks", "viewTA", "manageTA", "viewLiveTracking",
  "viewReports", "manageSettings", "managePermissions",
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  manageEmployees: "Manage Employees", deleteEmployees: "Delete Employees", changeRoles: "Change Roles",
  resetPasswords: "Reset Passwords", viewTasks: "View Tasks", manageTasks: "Manage Tasks",
  viewTA: "View TA", manageTA: "Approve TA", viewLiveTracking: "Live Tracking",
  viewReports: "View Reports", manageSettings: "Manage Settings", managePermissions: "Edit Permissions",
};

const DEFAULT_PERMISSIONS: Record<AppRole, PermissionKey[]> = {
  super_admin: [...PERMISSION_KEYS],
  admin: [...PERMISSION_KEYS],
  hr: ["manageEmployees", "viewTasks", "manageTasks", "viewTA", "manageTA", "viewReports", "viewLiveTracking"],
  dhr: ["viewReports", "viewLiveTracking"],
  sr: ["viewTasks", "manageTasks", "viewLiveTracking"],
  dsr: ["viewTasks", "manageTasks", "viewLiveTracking"],
  fso: ["viewTasks", "manageTasks", "viewLiveTracking"],
};

function getRoleHome(role: AppRole): string {
  if (role === "super_admin" || role === "admin" || role === "hr") return "/dashboard";
  return "/attendance";
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: authData, error: authError } = await firebase.auth.getUser();
      if (authError || !authData.user) return null;
      const user = authData.user;
      const { data: profile, error } = await firebase.from("users").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      if (!profile) return null;
      const role = (profile.role ?? "fso") as AppRole;

      const { data: permRows } = await firebase
        .from("role_permissions")
        .select("role, permission, enabled")
        .eq("role", role);
      const dbPerms = new Set(
        (permRows ?? []).filter((r: any) => r.enabled).map((r: any) => r.permission)
      );

      const perms = Object.fromEntries(
        PERMISSION_KEYS.map((key) => {
          const dbValue = dbPerms.has(key);
          const defaultValue = DEFAULT_PERMISSIONS[role]?.includes(key) ?? false;
          return [key, dbPerms.size > 0 ? dbValue : defaultValue];
        })
      ) as Record<PermissionKey, boolean>;

      const isSuperAdmin = role === "super_admin";
      const isAdmin = isSuperAdmin || role === "admin";
      const isHR = role === "hr";
      const isDHR = role === "dhr";
      const isField = role === "sr" || role === "dsr" || role === "fso";

      return {
        user,
        profile,
        roles: new Set([role]),
        role,
        isSuperAdmin,
        isAdmin,
        isHR,
        isDHR,
        isStaff: isAdmin || isHR || isDHR,
        isField,
        isViewOnly: isDHR && !isAdmin && !isHR,
        perms,
        roleHome: getRoleHome(role),
      };
    },
  });
}
