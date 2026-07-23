import { createServerFn } from "@tanstack/react-start";
import { requireFirebaseAuth } from "@/lib/firebase-auth-middleware";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type AppRole = "super_admin" | "admin" | "hr" | "dhr" | "sr" | "fso" | "dsr";
type Context = { userId: string; role: AppRole };
const isAdmin = (c: Context) => c.role === "admin" || c.role === "super_admin";
const canManage = (c: Context) => isAdmin(c) || c.role === "hr";
function requireManager(c: Context) { if (!canManage(c)) throw new Error("Forbidden: admin or HR role required"); }
function requireAdmin(c: Context) { if (!isAdmin(c)) throw new Error("Forbidden: admin role required"); }
function requireSuperAdmin(c: Context) { if (c.role !== "super_admin") throw new Error("Only Super Admin can perform this action"); }
async function targetIsSuperAdmin(userId: string) {
  const { data } = await getSupabaseAdmin().from("users").select("role").eq("id", userId).maybeSingle();
  return data?.role === "super_admin";
}
function fail(error: { message: string } | null) { if (error) throw new Error(error.message); }

export const createEmployee = createServerFn({ method: "POST" }).middleware([requireFirebaseAuth]).inputValidator((input: { email: string; password: string; full_name: string; phone?: string; department?: string; role: AppRole }) => input).handler(async ({ data, context }) => {
  requireManager(context); if (data.role === "super_admin") requireSuperAdmin(context);
  const admin = getSupabaseAdmin();
  const { data: created, error } = await admin.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true, user_metadata: { full_name: data.full_name } });
  fail(error); if (!created.user) throw new Error("Could not create user");
  fail((await admin.from("users").update({ full_name: data.full_name, email: data.email, role: data.role, phone: data.phone ?? null, department: data.department ?? null, is_active: true, updated_at: new Date().toISOString() }).eq("id", created.user.id)).error);
  return { ok: true, userId: created.user.id };
});
export const resetEmployeePassword = createServerFn({ method: "POST" }).middleware([requireFirebaseAuth]).inputValidator((input: { userId: string; newPassword: string }) => input).handler(async ({ data, context }) => {
  requireManager(context); if (data.newPassword.length < 6) throw new Error("Password must be at least 6 characters"); if (await targetIsSuperAdmin(data.userId)) requireSuperAdmin(context);
  fail((await getSupabaseAdmin().auth.admin.updateUserById(data.userId, { password: data.newPassword })).error); return { ok: true };
});
export const deleteEmployee = createServerFn({ method: "POST" }).middleware([requireFirebaseAuth]).inputValidator((input: { userId: string }) => input).handler(async ({ data, context }) => {
  requireAdmin(context); if (data.userId === context.userId) throw new Error("You cannot delete yourself"); if (await targetIsSuperAdmin(data.userId)) requireSuperAdmin(context);
  fail((await getSupabaseAdmin().auth.admin.deleteUser(data.userId)).error); return { ok: true };
});
export const changeEmployeeRole = createServerFn({ method: "POST" }).middleware([requireFirebaseAuth]).inputValidator((input: { userId: string; role: AppRole }) => input).handler(async ({ data, context }) => {
  requireAdmin(context); if (data.role === "super_admin" || await targetIsSuperAdmin(data.userId)) requireSuperAdmin(context);
  fail((await getSupabaseAdmin().from("users").update({ role: data.role, updated_at: new Date().toISOString() }).eq("id", data.userId)).error); return { ok: true };
});
export const setRolePermission = createServerFn({ method: "POST" }).middleware([requireFirebaseAuth]).inputValidator((input: { role: AppRole; permission: string; enabled: boolean }) => input).handler(async ({ data, context }) => {
  requireAdmin(context); if (data.role === "super_admin") requireSuperAdmin(context);
  fail((await getSupabaseAdmin().from("role_permissions").upsert({ role: data.role, permission: data.permission, enabled: data.enabled, updated_at: new Date().toISOString() })).error); return { ok: true };
});
export const setOfficeHours = createServerFn({ method: "POST" }).middleware([requireFirebaseAuth]).inputValidator((input: { start: string; end: string }) => input).handler(async ({ data, context }) => {
  requireManager(context); if (!/^\d{2}:\d{2}$/.test(data.start) || !/^\d{2}:\d{2}$/.test(data.end)) throw new Error("Invalid time format (HH:MM)");
  fail((await getSupabaseAdmin().from("app_settings").upsert({ key: "office_hours", value: { start: data.start, end: data.end }, updated_at: new Date().toISOString(), updated_by: context.userId })).error); return { ok: true };
});
export const setAppLogo = createServerFn({ method: "POST" }).middleware([requireFirebaseAuth]).inputValidator((input: { logoUrl: string }) => input).handler(async ({ data, context }) => {
  requireAdmin(context); fail((await getSupabaseAdmin().from("app_settings").upsert({ key: "app_logo", value: { url: data.logoUrl }, updated_at: new Date().toISOString(), updated_by: context.userId })).error); return { ok: true };
});
export const resetUserMonthAttendance = createServerFn({ method: "POST" }).middleware([requireFirebaseAuth]).inputValidator((input: { userId: string; month: string }) => input).handler(async ({ data, context }) => {
  requireAdmin(context); if (!/^\d{4}-\d{2}$/.test(data.month)) throw new Error("Invalid month (YYYY-MM)");
  const [year, month] = data.month.split("-").map(Number); const end = `${data.month}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
  fail((await getSupabaseAdmin().from("attendance").delete().eq("user_id", data.userId).gte("work_date", `${data.month}-01`).lte("work_date", end)).error); return { ok: true };
});
export const updateAttendanceTimes = createServerFn({ method: "POST" }).middleware([requireFirebaseAuth]).inputValidator((input: { attendanceId: string; check_in?: string | null; check_out?: string | null }) => input).handler(async ({ data, context }) => {
  requireAdmin(context); const patch: Record<string, string | null> = {}; if (data.check_in !== undefined) patch.check_in = data.check_in; if (data.check_out !== undefined) patch.check_out = data.check_out;
  if (Object.keys(patch).length) fail((await getSupabaseAdmin().from("attendance").update(patch).eq("id", data.attendanceId)).error); return { ok: true };
});
export const updateEmployeeProfile = createServerFn({ method: "POST" }).middleware([requireFirebaseAuth]).inputValidator((input: { userId: string; full_name: string; phone?: string; department?: string }) => input).handler(async ({ data, context }) => {
  requireManager(context); fail((await getSupabaseAdmin().from("users").update({ full_name: data.full_name, phone: data.phone ?? null, department: data.department ?? null, updated_at: new Date().toISOString() }).eq("id", data.userId)).error); return { ok: true };
});
export const updateOwnProfilePhoto = createServerFn({ method: "POST" }).middleware([requireFirebaseAuth]).inputValidator((input: { photoUrl: string }) => input).handler(async ({ data, context }) => {
  fail((await getSupabaseAdmin().from("users").update({ photo_url: data.photoUrl, updated_at: new Date().toISOString() }).eq("id", context.userId)).error); return { ok: true };
});
