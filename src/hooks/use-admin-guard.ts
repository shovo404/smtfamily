import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "./use-current-user";

/**
 * Redirects non-admin (field) users away from admin pages to /attendance.
 * Returns { me, allowed } — render nothing when !allowed.
 */
export function useAdminGuard() {
  const { data: me, isLoading } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !me) return;
    if (!me.isStaff) navigate({ to: "/attendance", replace: true });
  }, [me, isLoading, navigate]);

  return { me, allowed: !!me?.isStaff, isLoading };
}
