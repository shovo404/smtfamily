import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, o as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { a as resetUserMonthAttendance, f as useServerFn, l as updateAttendanceTimes } from "./admin-users.functions-CSvKPJsx.mjs";
import { t as supabase } from "./client-DOjATiAz.mjs";
import { i as useCurrentUser } from "./use-current-user-DWDKqeGB.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { D as Clock, N as Camera, _ as Pencil, b as LogOut, f as RotateCcw, t as X, x as LogIn, y as MapPin } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/attendance-C68HVlP7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function todayStr() {
	return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
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
	const startDate = /* @__PURE__ */ new Date(`${workDate}T00:00:00`);
	startDate.setHours(h, m, 0, 0);
	const diff = Math.floor((new Date(checkIn).getTime() - startDate.getTime()) / 6e4);
	return diff > 0 ? diff : 0;
}
function fmtMins(mins) {
	if (mins <= 0) return "On time";
	const h = Math.floor(mins / 60);
	const m = mins % 60;
	return h > 0 ? `${h}h ${m}m late` : `${m}m late`;
}
function toLocalInput(iso) {
	if (!iso) return "";
	const d = new Date(iso);
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function getGPS() {
	return new Promise((resolve) => {
		if (!navigator.geolocation) return resolve(null);
		navigator.geolocation.getCurrentPosition((pos) => resolve({
			lat: pos.coords.latitude,
			lng: pos.coords.longitude
		}), () => resolve(null), {
			enableHighAccuracy: true,
			timeout: 1e4
		});
	});
}
function FaceCaptureModal({ title, onCancel, onCapture }) {
	const videoRef = (0, import_react.useRef)(null);
	const streamRef = (0, import_react.useRef)(null);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [err, setErr] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		(async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: {
						facingMode: "user",
						width: { ideal: 640 },
						height: { ideal: 480 }
					},
					audio: false
				});
				if (cancelled) {
					stream.getTracks().forEach((t) => t.stop());
					return;
				}
				streamRef.current = stream;
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
					await videoRef.current.play();
					setReady(true);
				}
			} catch (e) {
				setErr(e instanceof Error ? e.message : "Camera unavailable");
			}
		})();
		return () => {
			cancelled = true;
			streamRef.current?.getTracks().forEach((t) => t.stop());
		};
	}, []);
	const snap = async () => {
		const v = videoRef.current;
		if (!v) return;
		const canvas = document.createElement("canvas");
		canvas.width = v.videoWidth || 640;
		canvas.height = v.videoHeight || 480;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
		canvas.toBlob((blob) => {
			if (blob) onCapture(blob);
		}, "image/jpeg", .85);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 grid place-items-center bg-black/70 p-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "premium-card w-full max-w-md p-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "font-semibold",
						children: title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onCancel,
						className: "rounded p-1 hover:bg-accent",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 aspect-[4/3] w-full overflow-hidden rounded-md bg-black",
					children: err ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid h-full place-items-center p-4 text-center text-sm text-destructive",
						children: err
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
						ref: videoRef,
						playsInline: true,
						muted: true,
						className: "h-full w-full object-cover"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex justify-end gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onCancel,
						className: "rounded-md border border-border px-4 py-2 text-sm",
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						disabled: !ready || !!err,
						onClick: snap,
						className: "flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "h-4 w-4" }), "Capture"]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-xs text-muted-foreground",
					children: "Look at the camera. The photo is stored privately as attendance proof."
				})
			]
		})
	});
}
function AttendancePage() {
	const { data: me } = useCurrentUser();
	const qc = useQueryClient();
	const [captureMode, setCaptureMode] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const updateAttFn = useServerFn(updateAttendanceTimes);
	const resetAttFn = useServerFn(resetUserMonthAttendance);
	const handleReset = async (userId, name) => {
		const d = /* @__PURE__ */ new Date();
		const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
		if (!confirm(`Reset all attendance for ${name} in ${month}? This clears the month so they can check-in again today.`)) return;
		try {
			await resetAttFn({ data: {
				userId,
				month
			} });
			toast.success("Attendance reset");
			qc.invalidateQueries({ queryKey: ["attendance-admin"] });
			qc.invalidateQueries({ queryKey: ["attendance-today"] });
			qc.invalidateQueries({ queryKey: ["attendance-mine"] });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed");
		}
	};
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
	const officeEnd = hours?.end ?? "18:00";
	const { data: today } = useQuery({
		queryKey: ["attendance-today", me?.user.id],
		queryFn: async () => {
			const { data } = await supabase.from("attendance").select("*").eq("user_id", me.user.id).eq("work_date", todayStr()).maybeSingle();
			return data;
		},
		enabled: !!me
	});
	const monthStart = (() => {
		const d = /* @__PURE__ */ new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
	})();
	const { data: history } = useQuery({
		queryKey: [
			"attendance-mine",
			me?.user.id,
			monthStart
		],
		queryFn: async () => {
			const { data } = await supabase.from("attendance").select("*").eq("user_id", me.user.id).gte("work_date", monthStart).order("work_date", { ascending: false });
			return data ?? [];
		},
		enabled: !!me
	});
	const monthSummary = (() => {
		const rows = history ?? [];
		let present = 0, late = 0, totalHrs = 0;
		for (const a of rows) if (a.check_in) {
			present++;
			if (lateMinutes(a.check_in, a.work_date, officeStart) > 0) late++;
			if (a.check_out) totalHrs += (new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 36e5;
		}
		return {
			present,
			late,
			totalHrs
		};
	})();
	const { data: adminList } = useQuery({
		queryKey: ["attendance-admin", todayStr()],
		queryFn: async () => {
			const { data } = await supabase.from("attendance").select("*").eq("work_date", todayStr()).order("check_in", { ascending: false });
			const ids = [...new Set((data ?? []).map((a) => a.user_id))];
			const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
			const map = new Map(profiles?.map((p) => [p.id, p]) ?? []);
			return (data ?? []).map((a) => ({
				...a,
				profile: map.get(a.user_id)
			}));
		},
		enabled: !!me?.isAdmin
	});
	const saveEdit = async (check_in, check_out) => {
		if (!editing) return;
		try {
			await updateAttFn({ data: {
				attendanceId: editing.id,
				check_in: check_in ? new Date(check_in).toISOString() : null,
				check_out: check_out ? new Date(check_out).toISOString() : null
			} });
			toast.success("Attendance updated");
			setEditing(null);
			qc.invalidateQueries({ queryKey: ["attendance-admin"] });
			qc.invalidateQueries({ queryKey: ["attendance-today"] });
			qc.invalidateQueries({ queryKey: ["attendance-mine"] });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed");
		}
	};
	const uploadPhoto = async (blob, kind) => {
		const path = `${me.user.id}/${todayStr()}-${kind}-${Date.now()}.jpg`;
		const { error } = await supabase.storage.from("attendance-faces").upload(path, blob, {
			contentType: "image/jpeg",
			upsert: true
		});
		if (error) throw error;
		return path;
	};
	const handleCapture = async (blob) => {
		if (!me || !captureMode) return;
		const kind = captureMode;
		setCaptureMode(null);
		setBusy(true);
		try {
			const [photoPath, gps] = await Promise.all([uploadPhoto(blob, kind), getGPS()]);
			if (kind === "in") {
				const { error } = await supabase.from("attendance").upsert({
					user_id: me.user.id,
					work_date: todayStr(),
					check_in: (/* @__PURE__ */ new Date()).toISOString(),
					check_in_lat: gps?.lat ?? null,
					check_in_lng: gps?.lng ?? null,
					check_in_photo_url: photoPath,
					check_in_face_verified: true
				}, { onConflict: "user_id,work_date" });
				if (error) throw error;
				toast.success("Checked in");
			} else {
				const { error } = await supabase.from("attendance").update({
					check_out: (/* @__PURE__ */ new Date()).toISOString(),
					check_out_lat: gps?.lat ?? null,
					check_out_lng: gps?.lng ?? null,
					check_out_photo_url: photoPath,
					check_out_face_verified: true
				}).eq("user_id", me.user.id).eq("work_date", todayStr());
				if (error) throw error;
				toast.success("Checked out");
			}
			qc.invalidateQueries({ queryKey: ["attendance-today"] });
			qc.invalidateQueries({ queryKey: ["attendance-mine"] });
			qc.invalidateQueries({ queryKey: ["attendance-admin"] });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed");
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-bold",
				children: "Attendance"
			}), !me?.isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Face + GPS verified check-in / check-out for today."
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-1 flex items-center gap-1 text-[11px] text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-3 w-3" }),
					" Office hours: ",
					officeStart,
					" – ",
					officeEnd
				]
			})] })] }),
			!me?.isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "premium-card p-6 space-y-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-4 grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-muted-foreground",
							children: "Check In"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-1 text-lg font-semibold",
							children: today?.check_in ? new Date(today.check_in).toLocaleTimeString() : "—"
						}),
						today?.check_in_face_verified && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[10px] text-primary",
							children: "Face verified"
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-muted-foreground",
							children: "Check Out"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-1 text-lg font-semibold",
							children: today?.check_out ? new Date(today.check_out).toLocaleTimeString() : "—"
						}),
						today?.check_out_face_verified && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[10px] text-primary",
							children: "Face verified"
						})
					] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col sm:flex-row gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setCaptureMode("in"),
						disabled: !!today?.check_in || busy,
						className: "flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogIn, { className: "h-4 w-4" }), "Face Check In"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setCaptureMode("out"),
						disabled: !today?.check_in || !!today?.check_out || busy,
						className: "flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-40",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "h-4 w-4" }), "Face Check Out"]
					})]
				})]
			}),
			!me?.isAdmin && today && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "premium-card p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mb-2 text-xs uppercase tracking-wide text-muted-foreground",
					children: "Today's Summary"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-3 gap-3 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[10px] text-muted-foreground",
							children: "Check In"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-semibold",
							children: today.check_in ? new Date(today.check_in).toLocaleTimeString() : "—"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[10px] text-muted-foreground",
							children: "Check Out"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-semibold",
							children: today.check_out ? new Date(today.check_out).toLocaleTimeString() : "—"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[10px] text-muted-foreground",
							children: "Status"
						}), (() => {
							const lm = lateMinutes(today.check_in, today.work_date, officeStart);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: `font-semibold ${lm > 0 ? "text-yellow-400" : "text-primary"}`,
								children: today.check_in ? fmtMins(lm) : "—"
							});
						})()] })
					]
				})]
			}),
			!me?.isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "premium-card overflow-hidden",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-b border-border/40 px-4 py-3 flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-semibold",
							children: "This Month's Attendance"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[11px] text-muted-foreground",
							children: (/* @__PURE__ */ new Date()).toLocaleString(void 0, {
								month: "long",
								year: "numeric"
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-3 gap-2 border-b border-border/40 px-4 py-3 text-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] uppercase text-muted-foreground",
								children: "Present"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-lg font-semibold text-primary",
								children: monthSummary.present
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] uppercase text-muted-foreground",
								children: "Late"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-lg font-semibold text-yellow-400",
								children: monthSummary.late
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] uppercase text-muted-foreground",
								children: "Total Hrs"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-lg font-semibold",
								children: monthSummary.totalHrs.toFixed(1)
							})] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
								className: "bg-muted/40 text-left",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3 font-medium",
										children: "Date"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3 font-medium",
										children: "Check In"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3 font-medium",
										children: "Check Out"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3 font-medium",
										children: "Hours"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3 font-medium",
										children: "Late"
									})
								] })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [(history ?? []).map((a) => {
								const hours = a.check_in && a.check_out ? ((new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 36e5).toFixed(1) : "—";
								const lm = lateMinutes(a.check_in, a.work_date, officeStart);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-t border-border/40",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-3 font-medium",
											children: new Date(a.work_date).toLocaleDateString(void 0, {
												day: "2-digit",
												month: "short"
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-3 text-muted-foreground",
											children: a.check_in ? new Date(a.check_in).toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit"
											}) : "—"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-3 text-muted-foreground",
											children: a.check_out ? new Date(a.check_out).toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit"
											}) : "—"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-3 text-muted-foreground",
											children: hours
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: `px-4 py-3 text-xs ${lm > 0 ? "text-yellow-400" : "text-muted-foreground"}`,
											children: a.check_in ? fmtMins(lm) : "—"
										})
									]
								}, a.id);
							}), (history ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								colSpan: 5,
								className: "px-4 py-10 text-center text-muted-foreground",
								children: "No records this month yet."
							}) })] })]
						})
					})
				]
			}),
			me?.isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "premium-card overflow-hidden",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-b border-border/40 px-4 py-3 flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-semibold",
							children: "Today's Attendance (All Employees)"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
								className: "bg-muted/40 text-left",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3 font-medium",
										children: "Employee"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3 font-medium",
										children: "Check In"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3 font-medium",
										children: "Check Out"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3 font-medium",
										children: "Hours"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3 font-medium",
										children: "Late"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3 font-medium",
										children: "GPS"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3 font-medium",
										children: "Actions"
									})
								] })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [(adminList ?? []).map((a) => {
								const hours = a.check_in && a.check_out ? ((new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 36e5).toFixed(1) : "—";
								const lm = lateMinutes(a.check_in, a.work_date, officeStart);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-t border-border/40",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-3 font-medium",
											children: a.profile?.full_name || a.profile?.email || "—"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-3 text-muted-foreground",
											children: a.check_in ? new Date(a.check_in).toLocaleTimeString() : "—"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-3 text-muted-foreground",
											children: a.check_out ? new Date(a.check_out).toLocaleTimeString() : "—"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-3 text-muted-foreground",
											children: hours
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-3 text-xs",
											children: a.check_in ? lm > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "rounded-full bg-yellow-500/20 px-2 py-0.5 font-semibold text-yellow-300",
												children: fmtMins(lm)
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-primary",
												children: "On time"
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-muted-foreground",
												children: "—"
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-3 text-xs text-muted-foreground",
											children: a.check_in_lat != null ? `${a.check_in_lat.toFixed(3)}, ${a.check_in_lng?.toFixed(3)}` : "—"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-3",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex gap-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													onClick: () => setEditing({
														id: a.id,
														name: a.profile?.full_name || a.profile?.email || "Employee",
														check_in: a.check_in,
														check_out: a.check_out
													}),
													className: "inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-3 w-3" }), "Edit"]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													onClick: () => handleReset(a.user_id, a.profile?.full_name || a.profile?.email || "Employee"),
													className: "inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "h-3 w-3" }), "Reset"]
												})]
											})
										})
									]
								}, a.id);
							}), (adminList ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								colSpan: 7,
								className: "px-4 py-10 text-center text-muted-foreground",
								children: "No attendance today."
							}) })] })]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "border-t border-border/40 px-4 py-2 text-[11px] text-muted-foreground",
						children: "Face photos are stored privately and are not displayed here per policy."
					})
				]
			}),
			captureMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FaceCaptureModal, {
				title: captureMode === "in" ? "Face Check-In" : "Face Check-Out",
				onCancel: () => setCaptureMode(null),
				onCapture: handleCapture
			}),
			editing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditAttendanceModal, {
				record: editing,
				onCancel: () => setEditing(null),
				onSave: saveEdit
			})
		]
	});
}
function EditAttendanceModal({ record, onCancel, onSave }) {
	const [ci, setCi] = (0, import_react.useState)(toLocalInput(record.check_in));
	const [co, setCo] = (0, import_react.useState)(toLocalInput(record.check_out));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 grid place-items-center bg-black/70 p-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "premium-card w-full max-w-md p-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "font-semibold",
						children: ["Edit Attendance — ", record.name]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onCancel,
						className: "rounded p-1 hover:bg-accent",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 space-y-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-1 text-xs text-muted-foreground",
							children: "Check In"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "datetime-local",
							value: ci,
							onChange: (e) => setCi(e.target.value),
							className: "w-full rounded-md border border-border bg-background px-3 py-2"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-1 text-xs text-muted-foreground",
							children: "Check Out"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "datetime-local",
							value: co,
							onChange: (e) => setCo(e.target.value),
							className: "w-full rounded-md border border-border bg-background px-3 py-2"
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex justify-end gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onCancel,
						className: "rounded-md border border-border px-4 py-2 text-sm",
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => onSave(ci || null, co || null),
						className: "rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground",
						children: "Save"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-[11px] text-muted-foreground",
					children: "Times are in your local timezone. Late status will be recalculated automatically."
				})
			]
		})
	});
}
//#endregion
export { AttendancePage as component };
