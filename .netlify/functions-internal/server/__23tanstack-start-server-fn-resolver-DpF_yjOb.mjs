//#region node_modules/.nitro/vite/services/ssr/assets/__23tanstack-start-server-fn-resolver-DpF_yjOb.js
var manifest = {
	"33774db39beb46706b02f5751ccd636c3c0d300de81dbefb8f294f72aa9b9088": {
		functionName: "setAppLogo_createServerFn_handler",
		importer: () => import("./_ssr/admin-users.functions-DRdOrFmR.mjs")
	},
	"3ddd4d0c524397c704a3f23ff612fc360b59c45f58e94df935f3c0df2e5cef0c": {
		functionName: "updateAttendanceTimes_createServerFn_handler",
		importer: () => import("./_ssr/admin-users.functions-DRdOrFmR.mjs")
	},
	"4e1b5dd8c1a7d60f3a4854e6ae22e6481f3844397414ce86b757c8d9e834b26e": {
		functionName: "resetUserMonthAttendance_createServerFn_handler",
		importer: () => import("./_ssr/admin-users.functions-DRdOrFmR.mjs")
	},
	"53350f1124921d87f7d150fbebc8b18503076e6b05c8627494051ca8153be3db": {
		functionName: "updateEmployeeProfile_createServerFn_handler",
		importer: () => import("./_ssr/admin-users.functions-DRdOrFmR.mjs")
	},
	"5da2cd1d0c0c1c029e4c3aa3f3df006ea4d67d9c6458f08bf8634ca52523c724": {
		functionName: "updateOwnProfilePhoto_createServerFn_handler",
		importer: () => import("./_ssr/admin-users.functions-DRdOrFmR.mjs")
	},
	"75264e8099629e93cc3e433cfb6f38c9c198efb0e6c2352b31380db17d7a3c1a": {
		functionName: "setRolePermission_createServerFn_handler",
		importer: () => import("./_ssr/admin-users.functions-DRdOrFmR.mjs")
	},
	"7ed5504d7e2dffcb8bcb346a9b34e7a7054df075fd1a56ff39adb5bcecbbd359": {
		functionName: "resetEmployeePassword_createServerFn_handler",
		importer: () => import("./_ssr/admin-users.functions-DRdOrFmR.mjs")
	},
	"8757bbe901a1d29f9e40aaa02dde353444cb425bae02c89345ae159cd1033981": {
		functionName: "createEmployee_createServerFn_handler",
		importer: () => import("./_ssr/admin-users.functions-DRdOrFmR.mjs")
	},
	"96f44512048d10cabe3291bd49cf63685dc97358542bf7bfdf3d26bc5c95d45b": {
		functionName: "setOfficeHours_createServerFn_handler",
		importer: () => import("./_ssr/admin-users.functions-DRdOrFmR.mjs")
	},
	"c19365df3a1d7e5af208c43ca41e36a2893f83252ed3adbf2c0f22f89ea08a10": {
		functionName: "deleteEmployee_createServerFn_handler",
		importer: () => import("./_ssr/admin-users.functions-DRdOrFmR.mjs")
	},
	"d10fd83f59933f31e9d0e48414ea85eb9b86bc5d8e060ebf3fc3064012a15656": {
		functionName: "changeEmployeeRole_createServerFn_handler",
		importer: () => import("./_ssr/admin-users.functions-DRdOrFmR.mjs")
	}
};
async function getServerFnById(id, access) {
	const serverFnInfo = manifest[id];
	if (!serverFnInfo) throw new Error("Server function info not found for " + id);
	const fnModule = serverFnInfo.module ?? await serverFnInfo.importer();
	if (!fnModule) throw new Error("Server function module not resolved for " + id);
	const action = fnModule[serverFnInfo.functionName];
	if (!action) throw new Error("Server function module export not resolved for serverFn ID: " + id);
	return action;
}
//#endregion
export { getServerFnById as t };
