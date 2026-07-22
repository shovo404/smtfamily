import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, n as useQuery, o as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { t as supabase } from "./client-DOjATiAz.mjs";
import { i as useCurrentUser } from "./use-current-user-DWDKqeGB.mjs";
import { E as Download, P as Calendar, T as FileText, m as Printer } from "../_libs/lucide-react.mjs";
import { t as require_jspdf_node_min } from "../_libs/jspdf.mjs";
import { t as autoTable } from "../_libs/jspdf-autotable.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reports-r4paAl8y.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_jspdf_node_min = /* @__PURE__ */ __toESM(require_jspdf_node_min());
function parseHHMM(s) {
	const [h, m] = s.split(":").map(Number);
	return {
		h: h || 0,
		m: m || 0
	};
}
function lateMinutes(checkIn, workDate, start) {
	if (!checkIn) return 0;
	const { h, m } = parseHHMM(start);
	const d = /* @__PURE__ */ new Date(`${workDate}T00:00:00`);
	d.setHours(h, m, 0, 0);
	const diff = Math.floor((new Date(checkIn).getTime() - d.getTime()) / 6e4);
	return diff > 0 ? diff : 0;
}
function fmtTime(iso) {
	if (!iso) return "---";
	return new Date(iso).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit"
	});
}
function monthLabel(ym) {
	const [y, m] = ym.split("-").map(Number);
	return new Date(y, m - 1, 1).toLocaleString(void 0, {
		month: "long",
		year: "numeric"
	});
}
function daysInMonth(ym) {
	const [y, m] = ym.split("-").map(Number);
	return new Date(y, m, 0).getDate();
}
function ReportsPage() {
	const { data: me } = useCurrentUser();
	const isAdmin = !!me?.isAdmin || !!me?.perms.viewReports;
	const now = /* @__PURE__ */ new Date();
	const [month, setMonth] = (0, import_react.useState)(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
	const [targetUserId, setTargetUserId] = (0, import_react.useState)(me?.user.id ?? "");
	const [view, setView] = (0, import_react.useState)("menu");
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
	const officeStart = hours?.start ?? "09:00";
	const { data: employees } = useQuery({
		queryKey: ["report-employees"],
		enabled: isAdmin,
		queryFn: async () => {
			const { data } = await supabase.from("profiles").select("id, full_name, email").order("full_name");
			return data ?? [];
		}
	});
	const uid = isAdmin ? targetUserId || me.user.id : me.user.id;
	const monthStart = `${month}-01`;
	const dim = daysInMonth(month);
	const monthEnd = `${month}-${String(dim).padStart(2, "0")}`;
	const { data: records } = useQuery({
		queryKey: [
			"report-attendance",
			uid,
			month
		],
		enabled: !!uid && view === "attendance",
		queryFn: async () => {
			const { data } = await supabase.from("attendance").select("*").eq("user_id", uid).gte("work_date", monthStart).lte("work_date", monthEnd).order("work_date", { ascending: true });
			return data ?? [];
		}
	});
	const targetProfile = (0, import_react.useMemo)(() => {
		if (!isAdmin) return {
			full_name: me?.profile?.full_name ?? "",
			email: me?.user.email ?? ""
		};
		return employees?.find((e) => e.id === uid) ?? {
			full_name: "",
			email: ""
		};
	}, [
		isAdmin,
		employees,
		uid,
		me
	]);
	const rows = (0, import_react.useMemo)(() => {
		const byDate = new Map((records ?? []).map((r) => [r.work_date, r]));
		return Array.from({ length: dim }, (_, i) => {
			const day = i + 1;
			const dateStr = `${month}-${String(day).padStart(2, "0")}`;
			const r = byDate.get(dateStr);
			const lm = r?.check_in ? lateMinutes(r.check_in, r.work_date, officeStart) : 0;
			return {
				day,
				dateStr,
				in: fmtTime(r?.check_in ?? null),
				out: fmtTime(r?.check_out ?? null),
				status: r?.check_in ? "PRESENT" : "---",
				late: lm
			};
		});
	}, [
		records,
		dim,
		month,
		officeStart
	]);
	const exportPDF = () => {
		const doc = new import_jspdf_node_min.default();
		doc.setFontSize(14);
		doc.text("SMT Family — Attendance Report", 14, 15);
		doc.setFontSize(10);
		doc.text(`Employee: ${targetProfile.full_name || targetProfile.email}`, 14, 23);
		doc.text(`Month: ${monthLabel(month)}`, 14, 29);
		doc.text(`Office hours start: ${officeStart}`, 14, 35);
		autoTable(doc, {
			startY: 40,
			head: [[
				"Date",
				"In",
				"Out",
				"Status",
				"Late"
			]],
			body: rows.map((r) => [
				r.day,
				r.in,
				r.out,
				r.status,
				r.late > 0 ? `${r.late}m` : "-"
			]),
			styles: { fontSize: 9 },
			headStyles: { fillColor: [
				22,
				78,
				45
			] }
		});
		doc.save(`attendance-${targetProfile.full_name || "user"}-${month}.pdf`);
	};
	const exportCSV = () => {
		const lines = [[
			"Date",
			"In",
			"Out",
			"Status",
			"Late (min)"
		].join(",")];
		for (const r of rows) lines.push([
			r.day,
			r.in,
			r.out,
			r.status,
			r.late
		].join(","));
		const blob = new Blob([lines.join("\n")], { type: "text/csv" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = `attendance-${targetProfile.full_name || "user"}-${month}.csv`;
		a.click();
		URL.revokeObjectURL(a.href);
	};
	if (view === "menu") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "text-2xl font-bold",
			children: "Report"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			onClick: () => setView("attendance"),
			className: "premium-card flex w-full items-center gap-4 p-4 text-left transition hover:bg-accent/40",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-6 w-6" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-semibold",
						children: "Attendance"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-muted-foreground",
						children: "Monthly attendance report"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted-foreground",
					children: "›"
				})
			]
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setView("menu"),
					className: "text-sm text-primary",
					children: "← Back"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-bold",
					children: "Attendance"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "premium-card space-y-3 p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "month",
							value: month,
							onChange: (e) => setMonth(e.target.value),
							className: "flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
						})]
					}),
					isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: uid,
						onChange: (e) => setTargetUserId(e.target.value),
						className: "w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
						children: (employees ?? []).map((emp) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: emp.id,
							children: emp.full_name || emp.email
						}, emp.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: exportPDF,
							className: "flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4" }), " PDF"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: exportCSV,
							className: "flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-accent",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Printer, { className: "h-4 w-4" }), " CSV"]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "premium-card overflow-hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-b border-border/40 px-4 py-3 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm font-semibold text-primary",
							children: monthLabel(month)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-primary/80",
							children: "Monthly Report"
						}),
						isAdmin && targetProfile.full_name && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-1 text-xs text-muted-foreground",
							children: targetProfile.full_name
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
							className: "bg-muted/40",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "border border-border/40 px-2 py-2 font-medium",
									children: "Date"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "border border-border/40 px-2 py-2 font-medium",
									children: "In"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "border border-border/40 px-2 py-2 font-medium",
									children: "Out"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "border border-border/40 px-2 py-2 font-medium",
									children: "Status"
								})
							] })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
							className: "text-center",
							children: rows.map((r) => {
								const present = r.status === "PRESENT";
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "border border-border/40 px-2 py-2 text-primary underline",
										children: r.day
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: `border border-border/40 px-2 py-2 ${present ? "text-emerald-500" : "text-muted-foreground"}`,
										children: r.in
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: `border border-border/40 px-2 py-2 ${present ? "text-emerald-500" : "text-muted-foreground"}`,
										children: r.out
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
										className: `border border-border/40 px-2 py-2 ${present ? "text-foreground" : "text-muted-foreground"}`,
										children: [r.status, r.late > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-[10px] text-yellow-500",
											children: [r.late, "m late"]
										})]
									})
								] }, r.day);
							})
						})]
					})
				})]
			})
		]
	});
}
//#endregion
export { ReportsPage as component };
