import { o as __toESM } from "../_runtime.mjs";
import { f as Outlet, g as Link, l as useRouterState, v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, o as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { t as supabase } from "./client-DOjATiAz.mjs";
import { i as useCurrentUser } from "./use-current-user-DWDKqeGB.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { F as Bell, O as ClipboardList, S as LayoutDashboard, T as FileText, b as LogOut, i as Users, k as CircleUser, p as Radar, r as Wallet, t as X, u as Shield, v as Menu, y as MapPin } from "../_libs/lucide-react.mjs";
import { t as smt_logo_png_asset_default } from "./smt-logo.png.asset-DvYbMbFh.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/route-Bt5cwjp9.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var MIN_INSERT_INTERVAL_MS = 3e4;
var MIN_MOVE_METERS = 15;
function distanceMeters(a, b) {
	const R = 6371e3;
	const toRad = (v) => v * Math.PI / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(s));
}
function useLocationTracker() {
	const { data: me } = useCurrentUser();
	const watchId = (0, import_react.useRef)(null);
	const lastInsert = (0, import_react.useRef)(null);
	const lastKnown = (0, import_react.useRef)(null);
	const notifiedOff = (0, import_react.useRef)(false);
	const shouldTrack = !!me && (me.isField || me.isDHR) && !me.isAdmin && !me.isHR;
	const userId = me?.user.id;
	const fullName = me?.profile?.full_name ?? me?.user.email ?? "Unknown user";
	const roleLabel = me?.roles.has("dhr") ? "DHR" : me?.roles.has("fso") ? "FSO" : me?.roles.has("sr") ? "SR" : "Field";
	(0, import_react.useEffect)(() => {
		if (!shouldTrack || !userId) return;
		if (typeof window === "undefined" || !navigator.geolocation) return;
		supabase.from("employee_locations").select("latitude, longitude, accuracy, updated_at").eq("user_id", userId).maybeSingle().then(({ data }) => {
			if (data && (Number(data.latitude) || Number(data.longitude))) lastKnown.current = {
				lat: Number(data.latitude),
				lng: Number(data.longitude),
				acc: data.accuracy ?? null,
				at: data.updated_at ?? (/* @__PURE__ */ new Date()).toISOString()
			};
		});
		const notifyOff = async (reason) => {
			if (notifiedOff.current) return;
			notifiedOff.current = true;
			const lk = lastKnown.current;
			try {
				if (lk) await supabase.from("employee_locations").upsert({
					user_id: userId,
					latitude: lk.lat,
					longitude: lk.lng,
					accuracy: lk.acc,
					duty_on: false,
					updated_at: (/* @__PURE__ */ new Date()).toISOString()
				});
				else await supabase.from("employee_locations").upsert({
					user_id: userId,
					latitude: 0,
					longitude: 0,
					duty_on: false,
					updated_at: (/* @__PURE__ */ new Date()).toISOString()
				});
				const coordText = lk ? ` • last @ ${lk.lat.toFixed(5)}, ${lk.lng.toFixed(5)}` : " • no last known location";
				await supabase.from("notifications").insert({
					type: "location_off",
					title: `${roleLabel} location OFF — ${fullName}`,
					message: `${reason}${coordText}`,
					actor_user_id: userId,
					meta: {
						at: (/* @__PURE__ */ new Date()).toISOString(),
						reason,
						role: roleLabel,
						name: fullName,
						last_known: lk ? {
							latitude: lk.lat,
							longitude: lk.lng,
							accuracy: lk.acc,
							at: lk.at,
							maps_url: `https://www.google.com/maps?q=${lk.lat},${lk.lng}`
						} : null
					}
				});
			} catch (e) {
				console.error("notifyOff failed", e);
			}
		};
		const onPos = async (pos) => {
			notifiedOff.current = false;
			const lat = pos.coords.latitude;
			const lng = pos.coords.longitude;
			const acc = pos.coords.accuracy ?? null;
			const speed = pos.coords.speed ?? null;
			const now = Date.now();
			const iso = (/* @__PURE__ */ new Date()).toISOString();
			lastKnown.current = {
				lat,
				lng,
				acc,
				at: iso
			};
			await supabase.from("employee_locations").upsert({
				user_id: userId,
				latitude: lat,
				longitude: lng,
				accuracy: acc,
				speed,
				duty_on: true,
				updated_at: iso
			});
			const last = lastInsert.current;
			const moved = last ? distanceMeters({
				lat: last.lat,
				lng: last.lng
			}, {
				lat,
				lng
			}) : Infinity;
			if (!last || now - last.t >= MIN_INSERT_INTERVAL_MS || moved >= MIN_MOVE_METERS) {
				lastInsert.current = {
					t: now,
					lat,
					lng
				};
				await supabase.from("location_pings").insert({
					user_id: userId,
					latitude: lat,
					longitude: lng,
					accuracy: acc,
					speed
				});
			}
		};
		const onErr = (err) => {
			const reason = err.code === err.PERMISSION_DENIED ? "User denied location permission" : err.code === err.POSITION_UNAVAILABLE ? "GPS/position unavailable" : err.code === err.TIMEOUT ? "Location request timed out" : "Unknown location error";
			toast.error(`Location: ${reason}`);
			notifyOff(reason);
		};
		watchId.current = navigator.geolocation.watchPosition(onPos, onErr, {
			enableHighAccuracy: true,
			maximumAge: 1e4,
			timeout: 2e4
		});
		let permStatus = null;
		const onPermChange = () => {
			if (permStatus?.state === "denied") notifyOff("Location permission revoked");
		};
		if (navigator.permissions?.query) navigator.permissions.query({ name: "geolocation" }).then((s) => {
			permStatus = s;
			if (s.state === "denied") notifyOff("Location permission is denied");
			s.addEventListener("change", onPermChange);
		}).catch(() => {});
		return () => {
			if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
			watchId.current = null;
			permStatus?.removeEventListener("change", onPermChange);
		};
	}, [
		shouldTrack,
		userId,
		fullName,
		roleLabel
	]);
}
var NAV = [
	{
		to: "/dashboard",
		label: "Home",
		icon: LayoutDashboard,
		show: (me) => me.isStaff
	},
	{
		to: "/employees",
		label: "Team",
		icon: Users,
		show: (me) => me.perms.manageEmployees || me.isDHR
	},
	{
		to: "/tracking",
		label: "Track",
		icon: Radar,
		show: (me) => me.perms.viewLiveTracking
	},
	{
		to: "/tasks",
		label: "Tasks",
		icon: ClipboardList,
		show: (me) => me.perms.viewTasks
	},
	{
		to: "/attendance",
		label: "Attend",
		icon: MapPin,
		show: () => true
	},
	{
		to: "/reports",
		label: "Report",
		icon: FileText,
		show: () => true
	},
	{
		to: "/ta",
		label: "TA",
		icon: Wallet,
		show: (me) => me.perms.viewTA
	},
	{
		to: "/notifications",
		label: "Alerts",
		icon: Bell,
		show: (me) => me.isAdmin
	},
	{
		to: "/settings",
		label: "Perms",
		icon: Shield,
		show: (me) => me.perms.managePermissions
	},
	{
		to: "/profile",
		label: "Me",
		icon: CircleUser,
		show: () => true
	}
];
function roleLabel(me) {
	if (!me) return null;
	if (me.roles.has("admin") || me.isSuperAdmin) return "Admin";
	if (me.roles.has("hr")) return "HR";
	if (me.roles.has("dhr")) return "DHR";
	if (me.roles.has("fso")) return "FSO";
	if (me.roles.has("sr")) return "SR";
	return null;
}
function AppShell({ children }) {
	const { data: me } = useCurrentUser();
	const navigate = useNavigate();
	const qc = useQueryClient();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const [drawerOpen, setDrawerOpen] = (0, import_react.useState)(false);
	const nav = me ? NAV.filter((n) => n.show(me)) : [];
	const badge = roleLabel(me);
	const useDrawer = !!me?.isStaff;
	useLocationTracker();
	const { data: appLogo } = useQuery({
		queryKey: ["app-logo"],
		queryFn: async () => {
			const { data } = await supabase.from("app_settings").select("value").eq("key", "app_logo").maybeSingle();
			return (data?.value ?? {}).url || null;
		}
	});
	const logoUrl = appLogo || smt_logo_png_asset_default.url;
	(0, import_react.useEffect)(() => {
		setDrawerOpen(false);
	}, [pathname]);
	const { data: unread } = useQuery({
		queryKey: ["notifications-unread"],
		enabled: !!me?.isAdmin,
		queryFn: async () => {
			const { count } = await supabase.from("notifications").select("id", {
				count: "exact",
				head: true
			}).eq("is_read", false);
			return count ?? 0;
		},
		refetchInterval: 2e4
	});
	(0, import_react.useEffect)(() => {
		if (!me?.isAdmin) return;
		const ch = supabase.channel("notif-badge").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "notifications"
		}, () => qc.invalidateQueries({ queryKey: ["notifications-unread"] })).subscribe();
		return () => {
			supabase.removeChannel(ch);
		};
	}, [me?.isAdmin, qc]);
	const signOut = async () => {
		await qc.cancelQueries();
		qc.clear();
		await supabase.auth.signOut();
		navigate({
			to: "/auth",
			replace: true
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `mx-auto flex min-h-screen w-full flex-col bg-transparent ${useDrawer ? "max-w-7xl" : "max-w-md"}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "glass sticky top-0 z-30 flex items-center gap-3 px-4",
				style: {
					paddingTop: "max(env(safe-area-inset-top), 0.5rem)",
					paddingBottom: "0.5rem"
				},
				children: [
					useDrawer && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setDrawerOpen(true),
						"aria-label": "Open menu",
						className: "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/60 text-foreground hover:bg-accent",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "h-5 w-5" }), !!unread && unread > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "absolute mt-[-18px] ml-[18px] min-w-[16px] rounded-full bg-destructive px-1 text-[9px] font-bold leading-4 text-destructive-foreground",
							children: unread > 9 ? "9+" : unread
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white p-1 shadow",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: logoUrl,
							alt: "SMT",
							className: "h-full w-full object-contain"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "truncate text-sm font-bold leading-tight",
							children: "SMT Family"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "truncate text-[10px] leading-tight text-primary",
							lang: "bn",
							children: "সেরা মানের সেরা উপহার"
						})]
					}),
					badge && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary",
						children: badge
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: signOut,
						"aria-label": "Sign out",
						className: "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/60 text-muted-foreground hover:text-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "h-4 w-4" })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
				className: "flex-1 px-4 pt-4",
				style: { paddingBottom: useDrawer ? "calc(env(safe-area-inset-bottom) + 1.5rem)" : "calc(env(safe-area-inset-bottom) + 5.5rem)" },
				children
			}),
			useDrawer && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				onClick: () => setDrawerOpen(false),
				className: `fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ${drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"}`
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: `glass fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-sidebar-border/60 transition-transform ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`,
				style: {
					paddingTop: "max(env(safe-area-inset-top), 0.5rem)",
					paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)"
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 px-4 pb-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white p-1 shadow",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: logoUrl,
									alt: "SMT",
									className: "h-full w-full object-contain"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "truncate text-sm font-bold",
									children: "SMT Family"
								}), badge && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] font-semibold text-primary",
									children: badge
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setDrawerOpen(false),
								"aria-label": "Close menu",
								className: "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/60 hover:bg-accent",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-4 mb-2 h-px bg-sidebar-border/60" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						className: "flex-1 overflow-y-auto px-2 py-2",
						children: nav.map((item) => {
							const active = pathname.startsWith(item.to);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: item.to,
								className: `mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active ? "bg-primary/15 text-primary" : "text-foreground/80 hover:bg-accent/60"}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, { className: "h-5 w-5" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "flex-1",
										children: item.label
									}),
									item.to === "/notifications" && !!unread && unread > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "min-w-[20px] rounded-full bg-destructive px-1.5 text-center text-[10px] font-bold leading-5 text-destructive-foreground",
										children: unread > 9 ? "9+" : unread
									})
								]
							}, item.to);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "px-4 pt-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: signOut,
							className: "flex w-full items-center justify-center gap-2 rounded-xl bg-accent/60 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "h-4 w-4" }), " Sign out"]
						})
					})
				]
			})] }),
			!useDrawer && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "glass fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-md items-stretch justify-around border-t border-sidebar-border/60 px-1",
				style: {
					paddingBottom: "max(env(safe-area-inset-bottom), 0.35rem)",
					paddingTop: "0.35rem"
				},
				children: nav.map((item) => {
					const active = pathname.startsWith(item.to);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: item.to,
						className: `relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium transition ${active ? "text-primary" : "text-muted-foreground"}`,
						children: [
							active && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, { className: `h-5 w-5 ${active ? "scale-110" : ""} transition-transform` }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate",
								children: item.label
							})
						]
					}, item.to);
				})
			})
		]
	});
}
var SplitComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) });
//#endregion
export { SplitComponent as component };
