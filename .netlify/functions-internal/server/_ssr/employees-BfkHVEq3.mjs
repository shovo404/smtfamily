import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, o as require_react, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { f as useServerFn, i as resetEmployeePassword, n as createEmployee, r as deleteEmployee, t as changeEmployeeRole, u as updateEmployeeProfile } from "./admin-users.functions-CSvKPJsx.mjs";
import { t as supabase } from "./client-DOjATiAz.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { C as KeyRound, _ as Pencil, d as Search, g as Plus, h as Power, l as Trash2, t as X } from "../_libs/lucide-react.mjs";
import { t as useAdminGuard } from "./use-admin-guard-LpTzEJhU.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/employees-BfkHVEq3.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function EmployeesPage() {
	const { me, allowed } = useAdminGuard();
	const qc = useQueryClient();
	const [q, setQ] = (0, import_react.useState)("");
	const [showForm, setShowForm] = (0, import_react.useState)(false);
	const createFn = useServerFn(createEmployee);
	const resetFn = useServerFn(resetEmployeePassword);
	const deleteFn = useServerFn(deleteEmployee);
	const changeRoleFn = useServerFn(changeEmployeeRole);
	const updateProfileFn = useServerFn(updateEmployeeProfile);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const { data: list } = useQuery({
		queryKey: ["employees"],
		queryFn: async () => {
			const { data: profiles, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
			if (error) throw error;
			const { data: roles } = await supabase.from("user_roles").select("user_id, role");
			const roleMap = /* @__PURE__ */ new Map();
			(roles ?? []).forEach((r) => {
				const arr = roleMap.get(r.user_id) ?? [];
				arr.push(r.role);
				roleMap.set(r.user_id, arr);
			});
			return (profiles ?? []).map((p) => ({
				...p,
				roles: roleMap.get(p.id) ?? []
			}));
		},
		enabled: allowed
	});
	const toggleActive = useMutation({
		mutationFn: async ({ id, is_active }) => {
			const { error } = await supabase.from("profiles").update({ is_active }).eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["employees"] });
			toast.success("Updated");
		},
		onError: (e) => toast.error(e instanceof Error ? e.message : "Failed")
	});
	const setRole = useMutation({
		mutationFn: async ({ userId, role }) => {
			await changeRoleFn({ data: {
				userId,
				role
			} });
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["employees"] });
			toast.success("Role updated");
		},
		onError: (e) => toast.error(e instanceof Error ? e.message : "Failed")
	});
	const resetPw = useMutation({
		mutationFn: async ({ userId, newPassword }) => {
			await resetFn({ data: {
				userId,
				newPassword
			} });
		},
		onSuccess: () => toast.success("Password reset"),
		onError: (e) => toast.error(e instanceof Error ? e.message : "Failed")
	});
	const remove = useMutation({
		mutationFn: async ({ userId }) => {
			await deleteFn({ data: { userId } });
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["employees"] });
			toast.success("Employee deleted");
		},
		onError: (e) => toast.error(e instanceof Error ? e.message : "Failed")
	});
	const updateProfile = useMutation({
		mutationFn: async (f) => {
			if (!editing) return;
			await updateProfileFn({ data: {
				userId: editing.id,
				full_name: String(f.get("full_name")),
				phone: String(f.get("phone") || ""),
				department: String(f.get("department") || "")
			} });
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["employees"] });
			qc.invalidateQueries({ queryKey: ["current-user"] });
			toast.success("Profile updated");
			setEditing(null);
		},
		onError: (e) => toast.error(e instanceof Error ? e.message : "Failed")
	});
	const create = useMutation({
		mutationFn: async (form) => {
			await createFn({ data: {
				email: String(form.get("email")).trim(),
				password: String(form.get("password")),
				full_name: String(form.get("full_name")),
				phone: String(form.get("phone") || "") || void 0,
				department: String(form.get("department") || "") || void 0,
				role: String(form.get("role"))
			} });
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["employees"] });
			toast.success("Employee created");
			setShowForm(false);
		},
		onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create")
	});
	if (!allowed || !me) return null;
	const canManage = me.perms.manageEmployees;
	const canDelete = me.perms.deleteEmployees;
	const canReset = me.perms.resetPasswords;
	const canChangeRole = me.perms.changeRoles;
	const viewOnly = me.isDHR;
	const assignableRoles = [
		"admin",
		"hr",
		"dhr",
		"sr",
		"fso"
	];
	const filtered = (list ?? []).filter((e) => (e.full_name ?? "").toLowerCase().includes(q.toLowerCase()) || (e.email ?? "").toLowerCase().includes(q.toLowerCase()));
	const handleReset = (userId, name) => {
		const pw = window.prompt(`New password for ${name} (min 6 chars):`);
		if (!pw) return;
		resetPw.mutate({
			userId,
			newPassword: pw
		});
	};
	const handleDelete = (userId, name) => {
		if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
		remove.mutate({ userId });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-bold",
				children: "Employees"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted-foreground",
				children: [filtered.length, " employees"]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: q,
						onChange: (e) => setQ(e.target.value),
						placeholder: "Search…",
						className: "w-full rounded-md bg-input pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
					})]
				}), canManage && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setShowForm(!showForm),
					className: "flex shrink-0 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), "Add"]
				})]
			}),
			showForm && canManage && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: (e) => {
					e.preventDefault();
					create.mutate(new FormData(e.currentTarget));
				},
				className: "premium-card p-4 grid gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						name: "full_name",
						required: true,
						placeholder: "Full name",
						className: "rounded-md bg-input px-3 py-2 text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						name: "email",
						type: "email",
						required: true,
						placeholder: "Email",
						className: "rounded-md bg-input px-3 py-2 text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						name: "password",
						required: true,
						minLength: 6,
						placeholder: "Temporary password (min 6)",
						className: "rounded-md bg-input px-3 py-2 text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						name: "role",
						required: true,
						defaultValue: "sr",
						className: "rounded-md bg-input px-3 py-2 text-sm",
						children: assignableRoles.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: r,
							children: r.toUpperCase()
						}, r))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						name: "phone",
						placeholder: "Phone",
						className: "rounded-md bg-input px-3 py-2 text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						name: "department",
						placeholder: "Department",
						className: "rounded-md bg-input px-3 py-2 text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2 justify-end",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setShowForm(false),
							className: "rounded-md border border-border px-4 py-2 text-sm",
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							disabled: create.isPending,
							className: "rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50",
							children: create.isPending ? "Creating…" : "Create"
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [filtered.map((emp) => {
					const isSuper = emp.roles.includes("super_admin");
					const canEditThis = canChangeRole;
					const canDeleteThis = canDelete && emp.id !== me.user.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "premium-card p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "truncate font-semibold",
										children: emp.full_name || "—"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "truncate text-xs text-muted-foreground",
										children: emp.email
									}),
									emp.phone && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xs text-muted-foreground",
										children: emp.phone
									}),
									emp.department && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xs text-muted-foreground",
										children: emp.department
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `shrink-0 rounded-full px-2 py-0.5 text-[10px] ${emp.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`,
								children: emp.is_active ? "Active" : "Inactive"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex flex-wrap items-center gap-2",
							children: [canEditThis && !viewOnly ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: emp.roles[0] ?? "sr",
								onChange: (e) => setRole.mutate({
									userId: emp.id,
									role: e.target.value
								}),
								className: "rounded bg-input px-2 py-1 text-xs",
								children: [assignableRoles.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: r,
									children: r.toUpperCase()
								}, r)), isSuper && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "super_admin",
									children: "ADMIN (legacy)"
								})]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded bg-accent/60 px-2 py-1 text-xs uppercase",
								children: emp.roles[0] ?? "sr"
							}), !viewOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setEditing({
										id: emp.id,
										full_name: emp.full_name || "",
										phone: emp.phone || "",
										department: emp.department || ""
									}),
									className: "rounded-md border border-border p-2 hover:bg-accent",
									title: "Edit profile",
									disabled: !canManage,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-4 w-4" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => toggleActive.mutate({
										id: emp.id,
										is_active: !emp.is_active
									}),
									className: "ml-auto rounded-md border border-border p-2 hover:bg-accent",
									title: "Toggle active",
									disabled: !canManage,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Power, { className: "h-4 w-4" })
								}),
								canReset && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => handleReset(emp.id, emp.full_name || emp.email || "user"),
									className: "rounded-md border border-border p-2 hover:bg-accent",
									title: "Reset password",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "h-4 w-4" })
								}),
								canDeleteThis && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => handleDelete(emp.id, emp.full_name || emp.email || "user"),
									className: "rounded-md border border-destructive/40 p-2 text-destructive hover:bg-destructive/10",
									title: "Delete",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
								})
							] })]
						})]
					}, emp.id);
				}), filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "premium-card p-10 text-center text-sm text-muted-foreground",
					children: "No employees found."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-center text-xs text-muted-foreground",
				children: viewOnly ? "You have view-only access." : "Only Super Admin, Admin, and HR can create employees."
			}),
			editing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-50 grid place-items-center bg-black/70 p-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "premium-card w-full max-w-md p-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "font-semibold",
							children: "Edit Employee"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setEditing(null),
							className: "rounded p-1 hover:bg-accent",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: (e) => {
							e.preventDefault();
							updateProfile.mutate(new FormData(e.currentTarget));
						},
						className: "mt-4 space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								name: "full_name",
								defaultValue: editing.full_name,
								required: true,
								className: "w-full rounded-md bg-input px-3 py-2 text-sm",
								placeholder: "Full name"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								name: "phone",
								defaultValue: editing.phone,
								className: "w-full rounded-md bg-input px-3 py-2 text-sm",
								placeholder: "Phone"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								name: "department",
								defaultValue: editing.department,
								className: "w-full rounded-md bg-input px-3 py-2 text-sm",
								placeholder: "Department"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-end gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setEditing(null),
									className: "rounded-md border border-border px-4 py-2 text-sm",
									children: "Cancel"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									disabled: updateProfile.isPending,
									className: "rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50",
									children: updateProfile.isPending ? "Saving…" : "Save"
								})]
							})
						]
					})]
				})
			})
		]
	});
}
//#endregion
export { EmployeesPage as component };
