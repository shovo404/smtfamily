import { firebase } from "@/lib/firebase-client";
import { supabase } from "@/lib/firebase-client";
import { logAuditEvent } from "@/lib/audit-log";

type AppRole = "super_admin" | "admin" | "hr" | "dhr" | "so" | "fi";

function fail(error: { message: string } | null) { if (error) throw new Error(error.message); }

export async function createEmployee({ data }: { data: {
  email: string; password: string; full_name: string; phone?: string;
  department?: string; role: AppRole; employee_id?: string; is_active?: boolean;
} }) {
  const { data: authData, error: signUpError } = await firebase.auth.signUp({
    email: data.email,
    password: data.password,
    options: { data: { full_name: data.full_name } },
  });
  if (signUpError) throw signUpError;
  if (!authData.user) throw new Error("Could not create user");
  const { error } = await firebase.from("users").update({
    full_name: data.full_name,
    email: data.email,
    role: data.role,
    phone: data.phone ?? null,
    department: data.department ?? null,
    employee_id: data.employee_id ?? null,
    is_active: data.is_active ?? true,
    updated_at: new Date().toISOString(),
  }).eq("id", authData.user.id);
  fail(error);
  return { ok: true, userId: authData.user.id };
}

export async function resetEmployeePassword({ data }: { data: { userId: string; newPassword: string } }) {
  const { data: user, error: fetchError } = await firebase.from("users").select("email").eq("id", data.userId).single();
  if (fetchError || !user) throw new Error("User not found");
  const { error } = await firebase.auth.resetPasswordForEmail(user.email);
  if (error) throw error;
  return { ok: true };
}

export async function deleteEmployee({ data }: { data: { userId: string } }) {
  const { error } = await firebase.from("users").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", data.userId);
  fail(error);
  return { ok: true };
}

export async function changeEmployeeRole({ data }: { data: { userId: string; role: AppRole } }) {
  const { error } = await firebase.from("users").update({ role: data.role, updated_at: new Date().toISOString() }).eq("id", data.userId);
  fail(error);
  return { ok: true };
}

export async function setRolePermission({ data }: { data: { role: AppRole; permission: string; enabled: boolean } }) {
  const { error } = await firebase.from("role_permissions").upsert({
    role: data.role,
    permission: data.permission,
    enabled: data.enabled,
    updated_at: new Date().toISOString(),
  });
  fail(error);
  return { ok: true };
}

export async function setOfficeHours({ data }: { data: { start: string; end: string } }) {
  if (!/^\d{2}:\d{2}$/.test(data.start) || !/^\d{2}:\d{2}$/.test(data.end)) throw new Error("Invalid time format (HH:MM)");
  const { data: user } = await firebase.auth.getUser();
  const { error } = await firebase.from("app_settings").upsert({
    key: "office_hours",
    value: { start: data.start, end: data.end },
    updated_at: new Date().toISOString(),
    updated_by: user?.user?.id,
  });
  fail(error);
  return { ok: true };
}

export async function setAppLogo({ data }: { data: { logoUrl: string } }) {
  const { data: user } = await firebase.auth.getUser();
  const { error } = await firebase.from("app_settings").upsert({
    key: "app_logo",
    value: { url: data.logoUrl },
    updated_at: new Date().toISOString(),
    updated_by: user?.user?.id,
  });
  fail(error);
  return { ok: true };
}

export async function resetUserMonthAttendance({ data }: { data: { userId: string; month: string } }) {
  if (!/^\d{4}-\d{2}$/.test(data.month)) throw new Error("Invalid month (YYYY-MM)");
  const [year, month] = data.month.split("-").map(Number);
  const end = `${data.month}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
  const { error } = await firebase.from("attendance").delete().eq("user_id", data.userId).gte("work_date", `${data.month}-01`).lte("work_date", end);
  if (error) throwErr("attendance month delete", error);
  return { ok: true };
}

export async function updateAttendanceTimes({ data }: { data: { attendanceId: string; check_in?: string | null; check_out?: string | null } }) {
  const patch: Record<string, string | null> = {};
  if (data.check_in !== undefined) patch.check_in = data.check_in;
  if (data.check_out !== undefined) patch.check_out = data.check_out;
  if (Object.keys(patch).length) {
    const { error } = await firebase.from("attendance").update(patch).eq("id", data.attendanceId);
    fail(error);
  }
  return { ok: true };
}

export async function updateEmployeeProfile({ data }: { data: { userId: string; full_name: string; phone?: string; department?: string; employee_id?: string } }) {
  const { error } = await firebase.from("users").update({
    full_name: data.full_name,
    phone: data.phone ?? null,
    department: data.department ?? null,
    employee_id: data.employee_id ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", data.userId);
  fail(error);
  return { ok: true };
}

export async function updateOwnProfilePhoto({ data }: { data: { photoUrl: string } }) {
  const { data: user } = await firebase.auth.getUser();
  if (!user?.user) throw new Error("Not authenticated");
  const { error } = await firebase.from("users").update({
    photo_url: data.photoUrl,
    updated_at: new Date().toISOString(),
  }).eq("id", user.user.id);
  fail(error);
  return { ok: true };
}

function throwErr(context: string, err: unknown): never {
  const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
  console.error(`[resetEmployeeAttendance] ${context} failed:`, err);
  throw new Error(msg);
}

export async function resetEmployeeAttendance({ data }: { data: { userId: string } }) {
  const { data: profile } = await firebase.from("users").select("full_name, employee_id, email").eq("id", data.userId).single();
  if (!profile) throw new Error("Employee not found");

  const results: string[] = [];

  const { error: attErr, count: attCount } = await firebase
    .from("attendance")
    .delete()
    .eq("user_id", data.userId);
  if (attErr) throwErr("attendance delete", attErr);
  results.push(`attendance:${attCount ?? 0}`);

  const { error: pingErr, count: pingCount } = await firebase
    .from("location_pings")
    .delete()
    .eq("user_id", data.userId);
  if (pingErr) throwErr("location_pings delete", pingErr);
  results.push(`pings:${pingCount ?? 0}`);

  const { error: locErr } = await firebase
    .from("employee_locations")
    .upsert({ user_id: data.userId, latitude: 0, longitude: 0, duty_on: false, updated_at: new Date().toISOString() });
  if (locErr) throwErr("employee_locations upsert", locErr);
  results.push("location:reset");

  try {
    const { data: files } = await supabase.storage.from("attendance-faces").list(data.userId, { limit: 100 });
    if (files && files.length > 0) {
      const paths = files.map((f: any) => `${data.userId}/${f.name}`);
      await supabase.storage.from("attendance-faces").remove(paths);
      results.push(`photos:${files.length}`);
    }
  } catch (e) {
    console.warn("[resetEmployeeAttendance] storage cleanup skipped:", e);
    results.push("photos:skipped");
  }

  await logAuditEvent({
    action: "attendance_reset",
    target_user_id: data.userId,
    target_name: profile.full_name || profile.email,
    target_employee_id: profile.employee_id ?? undefined,
    details: `Reset attendance (${results.join(", ")})`,
  });

  return { ok: true, details: results };
}
