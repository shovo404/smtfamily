import { o as __toESM } from "../_runtime.mjs";
import { v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { i as useCurrentUser } from "./use-current-user-DWDKqeGB.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-admin-guard-LpTzEJhU.js
var import_react = /* @__PURE__ */ __toESM(require_react());
/**
* Redirects non-admin (field) users away from admin pages to /attendance.
* Returns { me, allowed } — render nothing when !allowed.
*/
function useAdminGuard() {
	const { data: me, isLoading } = useCurrentUser();
	const navigate = useNavigate();
	(0, import_react.useEffect)(() => {
		if (isLoading || !me) return;
		if (!me.isStaff) navigate({
			to: "/attendance",
			replace: true
		});
	}, [
		me,
		isLoading,
		navigate
	]);
	return {
		me,
		allowed: !!me?.isStaff,
		isLoading
	};
}
//#endregion
export { useAdminGuard as t };
