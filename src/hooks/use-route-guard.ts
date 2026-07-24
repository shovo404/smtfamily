import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentUser, type PermissionKey } from "./use-current-user";

export function useRouteGuard(requiredPerm?: PermissionKey, fallback = "/attendance") {
  const { data: me, isLoading } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!me) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    if (requiredPerm && !me.perms[requiredPerm]) {
      navigate({ to: me.roleHome, replace: true });
    }
  }, [me, isLoading, requiredPerm, fallback, navigate]);

  return { me, allowed: !!me && (!requiredPerm || me.perms[requiredPerm]), isLoading };
}
