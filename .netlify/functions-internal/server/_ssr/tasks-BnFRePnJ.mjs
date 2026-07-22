import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, o as require_react, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { t as supabase } from "./client-DOjATiAz.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { g as Plus } from "../_libs/lucide-react.mjs";
import { t as useAdminGuard } from "./use-admin-guard-LpTzEJhU.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/tasks-BnFRePnJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var STATUSES = [
	"pending",
	"in_progress",
	"completed",
	"overdue"
];
function TasksPage() {
	const { me, allowed } = useAdminGuard();
	const qc = useQueryClient();
	const [showForm, setShowForm] = (0, import_react.useState)(false);
	const { data: tasks } = useQuery({
		queryKey: ["tasks"],
		queryFn: async () => {
			const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
			if (error) throw error;
			return data;
		}
	});
	const { data: employees } = useQuery({
		queryKey: ["employees-simple"],
		queryFn: async () => {
			const { data } = await supabase.from("profiles").select("id, full_name, email");
			return data ?? [];
		},
		enabled: !!me?.isAdmin
	});
	const updateStatus = useMutation({
		mutationFn: async ({ id, status }) => {
			const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["tasks"] });
			toast.success("Updated");
		}
	});
	const createTask = useMutation({
		mutationFn: async (form) => {
			const { error } = await supabase.from("tasks").insert({
				title: form.title,
				description: form.description || null,
				assigned_to: form.assigned_to,
				assigned_by: me.user.id,
				due_date: form.due_date || null
			});
			if (error) throw error;
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["tasks"] });
			toast.success("Task created");
			setShowForm(false);
		},
		onError: (e) => toast.error(e instanceof Error ? e.message : "Failed")
	});
	const empName = (id) => employees?.find((e) => e.id === id)?.full_name ?? "—";
	if (!allowed) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-bold",
					children: "Tasks"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted-foreground",
					children: [tasks?.length ?? 0, " total"]
				})] }), me?.isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setShowForm(!showForm),
					className: "flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), "New Task"]
				})]
			}),
			showForm && me?.isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: (e) => {
					e.preventDefault();
					const f = new FormData(e.currentTarget);
					createTask.mutate({
						title: String(f.get("title")),
						description: String(f.get("description")),
						assigned_to: String(f.get("assigned_to")),
						due_date: String(f.get("due_date"))
					});
				},
				className: "premium-card p-6 grid gap-4 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						name: "title",
						required: true,
						placeholder: "Title",
						className: "rounded-md bg-input px-3 py-2 text-sm sm:col-span-2"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						name: "description",
						placeholder: "Description",
						className: "rounded-md bg-input px-3 py-2 text-sm sm:col-span-2"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						name: "assigned_to",
						required: true,
						className: "rounded-md bg-input px-3 py-2 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							children: "Assign to…"
						}), employees?.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: e.id,
							children: e.full_name || e.email
						}, e.id))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						name: "due_date",
						type: "date",
						className: "rounded-md bg-input px-3 py-2 text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "sm:col-span-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90",
						children: "Create"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "premium-card overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
							className: "bg-muted/40 text-left",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-3 font-medium",
									children: "Title"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-3 font-medium",
									children: "Assigned to"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-3 font-medium",
									children: "Due"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-3 font-medium",
									children: "Status"
								})
							] })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [(tasks ?? []).map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-t border-border/40",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-4 py-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-medium",
										children: t.title
									}), t.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xs text-muted-foreground line-clamp-1",
										children: t.description
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-4 py-3 text-muted-foreground",
									children: empName(t.assigned_to)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-4 py-3 text-muted-foreground",
									children: t.due_date ? new Date(t.due_date).toLocaleDateString() : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-4 py-3",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										value: t.status,
										onChange: (e) => updateStatus.mutate({
											id: t.id,
											status: e.target.value
										}),
										className: "rounded bg-input px-2 py-1 text-xs",
										children: STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: s,
											children: s
										}, s))
									})
								})
							]
						}, t.id)), (tasks ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							colSpan: 4,
							className: "px-4 py-10 text-center text-muted-foreground",
							children: "No tasks yet."
						}) })] })]
					})
				})
			})
		]
	});
}
//#endregion
export { TasksPage as component };
