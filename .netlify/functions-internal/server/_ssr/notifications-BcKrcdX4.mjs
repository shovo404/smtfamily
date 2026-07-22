import { o as __toESM } from "../_runtime.mjs";
import { v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, o as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { t as supabase } from "./client-DOjATiAz.mjs";
import { i as useCurrentUser } from "./use-current-user-DWDKqeGB.mjs";
import { F as Bell, n as WifiOff } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/notifications-BcKrcdX4.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function NotificationsPage() {
	const { data: me } = useCurrentUser();
	const navigate = useNavigate();
	const qc = useQueryClient();
	(0, import_react.useEffect)(() => {
		if (me && !me.isAdmin) navigate({
			to: "/dashboard",
			replace: true
		});
	}, [me, navigate]);
	const { data: notifs } = useQuery({
		queryKey: ["notifications"],
		queryFn: async () => {
			const { data } = await supabase.from("notifications").select("*, profile:actor_user_id(full_name, email)").order("created_at", { ascending: false }).limit(100);
			return data ?? [];
		}
	});
	(0, import_react.useEffect)(() => {
		const ch = supabase.channel("notifications-list").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "notifications"
		}, () => qc.invalidateQueries({ queryKey: ["notifications"] })).subscribe();
		return () => {
			supabase.removeChannel(ch);
		};
	}, [qc]);
	const markAllRead = async () => {
		await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
		qc.invalidateQueries({ queryKey: ["notifications"] });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-bold",
				children: "Notifications"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "System alerts & events"
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: markAllRead,
				className: "rounded-md bg-primary/20 px-3 py-1.5 text-xs font-semibold text-primary",
				children: "Mark all read"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-2",
			children: [(notifs ?? []).map((n) => {
				const actor = n.profile;
				const isOff = n.type === "location_off";
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `premium-card flex items-start gap-3 p-3 ${!n.is_read ? "border-primary/40" : ""}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `grid h-9 w-9 shrink-0 place-items-center rounded-full ${isOff ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"}`,
						children: isOff ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WifiOff, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "h-4 w-4" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "truncate text-sm font-semibold",
									children: n.title
								}), !n.is_read && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground",
									children: "NEW"
								})]
							}),
							actor && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[11px] text-muted-foreground",
								children: actor.full_name ?? actor.email
							}),
							n.message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-1 text-xs",
								children: n.message
							}),
							(() => {
								const lk = n.meta?.last_known;
								if (!lk) return null;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: lk.maps_url ?? `https://www.google.com/maps?q=${lk.latitude},${lk.longitude}`,
									target: "_blank",
									rel: "noopener noreferrer",
									className: "mt-1 inline-block rounded-md bg-primary/15 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/25",
									children: [
										"📍 ",
										lk.latitude.toFixed(5),
										", ",
										lk.longitude.toFixed(5),
										" — open in Maps"
									]
								});
							})(),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-1 text-[10px] text-muted-foreground",
								children: new Date(n.created_at).toLocaleString()
							})
						]
					})]
				}, n.id);
			}), notifs && notifs.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "premium-card p-6 text-center text-sm text-muted-foreground",
				children: "No notifications yet."
			})]
		})]
	});
}
//#endregion
export { NotificationsPage as component };
