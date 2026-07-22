import { o as __toESM } from "../_runtime.mjs";
import { N as redirect, c as HeadContent, d as createRouter, f as Outlet, g as Link, h as createRootRouteWithContext, m as createFileRoute, p as lazyRouteComponent, s as Scripts, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as require_jsx_runtime, o as require_react, r as QueryClientProvider } from "../_libs/react+tanstack__react-query.mjs";
import { t as supabase } from "./client-DOjATiAz.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-DcNcxUrg.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-DZ6YgnqO.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
	const message = error instanceof Response ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}` : error instanceof Error ? error.message : String(error);
	window.__lovableReportRuntimeError?.({
		message,
		stack: error instanceof Error ? error.stack : void 0,
		filename: window.location.pathname
	});
}
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center premium-card p-10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-primary",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					className: "mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90",
					children: "Go home"
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center premium-card p-10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold",
					children: "Something went wrong"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Please try again."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 flex justify-center gap-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90",
						children: "Try again"
					})
				})
			]
		})
	});
}
var Route$14 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "SMT Family — Sales Force Automation" },
			{
				name: "description",
				content: "একতাবদ্ধ পরিবার, সেরা মানের সেরা উপহার — SMT Family SFA & Employee Monitoring System."
			},
			{
				property: "og:title",
				content: "SMT Family — Sales Force Automation"
			},
			{
				property: "og:description",
				content: "একতাবদ্ধ পরিবার, সেরা মানের সেরা উপহার — SMT Family SFA & Employee Monitoring System."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "twitter:title",
				content: "SMT Family — Sales Force Automation"
			},
			{
				name: "twitter:description",
				content: "একতাবদ্ধ পরিবার, সেরা মানের সেরা উপহার — SMT Family SFA & Employee Monitoring System."
			},
			{
				property: "og:image",
				content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2a11a037-02fc-4ced-8f7c-da4fe5d56346/id-preview-b0cef32b--67543a57-36bd-4fa6-b725-90377294e49a.lovable.app-1784746544112.png"
			},
			{
				name: "twitter:image",
				content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2a11a037-02fc-4ced-8f7c-da4fe5d56346/id-preview-b0cef32b--67543a57-36bd-4fa6-b725-90377294e49a.lovable.app-1784746544112.png"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "icon",
				href: "/favicon.png",
				type: "image/png"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap"
			},
			{
				rel: "stylesheet",
				href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$14.useRouteContext();
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		const { data: sub } = supabase.auth.onAuthStateChange((event) => {
			if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
			router.invalidate();
			if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
		});
		return () => sub.subscription.unsubscribe();
	}, [queryClient, router]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(QueryClientProvider, {
		client: queryClient,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
			theme: "dark",
			richColors: true,
			position: "top-right"
		})]
	});
}
var $$splitComponentImporter$12 = () => import("./routes-DTEZEvkE.mjs");
var Route$13 = createFileRoute("/")({
	beforeLoad: () => {
		throw redirect({ to: "/auth" });
	},
	component: lazyRouteComponent($$splitComponentImporter$12, "component")
});
var $$splitComponentImporter$11 = () => import("./route-Bt5cwjp9.mjs");
var Route$12 = createFileRoute("/_authenticated")({
	ssr: false,
	beforeLoad: async () => {
		const { data, error } = await supabase.auth.getUser();
		if (error || !data.user) throw redirect({ to: "/auth" });
		return { user: data.user };
	},
	component: lazyRouteComponent($$splitComponentImporter$11, "component")
});
var $$splitComponentImporter$10 = () => import("./auth-BUbAq-zB.mjs");
var Route$11 = createFileRoute("/auth")({
	beforeLoad: async () => {
		if (typeof window === "undefined") return;
		const { data } = await supabase.auth.getSession();
		if (data.session) throw redirect({ to: "/dashboard" });
	},
	head: () => ({ meta: [{ title: "Sign in — SMT Family" }, {
		name: "description",
		content: "Sign in to the SMT Family SFA platform."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
var $$splitComponentImporter$9 = () => import("./attendance-C68HVlP7.mjs");
var Route$10 = createFileRoute("/_authenticated/attendance")({
	head: () => ({ meta: [{ title: "Attendance — SMT Family" }] }),
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
var $$splitComponentImporter$8 = () => import("./dashboard-DbUtHHK5.mjs");
var Route$9 = createFileRoute("/_authenticated/dashboard")({
	head: () => ({ meta: [{ title: "Dashboard — SMT Family" }] }),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
var $$splitComponentImporter$7 = () => import("./employees-BfkHVEq3.mjs");
var Route$8 = createFileRoute("/_authenticated/employees")({
	head: () => ({ meta: [{ title: "Employees — SMT Family" }] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
var $$splitComponentImporter$6 = () => import("./notifications-BcKrcdX4.mjs");
var Route$7 = createFileRoute("/_authenticated/notifications")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
var $$splitComponentImporter$5 = () => import("./profile-CtargfRT.mjs");
var Route$6 = createFileRoute("/_authenticated/profile")({
	head: () => ({ meta: [{ title: "Profile — SMT Family" }] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("./reports-r4paAl8y.mjs");
var Route$5 = createFileRoute("/_authenticated/reports")({
	head: () => ({ meta: [{ title: "Report — SMT Family" }] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./settings-DhEkl7J9.mjs");
var Route$4 = createFileRoute("/_authenticated/settings")({
	head: () => ({ meta: [{ title: "Settings — SMT Family" }] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./ta-ZXEAdRHY.mjs");
var Route$3 = createFileRoute("/_authenticated/ta")({
	head: () => ({ meta: [{ title: "Travel Allowance — SMT Family" }] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./tasks-BnFRePnJ.mjs");
var Route$2 = createFileRoute("/_authenticated/tasks")({
	head: () => ({ meta: [{ title: "Tasks — SMT Family" }] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./tracking-D7K_2TvP.mjs");
var Route$1 = createFileRoute("/_authenticated/tracking")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var Route = createFileRoute("/api/public/seed-demo")({ server: { handlers: { GET: async () => {
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const users = [{
		email: "admin@smt.family",
		password: "Admin@1234",
		full_name: "Demo Admin",
		role: "admin"
	}, {
		email: "sr@smt.family",
		password: "Sr@1234",
		full_name: "Demo SR",
		role: "sr"
	}];
	const results = [];
	for (const u of users) {
		const { data, error } = await supabaseAdmin.auth.admin.createUser({
			email: u.email,
			password: u.password,
			email_confirm: true,
			user_metadata: { full_name: u.full_name }
		});
		if (error) {
			results.push({
				email: u.email,
				error: error.message
			});
			continue;
		}
		if (data.user) {
			await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user.id);
			await supabaseAdmin.from("user_roles").insert({
				user_id: data.user.id,
				role: u.role
			});
		}
		results.push({
			email: u.email,
			ok: true
		});
	}
	return new Response(JSON.stringify({ results }, null, 2), { headers: { "content-type": "application/json" } });
} } } });
var IndexRoute = Route$13.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$14
});
var AuthenticatedRouteRoute = Route$12.update({
	id: "/_authenticated",
	getParentRoute: () => Route$14
});
var AuthRoute = Route$11.update({
	id: "/auth",
	path: "/auth",
	getParentRoute: () => Route$14
});
var AuthenticatedAttendanceRoute = Route$10.update({
	id: "/attendance",
	path: "/attendance",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedDashboardRoute = Route$9.update({
	id: "/dashboard",
	path: "/dashboard",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedEmployeesRoute = Route$8.update({
	id: "/employees",
	path: "/employees",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedNotificationsRoute = Route$7.update({
	id: "/notifications",
	path: "/notifications",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedProfileRoute = Route$6.update({
	id: "/profile",
	path: "/profile",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedReportsRoute = Route$5.update({
	id: "/reports",
	path: "/reports",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedSettingsRoute = Route$4.update({
	id: "/settings",
	path: "/settings",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedTaRoute = Route$3.update({
	id: "/ta",
	path: "/ta",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedTasksRoute = Route$2.update({
	id: "/tasks",
	path: "/tasks",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedTrackingRoute = Route$1.update({
	id: "/tracking",
	path: "/tracking",
	getParentRoute: () => AuthenticatedRouteRoute
});
var ApiPublicSeedDemoRoute = Route.update({
	id: "/api/public/seed-demo",
	path: "/api/public/seed-demo",
	getParentRoute: () => Route$14
});
var AuthenticatedRouteRouteChildren = {
	AuthenticatedAttendanceRoute,
	AuthenticatedDashboardRoute,
	AuthenticatedEmployeesRoute,
	AuthenticatedNotificationsRoute,
	AuthenticatedProfileRoute,
	AuthenticatedReportsRoute,
	AuthenticatedSettingsRoute,
	AuthenticatedTaRoute,
	AuthenticatedTasksRoute,
	AuthenticatedTrackingRoute
};
var rootRouteChildren = {
	IndexRoute,
	AuthenticatedRouteRoute: AuthenticatedRouteRoute._addFileChildren(AuthenticatedRouteRouteChildren),
	AuthRoute,
	ApiPublicSeedDemoRoute
};
var routeTree = Route$14._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
