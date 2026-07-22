import { o as __toESM } from "../_runtime.mjs";
import { b as ClientOnly, v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, o as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { t as supabase } from "./client-DOjATiAz.mjs";
import { i as useCurrentUser } from "./use-current-user-DWDKqeGB.mjs";
import { D as Clock, j as ChevronLeft, n as WifiOff, y as MapPin } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/tracking-D7K_2TvP.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function LiveMap(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientOnly, { fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid place-items-center rounded-xl bg-accent/40 text-xs text-muted-foreground",
		style: { height: props.height ?? 320 },
		children: "Loading map…"
	}) });
}
function timeAgo(iso) {
	const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1e3);
	if (s < 60) return `${s}s ago`;
	if (s < 3600) return `${Math.floor(s / 60)}m ago`;
	if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
	return `${Math.floor(s / 86400)}d ago`;
}
function TrackingPage() {
	const { data: me } = useCurrentUser();
	const navigate = useNavigate();
	const qc = useQueryClient();
	const [selected, setSelected] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (me && !me.perms.viewLiveTracking) navigate({
			to: "/dashboard",
			replace: true
		});
	}, [me, navigate]);
	const { data: employees } = useQuery({
		queryKey: ["field-employees"],
		queryFn: async () => {
			const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("role", [
				"sr",
				"fso",
				"dhr"
			]);
			const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
			if (ids.length === 0) return [];
			const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
			const byId = new Map((profs ?? []).map((p) => [p.id, p]));
			return ids.map((id) => ({
				id,
				name: byId.get(id)?.full_name ?? byId.get(id)?.email ?? "Unknown",
				role: (roles ?? []).find((r) => r.user_id === id)?.role ?? ""
			}));
		}
	});
	const { data: locations } = useQuery({
		queryKey: ["employee-locations"],
		queryFn: async () => {
			const { data } = await supabase.from("employee_locations").select("*");
			return data ?? [];
		},
		refetchInterval: 15e3
	});
	(0, import_react.useEffect)(() => {
		const channel = supabase.channel("live-locations").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "employee_locations"
		}, () => qc.invalidateQueries({ queryKey: ["employee-locations"] })).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [qc]);
	const locByUser = (0, import_react.useMemo)(() => {
		const m = /* @__PURE__ */ new Map();
		for (const l of locations ?? []) m.set(l.user_id, l);
		return m;
	}, [locations]);
	if (selected) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmployeeDetail, {
		userId: selected,
		onBack: () => setSelected(null)
	});
	const liveMarkers = (employees ?? []).map((emp) => {
		const loc = locByUser.get(emp.id);
		if (!loc || !loc.duty_on || loc.latitude === 0) return null;
		return {
			lat: loc.latitude,
			lng: loc.longitude,
			label: emp.name,
			color: "#22c55e"
		};
	}).filter((m) => m !== null);
	const liveCount = liveMarkers.length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-bold",
				children: "Live Tracking"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Field employees' realtime location & path"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "premium-card overflow-hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between border-b border-border/40 px-4 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-semibold",
							children: "Live Map"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-[11px] text-muted-foreground",
						children: [
							liveCount,
							" live · ",
							(employees?.length ?? 0) - liveCount,
							" off"
						]
					})]
				}), liveMarkers.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LiveMap, {
					markers: liveMarkers,
					height: 320,
					fitToMarkers: true
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid h-[320px] place-items-center text-sm text-muted-foreground",
					children: "No employees are sharing location right now."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [(employees ?? []).map((emp) => {
					const loc = locByUser.get(emp.id);
					const on = loc?.duty_on && loc.latitude !== 0;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setSelected(emp.id),
						className: "premium-card flex w-full items-center gap-3 p-3 text-left transition hover:bg-accent/40",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: `grid h-10 w-10 place-items-center rounded-full ${on ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`,
								children: on ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-5 w-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WifiOff, { className: "h-5 w-5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "truncate font-semibold",
									children: emp.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] uppercase text-muted-foreground",
									children: emp.role
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-right text-[11px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: on ? "font-semibold text-primary" : "font-semibold text-destructive",
									children: on ? "LIVE" : "OFF"
								}), loc && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-muted-foreground",
									children: timeAgo(loc.updated_at)
								})]
							})
						]
					}, emp.id);
				}), employees && employees.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "premium-card p-6 text-center text-sm text-muted-foreground",
					children: "No field employees yet."
				})]
			})
		]
	});
}
function EmployeeDetail({ userId, onBack }) {
	const qc = useQueryClient();
	const { data: profile } = useQuery({
		queryKey: ["profile", userId],
		queryFn: async () => {
			const { data } = await supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
			return data;
		}
	});
	const { data: current } = useQuery({
		queryKey: ["employee-location", userId],
		queryFn: async () => {
			const { data } = await supabase.from("employee_locations").select("*").eq("user_id", userId).maybeSingle();
			return data;
		},
		refetchInterval: 1e4
	});
	const { data: pings } = useQuery({
		queryKey: ["pings-today", userId],
		queryFn: async () => {
			const since = /* @__PURE__ */ new Date();
			since.setHours(0, 0, 0, 0);
			const { data } = await supabase.from("location_pings").select("latitude, longitude, recorded_at").eq("user_id", userId).gte("recorded_at", since.toISOString()).order("recorded_at", { ascending: true }).limit(1e3);
			return data ?? [];
		},
		refetchInterval: 2e4
	});
	(0, import_react.useEffect)(() => {
		const ch = supabase.channel(`emp-${userId}`).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "employee_locations",
			filter: `user_id=eq.${userId}`
		}, () => qc.invalidateQueries({ queryKey: ["employee-location", userId] })).on("postgres_changes", {
			event: "INSERT",
			schema: "public",
			table: "location_pings",
			filter: `user_id=eq.${userId}`
		}, () => qc.invalidateQueries({ queryKey: ["pings-today", userId] })).subscribe();
		return () => {
			supabase.removeChannel(ch);
		};
	}, [qc, userId]);
	const path = (pings ?? []).map((p) => ({
		lat: p.latitude,
		lng: p.longitude
	}));
	const on = current?.duty_on && current.latitude !== 0;
	const marker = on && current ? {
		lat: current.latitude,
		lng: current.longitude
	} : path.length > 0 ? path[path.length - 1] : void 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: onBack,
				className: "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "h-4 w-4" }), " Back"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-xl font-bold",
				children: profile?.full_name ?? profile?.email ?? "Employee"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-1 flex items-center gap-2 text-xs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `rounded-full px-2 py-0.5 font-semibold ${on ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`,
					children: on ? "LIVE" : "OFFLINE"
				}), current && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "mr-1 inline h-3 w-3" }), timeAgo(current.updated_at)]
				})]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LiveMap, {
				center: marker,
				marker,
				path,
				height: 380
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "premium-card p-3 text-xs",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-1 font-semibold",
						children: "Today's path"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-muted-foreground",
						children: [
							path.length,
							" points recorded",
							marker && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								" · ",
								"Last: ",
								marker.lat.toFixed(5),
								", ",
								marker.lng.toFixed(5)
							] })
						]
					}),
					marker && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: `https://www.google.com/maps?q=${marker.lat},${marker.lng}`,
						target: "_blank",
						rel: "noreferrer",
						className: "mt-2 inline-block text-primary underline",
						children: "Open in Google Maps"
					})
				]
			})
		]
	});
}
//#endregion
export { TrackingPage as component };
