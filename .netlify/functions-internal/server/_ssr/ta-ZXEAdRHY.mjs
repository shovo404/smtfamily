import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, o as require_react, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { t as supabase } from "./client-DOjATiAz.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { M as Check, g as Plus, t as X } from "../_libs/lucide-react.mjs";
import { t as useAdminGuard } from "./use-admin-guard-LpTzEJhU.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ta-ZXEAdRHY.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function TAPage() {
	const { me, allowed } = useAdminGuard();
	const qc = useQueryClient();
	const [showForm, setShowForm] = (0, import_react.useState)(false);
	const { data: list } = useQuery({
		queryKey: ["ta-requests"],
		queryFn: async () => {
			const { data, error } = await supabase.from("ta_requests").select("*").order("created_at", { ascending: false });
			if (error) throw error;
			const ids = [...new Set((data ?? []).map((r) => r.user_id))];
			const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
			const map = new Map(profiles?.map((p) => [p.id, p]) ?? []);
			return (data ?? []).map((r) => ({
				...r,
				profile: map.get(r.user_id)
			}));
		},
		enabled: allowed
	});
	const submit = useMutation({
		mutationFn: async (form) => {
			const { error } = await supabase.from("ta_requests").insert({
				user_id: me.user.id,
				from_location: String(form.get("from_location")),
				to_location: String(form.get("to_location")),
				travel_date: String(form.get("travel_date")),
				purpose: String(form.get("purpose") || ""),
				distance_km: Number(form.get("distance_km") || 0),
				transport_type: String(form.get("transport_type") || ""),
				requested_amount: Number(form.get("requested_amount") || 0),
				remarks: String(form.get("remarks") || "")
			});
			if (error) throw error;
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["ta-requests"] });
			toast.success("Submitted");
			setShowForm(false);
		},
		onError: (e) => toast.error(e instanceof Error ? e.message : "Failed")
	});
	const decide = useMutation({
		mutationFn: async ({ id, status, amount }) => {
			const { error } = await supabase.from("ta_requests").update({
				status,
				...amount !== void 0 ? { approved_amount: amount } : {}
			}).eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["ta-requests"] });
			toast.success("Updated");
		}
	});
	if (!allowed || !me) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-bold",
					children: "Travel Allowance"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Submit and approve TA requests."
				})] }), !me?.isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setShowForm(!showForm),
					className: "flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), "New Request"]
				})]
			}),
			showForm && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: (e) => {
					e.preventDefault();
					submit.mutate(new FormData(e.currentTarget));
				},
				className: "premium-card p-6 grid gap-3 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						name: "from_location",
						required: true,
						placeholder: "From",
						className: "rounded-md bg-input px-3 py-2 text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						name: "to_location",
						required: true,
						placeholder: "To",
						className: "rounded-md bg-input px-3 py-2 text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						name: "travel_date",
						type: "date",
						required: true,
						className: "rounded-md bg-input px-3 py-2 text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						name: "transport_type",
						placeholder: "Transport (bus, bike, etc.)",
						className: "rounded-md bg-input px-3 py-2 text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						name: "distance_km",
						type: "number",
						step: "0.1",
						placeholder: "Distance (km)",
						className: "rounded-md bg-input px-3 py-2 text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						name: "requested_amount",
						type: "number",
						required: true,
						placeholder: "Amount (BDT)",
						className: "rounded-md bg-input px-3 py-2 text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						name: "purpose",
						placeholder: "Purpose",
						className: "rounded-md bg-input px-3 py-2 text-sm sm:col-span-2"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						name: "remarks",
						placeholder: "Remarks",
						className: "rounded-md bg-input px-3 py-2 text-sm sm:col-span-2"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "sm:col-span-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground",
						children: "Submit"
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
								me?.isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-3 font-medium",
									children: "Employee"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-3 font-medium",
									children: "Route"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-3 font-medium",
									children: "Date"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-3 font-medium",
									children: "Amount"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-3 font-medium",
									children: "Status"
								}),
								me?.isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "px-4 py-3" })
							] })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [(list ?? []).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-t border-border/40",
							children: [
								me?.isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-4 py-3",
									children: r.profile?.full_name || r.profile?.email || "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-4 py-3",
									children: [
										r.from_location,
										" → ",
										r.to_location
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-4 py-3 text-muted-foreground",
									children: new Date(r.travel_date).toLocaleDateString()
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-4 py-3",
									children: [
										"৳",
										r.approved_amount ?? r.requested_amount,
										r.approved_amount !== null && r.approved_amount !== r.requested_amount && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "ml-1 text-xs text-muted-foreground line-through",
											children: ["৳", r.requested_amount]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-4 py-3",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `rounded-full px-2 py-0.5 text-xs ${r.status === "approved" ? "bg-primary/20 text-primary" : r.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}`,
										children: r.status
									})
								}),
								me?.isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-4 py-3 text-right",
									children: r.status === "pending" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-end gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => decide.mutate({
												id: r.id,
												status: "approved",
												amount: r.requested_amount
											}),
											className: "rounded-md bg-primary/20 p-2 text-primary hover:bg-primary/30",
											title: "Approve",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => decide.mutate({
												id: r.id,
												status: "rejected"
											}),
											className: "rounded-md bg-destructive/20 p-2 text-destructive hover:bg-destructive/30",
											title: "Reject",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
										})]
									})
								})
							]
						}, r.id)), (list ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							colSpan: me?.isAdmin ? 6 : 5,
							className: "px-4 py-10 text-center text-muted-foreground",
							children: "No TA requests yet."
						}) })] })]
					})
				})
			})
		]
	});
}
//#endregion
export { TAPage as component };
