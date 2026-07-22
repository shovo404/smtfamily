import { n as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { t as supabase } from "./client-DOjATiAz.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-current-user-DWDKqeGB.js
var PERMISSION_KEYS = [
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
	"managePermissions"
];
var PERMISSION_LABELS = {
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
	managePermissions: "Edit Permissions"
};
var ALL_ROLES = [
	"admin",
	"hr",
	"dhr",
	"sr",
	"fso"
];
function useCurrentUser() {
	return useQuery({
		queryKey: ["current-user"],
		queryFn: async () => {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return null;
			const [{ data: profile }, { data: roles }, { data: permRows }] = await Promise.all([
				supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
				supabase.from("user_roles").select("role").eq("user_id", user.id),
				supabase.from("role_permissions").select("role, permission, enabled")
			]);
			const roleSet = new Set((roles ?? []).map((r) => r.role));
			const isSuperAdmin = roleSet.has("super_admin");
			const isAdmin = isSuperAdmin || roleSet.has("admin");
			const isHR = roleSet.has("hr");
			const isDHR = roleSet.has("dhr");
			const isField = roleSet.has("sr") || roleSet.has("dsr") || roleSet.has("fso");
			const isStaff = isAdmin || isHR || isDHR;
			const perms = Object.fromEntries(PERMISSION_KEYS.map((k) => [k, false]));
			for (const row of permRows ?? []) {
				if (!roleSet.has(row.role)) continue;
				if (row.enabled && PERMISSION_KEYS.includes(row.permission)) perms[row.permission] = true;
			}
			if (isAdmin) for (const k of PERMISSION_KEYS) perms[k] = true;
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
				perms
			};
		}
	});
}
//#endregion
export { useCurrentUser as i, PERMISSION_KEYS as n, PERMISSION_LABELS as r, ALL_ROLES as t };
