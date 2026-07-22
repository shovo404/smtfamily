import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, o as require_react, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { c as setRolePermission, f as useServerFn, o as setAppLogo, s as setOfficeHours } from "./admin-users.functions-CSvKPJsx.mjs";
import { t as supabase } from "./client-DOjATiAz.mjs";
import { n as PERMISSION_KEYS, r as PERMISSION_LABELS, t as ALL_ROLES } from "./use-current-user-DWDKqeGB.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { D as Clock, u as Shield, w as Image } from "../_libs/lucide-react.mjs";
import { t as useAdminGuard } from "./use-admin-guard-LpTzEJhU.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings-DhEkl7J9.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SettingsPage() {
	const { me, allowed } = useAdminGuard();
	const qc = useQueryClient();
	const setPermFn = useServerFn(setRolePermission);
	const setHoursFn = useServerFn(setOfficeHours);
	const { data: hours } = useQuery({
		queryKey: ["office-hours"],
		queryFn: async () => {
			const { data } = await supabase.from("app_settings").select("value").eq("key", "office_hours").maybeSingle();
			const v = data?.value ?? {};
			return {
				start: v.start ?? "09:00",
				end: v.end ?? "18:00"
			};
		}
	});
	const [start, setStart] = (0, import_react.useState)("09:00");
	const [end, setEnd] = (0, import_react.useState)("18:00");
	(0, import_react.useEffect)(() => {
		if (hours) {
			setStart(hours.start);
			setEnd(hours.end);
		}
	}, [hours]);
	const saveHours = useMutation({
		mutationFn: async () => {
			await setHoursFn({ data: {
				start,
				end
			} });
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["office-hours"] });
			toast.success("Office hours updated");
		},
		onError: (e) => toast.error(e instanceof Error ? e.message : "Failed")
	});
	const { data: rows } = useQuery({
		queryKey: ["role-permissions"],
		queryFn: async () => {
			const { data, error } = await supabase.from("role_permissions").select("role, permission, enabled");
			if (error) throw error;
			return data ?? [];
		},
		enabled: allowed
	});
	const toggle = useMutation({
		mutationFn: async (v) => {
			await setPermFn({ data: v });
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["role-permissions"] });
			qc.invalidateQueries({ queryKey: ["current-user"] });
			toast.success("Updated");
		},
		onError: (e) => toast.error(e instanceof Error ? e.message : "Failed")
	});
	if (!allowed || !me) return null;
	const canManageSettings = me.isAdmin || me.isHR;
	const canManagePerms = me.perms.managePermissions;
	const setLogoFn = useServerFn(setAppLogo);
	const logoFileRef = (0, import_react.useRef)(null);
	const [logoUploading, setLogoUploading] = (0, import_react.useState)(false);
	const { data: appLogo } = useQuery({
		queryKey: ["app-logo"],
		queryFn: async () => {
			const { data } = await supabase.from("app_settings").select("value").eq("key", "app_logo").maybeSingle();
			return (data?.value ?? {}).url || null;
		}
	});
	const handleLogoUpload = async (e) => {
		const file = e.target.files?.[0];
		if (!file || !me) return;
		setLogoUploading(true);
		try {
			const path = `app-logo/logo.${file.name.split(".").pop() || "png"}`;
			const { error: uploadErr } = await supabase.storage.from("profile-photos").upload(path, file, {
				upsert: true,
				contentType: file.type
			});
			if (uploadErr) throw uploadErr;
			const { data: urlData } = await supabase.storage.from("profile-photos").getPublicUrl(path);
			await setLogoFn({ data: { logoUrl: urlData.publicUrl } });
			qc.invalidateQueries({ queryKey: ["app-logo"] });
			toast.success("App logo updated");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setLogoUploading(false);
			if (logoFileRef.current) logoFileRef.current.value = "";
		}
	};
	if (!canManageSettings && !canManagePerms && !me.isAdmin) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "premium-card p-6 text-center text-sm text-muted-foreground",
		children: "You don't have permission to change settings."
	});
	const map = /* @__PURE__ */ new Map();
	for (const r of rows ?? []) map.set(`${r.role}:${r.permission}`, r.enabled);
	const isEnabled = (role, perm) => map.get(`${role}:${perm}`) ?? false;
	const editableRoles = ALL_ROLES;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid h-10 w-10 place-items-center rounded-lg bg-primary/20 text-primary",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-5 w-5" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-bold",
					children: "Settings"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Office hours & role permissions."
				})] })]
			}),
			canManageSettings && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "premium-card p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-semibold",
							children: "Office Hours"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-3 text-xs text-muted-foreground",
						children: "Anyone checking in after the start time will be marked as late."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mb-1 text-xs text-muted-foreground",
								children: "Start"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "time",
								value: start,
								onChange: (e) => setStart(e.target.value),
								className: "w-full rounded-md border border-border bg-background px-3 py-2"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mb-1 text-xs text-muted-foreground",
								children: "End"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "time",
								value: end,
								onChange: (e) => setEnd(e.target.value),
								className: "w-full rounded-md border border-border bg-background px-3 py-2"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 flex justify-end",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => saveHours.mutate(),
							disabled: saveHours.isPending,
							className: "rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50",
							children: saveHours.isPending ? "Saving…" : "Save Office Hours"
						})
					})
				]
			}),
			me.isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "premium-card p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-semibold",
							children: "App Logo"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-3 text-xs text-muted-foreground",
						children: "Change the app logo. Everyone will see the updated logo on the login page and app header."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-white p-2 shadow",
							children: appLogo ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: appLogo,
								alt: "App Logo",
								className: "h-full w-full object-contain"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image, { className: "h-6 w-6 text-muted-foreground" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => logoFileRef.current?.click(),
								disabled: logoUploading,
								className: "rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50",
								children: logoUploading ? "Uploading…" : appLogo ? "Change Logo" : "Upload Logo"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								ref: logoFileRef,
								type: "file",
								accept: "image/*",
								className: "hidden",
								onChange: handleLogoUpload
							})]
						})]
					})
				]
			}),
			!canManagePerms && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-center text-xs text-muted-foreground",
				children: "You don't have permission to edit role permissions."
			}),
			canManagePerms && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-4",
				children: editableRoles.map((role) => {
					const locked = role === "admin";
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "premium-card p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-3 flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-semibold uppercase tracking-wide",
								children: role.replace("_", " ")
							}), locked && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary",
								children: "Always full access"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-1 gap-2",
							children: PERMISSION_KEYS.map((perm) => {
								const on = locked ? true : isEnabled(role, perm);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: `flex cursor-pointer items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm ${locked ? "opacity-60" : "hover:bg-accent/40"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: PERMISSION_LABELS[perm] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: on,
										disabled: locked || toggle.isPending,
										onChange: (e) => toggle.mutate({
											role,
											permission: perm,
											enabled: e.target.checked
										}),
										className: "h-5 w-5 accent-primary"
									})]
								}, perm);
							})
						})]
					}, role);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-center text-xs text-muted-foreground",
				children: "Changes apply on next sign-in or page refresh for affected users."
			})
		]
	});
}
//#endregion
export { SettingsPage as component };
