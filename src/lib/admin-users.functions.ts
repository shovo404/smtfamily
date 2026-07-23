import { createServerFn } from "@tanstack/react-start";
import { requireFirebaseAuth } from "@/lib/firebase-auth-middleware";

type AppRole = "super_admin" | "admin" | "hr" | "dhr" | "sr" | "fso" | "dsr";

async function assertCallerCanManage(context: { firebase: any; userId: string }) {
  const { data: isAdmin } = await context.firebase.rpc("is_admin", { _user_id: context.userId });
  const { data: isHR } = await context.firebase.rpc("has_role", { _user_id: context.userId, _role: "hr" });
  if (!isAdmin && !isHR) throw new Error("Forbidden: admin or HR role required");
  return { isAdmin: !!isAdmin, isHR: !!isHR };
}

async function assertSuperAdmin(context: { firebase: any; userId: string }) {
  const { data } = await context.firebase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
  if (!data) throw new Error("Only Super Admin can perform this action");
}

async function isTargetSuperAdmin(context: { firebase: any }, targetId: string) {
  const { data } = await context.firebase.rpc("has_role", { _user_id: targetId, _role: "super_admin" });
  return !!data;
}

export const createEmployee = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    department?: string;
    role: AppRole;
  }) => input)
  .handler(async ({ data, context }) => {
    await assertCallerCanManage(context);
    // Only super_admin can create another super_admin
    if (data.role === "super_admin") {
      await assertSuperAdmin(context);
    }

    const { firebaseAdmin } = await import("@/lib/firebase-admin");

    const { data: created, error: createErr } = await firebaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message || "Failed to create user");
    }

    const userId = created.user.id;

    await firebaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone ?? null,
        department: data.department ?? null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    await firebaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: roleErr } = await firebaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    if (roleErr) throw new Error(roleErr.message);

    return { ok: true, userId };
  });

export const resetEmployeePassword = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input: { userId: string; newPassword: string }) => input)
  .handler(async ({ data, context }) => {
    await assertCallerCanManage(context);
    if (data.newPassword.length < 6) throw new Error("Password must be at least 6 characters");

    // Only super_admin can reset a super_admin's password
    if (await isTargetSuperAdmin(context, data.userId)) {
      await assertSuperAdmin(context);
    }

    const { firebaseAdmin } = await import("@/lib/firebase-admin");
    const { error } = await firebaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteEmployee = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    const { isAdmin } = await assertCallerCanManage(context);
    if (!isAdmin) throw new Error("Only Admin or Super Admin can delete employees");

    if (data.userId === context.userId) throw new Error("You cannot delete yourself");

    // Only super_admin can delete a super_admin
    if (await isTargetSuperAdmin(context, data.userId)) {
      await assertSuperAdmin(context);
    }

    const { firebaseAdmin } = await import("@/lib/firebase-admin");
    const { error } = await firebaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const changeEmployeeRole = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input: { userId: string; role: AppRole }) => input)
  .handler(async ({ data, context }) => {
    const { isAdmin } = await assertCallerCanManage(context);
    if (!isAdmin) throw new Error("Only Admin or Super Admin can change roles");

    // Only super_admin can assign super_admin
    if (data.role === "super_admin") {
      await assertSuperAdmin(context);
    }
    // Only super_admin can modify another super_admin
    if (await isTargetSuperAdmin(context, data.userId)) {
      await assertSuperAdmin(context);
    }

    const { firebaseAdmin } = await import("@/lib/firebase-admin");
    await firebaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await firebaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setRolePermission = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input: { role: AppRole; permission: string; enabled: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { isAdmin } = await assertCallerCanManage(context);
    if (!isAdmin) throw new Error("Only Admin or Super Admin can edit permissions");
    // Protect super_admin: only super_admin can edit its permissions
    if (data.role === "super_admin") {
      await assertSuperAdmin(context);
    }
    const { firebaseAdmin } = await import("@/lib/firebase-admin");
    const { error } = await firebaseAdmin
      .from("role_permissions")
      .upsert(
        { role: data.role, permission: data.permission, enabled: data.enabled, updated_at: new Date().toISOString() },
        { onConflict: "role,permission" }
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setOfficeHours = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input: { start: string; end: string }) => input)
  .handler(async ({ data, context }) => {
    await assertCallerCanManage(context);
    if (!/^\d{2}:\d{2}$/.test(data.start) || !/^\d{2}:\d{2}$/.test(data.end)) {
      throw new Error("Invalid time format (HH:MM)");
    }
    const { firebaseAdmin } = await import("@/lib/firebase-admin");
    const { error } = await firebaseAdmin
      .from("app_settings")
      .upsert(
        { key: "office_hours", value: { start: data.start, end: data.end }, updated_at: new Date().toISOString(), updated_by: context.userId },
        { onConflict: "key" }
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setAppLogo = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input: { logoUrl: string }) => input)
  .handler(async ({ data, context }) => {
    const { isAdmin } = await assertCallerCanManage(context);
    if (!isAdmin) throw new Error("Only Admin can change the app logo");
    const { firebaseAdmin } = await import("@/lib/firebase-admin");
    const { error } = await firebaseAdmin
      .from("app_settings")
      .upsert(
        { key: "app_logo", value: { url: data.logoUrl }, updated_at: new Date().toISOString(), updated_by: context.userId },
        { onConflict: "key" }
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetUserMonthAttendance = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input: { userId: string; month: string }) => input)
  .handler(async ({ data, context }) => {
    const { isAdmin } = await assertCallerCanManage(context);
    if (!isAdmin) throw new Error("Only Admin can reset attendance");
    if (!/^\d{4}-\d{2}$/.test(data.month)) throw new Error("Invalid month (YYYY-MM)");
    const [y, m] = data.month.split("-").map(Number);
    const start = `${data.month}-01`;
    const endDate = new Date(y, m, 0).getDate();
    const end = `${data.month}-${String(endDate).padStart(2, "0")}`;
    const { firebaseAdmin } = await import("@/lib/firebase-admin");
    const { error } = await firebaseAdmin
      .from("attendance")
      .delete()
      .eq("user_id", data.userId)
      .gte("work_date", start)
      .lte("work_date", end);
    return { ok: true };
  });

export const updateAttendanceTimes = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input: { attendanceId: string; check_in?: string | null; check_out?: string | null }) => input)
  .handler(async ({ data, context }) => {
    const { isAdmin } = await assertCallerCanManage(context);
    if (!isAdmin) throw new Error("Only Admin or Super Admin can edit attendance");
    const patch: { check_in?: string | null; check_out?: string | null } = {};
    if (data.check_in !== undefined) patch.check_in = data.check_in;
    if (data.check_out !== undefined) patch.check_out = data.check_out;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { firebaseAdmin } = await import("@/lib/firebase-admin");
    const { error } = await firebaseAdmin.from("attendance").update(patch).eq("id", data.attendanceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateEmployeeProfile = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input: { userId: string; full_name: string; phone?: string; department?: string }) => input)
  .handler(async ({ data, context }) => {
    await assertCallerCanManage(context);
    const { firebaseAdmin } = await import("@/lib/firebase-admin");
    const { error } = await firebaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name,
        phone: data.phone ?? null,
        department: data.department ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateOwnProfilePhoto = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((input: { photoUrl: string }) => input)
  .handler(async ({ data, context }) => {
    const { firebaseAdmin } = await import("@/lib/firebase-admin");
    const { error } = await firebaseAdmin
      .from("profiles")
      .update({ photo_url: data.photoUrl, updated_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
