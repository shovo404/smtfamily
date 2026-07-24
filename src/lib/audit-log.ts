import { firebase } from "./firebase-client";

export async function logAuditEvent(event: {
  action: string;
  target_user_id?: string;
  target_name?: string;
  target_employee_id?: string;
  details?: string;
}) {
  const { data: user } = await firebase.auth.getUser();
  if (!user?.user) return;
  try {
    await firebase.from("audit_logs").insert({
      actor_user_id: user.user.id,
      actor_name: user.user.email ?? "Unknown",
      action: event.action,
      target_user_id: event.target_user_id ?? null,
      target_name: event.target_name ?? null,
      target_employee_id: event.target_employee_id ?? null,
      details: event.details ?? null,
      ip_address: null,
      user_agent: navigator.userAgent ?? null,
    });
  } catch (e) {
    console.error("Audit log insert failed:", e);
  }
}
