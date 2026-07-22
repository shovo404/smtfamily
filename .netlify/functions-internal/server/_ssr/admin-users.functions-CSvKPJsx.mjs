import { o as __toESM } from "../_runtime.mjs";
import { A as isRedirect, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as createServerFn, i as TSS_SERVER_FUNCTION } from "./createServerFn-BFFE07zL.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BwdutfJC.mjs";
import { t as getServerFnById } from "../__23tanstack-start-server-fn-resolver-DpF_yjOb.mjs";
import { o as require_react } from "../_libs/react+tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-users.functions-CSvKPJsx.js
var import_react = /* @__PURE__ */ __toESM(require_react());
function useServerFn(serverFn) {
	const router = useRouter();
	return import_react.useCallback(async (...args) => {
		try {
			const res = await serverFn(...args);
			if (isRedirect(res)) throw res;
			return res;
		} catch (err) {
			if (isRedirect(err)) {
				err.options._fromLocation = router.stores.location.get();
				return router.navigate(router.resolveRedirect(err).options);
			}
			throw err;
		}
	}, [router, serverFn]);
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var createEmployee = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(createSsrRpc("8757bbe901a1d29f9e40aaa02dde353444cb425bae02c89345ae159cd1033981"));
var resetEmployeePassword = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(createSsrRpc("7ed5504d7e2dffcb8bcb346a9b34e7a7054df075fd1a56ff39adb5bcecbbd359"));
var deleteEmployee = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(createSsrRpc("c19365df3a1d7e5af208c43ca41e36a2893f83252ed3adbf2c0f22f89ea08a10"));
var changeEmployeeRole = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(createSsrRpc("d10fd83f59933f31e9d0e48414ea85eb9b86bc5d8e060ebf3fc3064012a15656"));
var setRolePermission = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(createSsrRpc("75264e8099629e93cc3e433cfb6f38c9c198efb0e6c2352b31380db17d7a3c1a"));
var setOfficeHours = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(createSsrRpc("96f44512048d10cabe3291bd49cf63685dc97358542bf7bfdf3d26bc5c95d45b"));
var setAppLogo = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(createSsrRpc("33774db39beb46706b02f5751ccd636c3c0d300de81dbefb8f294f72aa9b9088"));
var resetUserMonthAttendance = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(createSsrRpc("4e1b5dd8c1a7d60f3a4854e6ae22e6481f3844397414ce86b757c8d9e834b26e"));
var updateAttendanceTimes = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(createSsrRpc("3ddd4d0c524397c704a3f23ff612fc360b59c45f58e94df935f3c0df2e5cef0c"));
var updateEmployeeProfile = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(createSsrRpc("53350f1124921d87f7d150fbebc8b18503076e6b05c8627494051ca8153be3db"));
var updateOwnProfilePhoto = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(createSsrRpc("5da2cd1d0c0c1c029e4c3aa3f3df006ea4d67d9c6458f08bf8634ca52523c724"));
//#endregion
export { resetUserMonthAttendance as a, setRolePermission as c, updateOwnProfilePhoto as d, useServerFn as f, resetEmployeePassword as i, updateAttendanceTimes as l, createEmployee as n, setAppLogo as o, deleteEmployee as r, setOfficeHours as s, changeEmployeeRole as t, updateEmployeeProfile as u };
