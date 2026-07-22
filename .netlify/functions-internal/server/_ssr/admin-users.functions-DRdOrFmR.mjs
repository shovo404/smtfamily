import { c as createServerFn, i as TSS_SERVER_FUNCTION } from "./createServerFn-BFFE07zL.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BwdutfJC.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-users.functions-DRdOrFmR.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
async function assertCallerCanManage(context) {
	const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
	const { data: isHR } = await context.supabase.rpc("has_role", {
		_user_id: context.userId,
		_role: "hr"
	});
	if (!isAdmin && !isHR) throw new Error("Forbidden: admin or HR role required");
	return {
		isAdmin: !!isAdmin,
		isHR: !!isHR
	};
}
async function assertSuperAdmin(context) {
	const { data } = await context.supabase.rpc("has_role", {
		_user_id: context.userId,
		_role: "super_admin"
	});
	if (!data) throw new Error("Only Super Admin can perform this action");
}
async function isTargetSuperAdmin(context, targetId) {
	const { data } = await context.supabase.rpc("has_role", {
		_user_id: targetId,
		_role: "super_admin"
	});
	return !!data;
}
var createEmployee_createServerFn_handler = createServerRpc({
	id: "8757bbe901a1d29f9e40aaa02dde353444cb425bae02c89345ae159cd1033981",
	name: "createEmployee",
	filename: "src/lib/admin-users.functions.ts"
}, (opts) => createEmployee.__executeServer(opts));
var createEmployee = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(createEmployee_createServerFn_handler, async ({ data, context }) => {
	await assertCallerCanManage(context);
	if (data.role === "super_admin") await assertSuperAdmin(context);
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
		email: data.email,
		password: data.password,
		email_confirm: true,
		user_metadata: { full_name: data.full_name }
	});
	if (createErr || !created.user) throw new Error(createErr?.message || "Failed to create user");
	const userId = created.user.id;
	await supabaseAdmin.from("profiles").update({
		phone: data.phone ?? null,
		department: data.department ?? null
	}).eq("id", userId);
	await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
	const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
		user_id: userId,
		role: data.role
	});
	if (roleErr) throw new Error(roleErr.message);
	return {
		ok: true,
		userId
	};
});
var resetEmployeePassword_createServerFn_handler = createServerRpc({
	id: "7ed5504d7e2dffcb8bcb346a9b34e7a7054df075fd1a56ff39adb5bcecbbd359",
	name: "resetEmployeePassword",
	filename: "src/lib/admin-users.functions.ts"
}, (opts) => resetEmployeePassword.__executeServer(opts));
var resetEmployeePassword = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(resetEmployeePassword_createServerFn_handler, async ({ data, context }) => {
	await assertCallerCanManage(context);
	if (data.newPassword.length < 6) throw new Error("Password must be at least 6 characters");
	if (await isTargetSuperAdmin(context, data.userId)) await assertSuperAdmin(context);
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.newPassword });
	if (error) throw new Error(error.message);
	return { ok: true };
});
var deleteEmployee_createServerFn_handler = createServerRpc({
	id: "c19365df3a1d7e5af208c43ca41e36a2893f83252ed3adbf2c0f22f89ea08a10",
	name: "deleteEmployee",
	filename: "src/lib/admin-users.functions.ts"
}, (opts) => deleteEmployee.__executeServer(opts));
var deleteEmployee = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(deleteEmployee_createServerFn_handler, async ({ data, context }) => {
	const { isAdmin } = await assertCallerCanManage(context);
	if (!isAdmin) throw new Error("Only Admin or Super Admin can delete employees");
	if (data.userId === context.userId) throw new Error("You cannot delete yourself");
	if (await isTargetSuperAdmin(context, data.userId)) await assertSuperAdmin(context);
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
	if (error) throw new Error(error.message);
	return { ok: true };
});
var changeEmployeeRole_createServerFn_handler = createServerRpc({
	id: "d10fd83f59933f31e9d0e48414ea85eb9b86bc5d8e060ebf3fc3064012a15656",
	name: "changeEmployeeRole",
	filename: "src/lib/admin-users.functions.ts"
}, (opts) => changeEmployeeRole.__executeServer(opts));
var changeEmployeeRole = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(changeEmployeeRole_createServerFn_handler, async ({ data, context }) => {
	const { isAdmin } = await assertCallerCanManage(context);
	if (!isAdmin) throw new Error("Only Admin or Super Admin can change roles");
	if (data.role === "super_admin") await assertSuperAdmin(context);
	if (await isTargetSuperAdmin(context, data.userId)) await assertSuperAdmin(context);
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
	const { error } = await supabaseAdmin.from("user_roles").insert({
		user_id: data.userId,
		role: data.role
	});
	if (error) throw new Error(error.message);
	return { ok: true };
});
var setRolePermission_createServerFn_handler = createServerRpc({
	id: "75264e8099629e93cc3e433cfb6f38c9c198efb0e6c2352b31380db17d7a3c1a",
	name: "setRolePermission",
	filename: "src/lib/admin-users.functions.ts"
}, (opts) => setRolePermission.__executeServer(opts));
var setRolePermission = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(setRolePermission_createServerFn_handler, async ({ data, context }) => {
	const { isAdmin } = await assertCallerCanManage(context);
	if (!isAdmin) throw new Error("Only Admin or Super Admin can edit permissions");
	if (data.role === "super_admin") await assertSuperAdmin(context);
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { error } = await supabaseAdmin.from("role_permissions").upsert({
		role: data.role,
		permission: data.permission,
		enabled: data.enabled,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}, { onConflict: "role,permission" });
	if (error) throw new Error(error.message);
	return { ok: true };
});
var setOfficeHours_createServerFn_handler = createServerRpc({
	id: "96f44512048d10cabe3291bd49cf63685dc97358542bf7bfdf3d26bc5c95d45b",
	name: "setOfficeHours",
	filename: "src/lib/admin-users.functions.ts"
}, (opts) => setOfficeHours.__executeServer(opts));
var setOfficeHours = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(setOfficeHours_createServerFn_handler, async ({ data, context }) => {
	await assertCallerCanManage(context);
	if (!/^\d{2}:\d{2}$/.test(data.start) || !/^\d{2}:\d{2}$/.test(data.end)) throw new Error("Invalid time format (HH:MM)");
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { error } = await supabaseAdmin.from("app_settings").upsert({
		key: "office_hours",
		value: {
			start: data.start,
			end: data.end
		},
		updated_at: (/* @__PURE__ */ new Date()).toISOString(),
		updated_by: context.userId
	}, { onConflict: "key" });
	if (error) throw new Error(error.message);
	return { ok: true };
});
var setAppLogo_createServerFn_handler = createServerRpc({
	id: "33774db39beb46706b02f5751ccd636c3c0d300de81dbefb8f294f72aa9b9088",
	name: "setAppLogo",
	filename: "src/lib/admin-users.functions.ts"
}, (opts) => setAppLogo.__executeServer(opts));
var setAppLogo = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(setAppLogo_createServerFn_handler, async ({ data, context }) => {
	const { isAdmin } = await assertCallerCanManage(context);
	if (!isAdmin) throw new Error("Only Admin can change the app logo");
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { error } = await supabaseAdmin.from("app_settings").upsert({
		key: "app_logo",
		value: { url: data.logoUrl },
		updated_at: (/* @__PURE__ */ new Date()).toISOString(),
		updated_by: context.userId
	}, { onConflict: "key" });
	if (error) throw new Error(error.message);
	return { ok: true };
});
var resetUserMonthAttendance_createServerFn_handler = createServerRpc({
	id: "4e1b5dd8c1a7d60f3a4854e6ae22e6481f3844397414ce86b757c8d9e834b26e",
	name: "resetUserMonthAttendance",
	filename: "src/lib/admin-users.functions.ts"
}, (opts) => resetUserMonthAttendance.__executeServer(opts));
var resetUserMonthAttendance = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(resetUserMonthAttendance_createServerFn_handler, async ({ data, context }) => {
	const { isAdmin } = await assertCallerCanManage(context);
	if (!isAdmin) throw new Error("Only Admin can reset attendance");
	if (!/^\d{4}-\d{2}$/.test(data.month)) throw new Error("Invalid month (YYYY-MM)");
	const [y, m] = data.month.split("-").map(Number);
	const start = `${data.month}-01`;
	const endDate = new Date(y, m, 0).getDate();
	const end = `${data.month}-${String(endDate).padStart(2, "0")}`;
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { error } = await supabaseAdmin.from("attendance").delete().eq("user_id", data.userId).gte("work_date", start).lte("work_date", end);
	if (error) throw new Error(error.message);
	return { ok: true };
});
var updateAttendanceTimes_createServerFn_handler = createServerRpc({
	id: "3ddd4d0c524397c704a3f23ff612fc360b59c45f58e94df935f3c0df2e5cef0c",
	name: "updateAttendanceTimes",
	filename: "src/lib/admin-users.functions.ts"
}, (opts) => updateAttendanceTimes.__executeServer(opts));
var updateAttendanceTimes = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(updateAttendanceTimes_createServerFn_handler, async ({ data, context }) => {
	const { isAdmin } = await assertCallerCanManage(context);
	if (!isAdmin) throw new Error("Only Admin or Super Admin can edit attendance");
	const patch = {};
	if (data.check_in !== void 0) patch.check_in = data.check_in;
	if (data.check_out !== void 0) patch.check_out = data.check_out;
	if (Object.keys(patch).length === 0) return { ok: true };
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { error } = await supabaseAdmin.from("attendance").update(patch).eq("id", data.attendanceId);
	if (error) throw new Error(error.message);
	return { ok: true };
});
var updateEmployeeProfile_createServerFn_handler = createServerRpc({
	id: "53350f1124921d87f7d150fbebc8b18503076e6b05c8627494051ca8153be3db",
	name: "updateEmployeeProfile",
	filename: "src/lib/admin-users.functions.ts"
}, (opts) => updateEmployeeProfile.__executeServer(opts));
var updateEmployeeProfile = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(updateEmployeeProfile_createServerFn_handler, async ({ data, context }) => {
	await assertCallerCanManage(context);
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { error } = await supabaseAdmin.from("profiles").update({
		full_name: data.full_name,
		phone: data.phone ?? null,
		department: data.department ?? null,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", data.userId);
	if (error) throw new Error(error.message);
	return { ok: true };
});
var updateOwnProfilePhoto_createServerFn_handler = createServerRpc({
	id: "5da2cd1d0c0c1c029e4c3aa3f3df006ea4d67d9c6458f08bf8634ca52523c724",
	name: "updateOwnProfilePhoto",
	filename: "src/lib/admin-users.functions.ts"
}, (opts) => updateOwnProfilePhoto.__executeServer(opts));
var updateOwnProfilePhoto = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(updateOwnProfilePhoto_createServerFn_handler, async ({ data, context }) => {
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { error } = await supabaseAdmin.from("profiles").update({
		photo_url: data.photoUrl,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", context.userId);
	if (error) throw new Error(error.message);
	return { ok: true };
});
//#endregion
export { changeEmployeeRole_createServerFn_handler, createEmployee_createServerFn_handler, deleteEmployee_createServerFn_handler, resetEmployeePassword_createServerFn_handler, resetUserMonthAttendance_createServerFn_handler, setAppLogo_createServerFn_handler, setOfficeHours_createServerFn_handler, setRolePermission_createServerFn_handler, updateAttendanceTimes_createServerFn_handler, updateEmployeeProfile_createServerFn_handler, updateOwnProfilePhoto_createServerFn_handler };
