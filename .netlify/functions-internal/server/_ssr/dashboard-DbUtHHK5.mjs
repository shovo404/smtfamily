import { a as require_jsx_runtime, n as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { t as supabase } from "./client-DOjATiAz.mjs";
import { i as useCurrentUser } from "./use-current-user-DWDKqeGB.mjs";
import { A as CircleCheck, D as Clock, O as ClipboardList, c as TriangleAlert, i as Users, o as UserX, r as Wallet, s as UserCheck, x as LogIn, y as MapPin } from "../_libs/lucide-react.mjs";
import { t as useAdminGuard } from "./use-admin-guard-LpTzEJhU.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dashboard-DbUtHHK5.js
var import_jsx_runtime = require_jsx_runtime();
function Stat({ icon: Icon, label, value, tone = "primary" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "premium-card p-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tone === "warn" ? "bg-yellow-500/20 text-yellow-300" : tone === "danger" ? "bg-destructive/20 text-destructive" : tone === "muted" ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"}`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "truncate text-[10px] uppercase tracking-wide text-muted-foreground",
					children: label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xl font-bold",
					children: value
				})]
			})]
		})
	});
}
function Dashboard() {
	const { allowed } = useAdminGuard();
	const { data: me } = useCurrentUser();
	const { data: stats } = useQuery({
		queryKey: ["dashboard-stats"],
		queryFn: async () => {
			const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
			const fiveMinAgo = (/* @__PURE__ */ new Date(Date.now() - 300 * 1e3)).toISOString();
			const [emp, active, todayAtt, tasksP, tasksD, ta, live, settings] = await Promise.all([
				supabase.from("profiles").select("id", {
					count: "exact",
					head: true
				}),
				supabase.from("profiles").select("id", {
					count: "exact",
					head: true
				}).eq("is_active", true),
				supabase.from("attendance").select("check_in").eq("work_date", today),
				supabase.from("tasks").select("id", {
					count: "exact",
					head: true
				}).eq("status", "pending"),
				supabase.from("tasks").select("id", {
					count: "exact",
					head: true
				}).eq("status", "completed"),
				supabase.from("ta_requests").select("id", {
					count: "exact",
					head: true
				}).eq("status", "pending"),
				supabase.from("employee_locations").select("user_id", {
					count: "exact",
					head: true
				}).gte("recorded_at", fiveMinAgo),
				supabase.from("app_settings").select("value").eq("key", "office_hours").maybeSingle()
			]);
			const attRows = todayAtt.data ?? [];
			const presentCount = attRows.length;
			const [sh, sm] = ((settings.data?.value ?? {}).start ?? "09:00").split(":").map(Number);
			const startMin = (sh || 0) * 60 + (sm || 0);
			const lateCount = attRows.filter((r) => {
				if (!r.check_in) return false;
				const d = new Date(r.check_in);
				return d.getHours() * 60 + d.getMinutes() > startMin;
			}).length;
			return {
				total: emp.count ?? 0,
				active: active.count ?? 0,
				present: presentCount,
				absent: Math.max(0, (active.count ?? 0) - presentCount),
				late: lateCount,
				tasksPending: tasksP.count ?? 0,
				tasksDone: tasksD.count ?? 0,
				taPending: ta.count ?? 0,
				live: live.count ?? 0
			};
		},
		enabled: allowed
	});
	if (!allowed) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-bold",
				children: "Dashboard"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted-foreground",
				children: [
					"Welcome",
					me?.profile?.full_name ? `, ${me.profile.full_name}` : "",
					". Team overview for today."
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						icon: Users,
						label: "Total",
						value: stats?.total ?? "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						icon: UserCheck,
						label: "Active",
						value: stats?.active ?? "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						icon: LogIn,
						label: "Present",
						value: stats?.present ?? "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						icon: UserX,
						label: "Absent",
						value: stats?.absent ?? "—",
						tone: "danger"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						icon: TriangleAlert,
						label: "Late",
						value: stats?.late ?? "—",
						tone: "warn"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						icon: MapPin,
						label: "Live now",
						value: stats?.live ?? "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						icon: ClipboardList,
						label: "Pending tasks",
						value: stats?.tasksPending ?? "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						icon: CircleCheck,
						label: "Done tasks",
						value: stats?.tasksDone ?? "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						icon: Wallet,
						label: "TA pending",
						value: stats?.taPending ?? "—",
						tone: "warn"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						icon: Clock,
						label: "On duty",
						value: stats?.present ?? "—",
						tone: "muted"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "premium-card p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-base font-semibold",
					children: "Today at a glance"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-xs text-muted-foreground",
					children: stats ? `${stats.present} of ${stats.active} active employees checked in today${stats.late > 0 ? `, ${stats.late} late` : ""}.` : "Loading…"
				})]
			})
		]
	});
}
//#endregion
export { Dashboard as component };
