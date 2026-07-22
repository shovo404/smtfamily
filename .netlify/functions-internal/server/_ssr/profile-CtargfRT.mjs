import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, i as useQueryClient, o as require_react, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { d as updateOwnProfilePhoto, f as useServerFn } from "./admin-users.functions-CSvKPJsx.mjs";
import { t as supabase } from "./client-DOjATiAz.mjs";
import { i as useCurrentUser } from "./use-current-user-DWDKqeGB.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { N as Camera, a as User, u as Shield } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/profile-CtargfRT.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ProfilePage() {
	const { data: me } = useCurrentUser();
	const qc = useQueryClient();
	const fileRef = (0, import_react.useRef)(null);
	const [photoUploading, setPhotoUploading] = (0, import_react.useState)(false);
	const isEditable = me?.isAdmin || me?.isHR;
	const updatePhotoFn = useServerFn(updateOwnProfilePhoto);
	const save = useMutation({
		mutationFn: async (f) => {
			const { error } = await supabase.from("profiles").update({
				full_name: String(f.get("full_name")),
				phone: String(f.get("phone") || ""),
				department: String(f.get("department") || "")
			}).eq("id", me.user.id);
			if (error) throw error;
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["current-user"] });
			toast.success("Profile saved");
		},
		onError: (e) => toast.error(e instanceof Error ? e.message : "Failed")
	});
	const handlePhotoUpload = async (e) => {
		const file = e.target.files?.[0];
		if (!file || !me) return;
		setPhotoUploading(true);
		try {
			const ext = file.name.split(".").pop() || "jpg";
			const path = `profiles/${me.user.id}.${ext}`;
			const { error: uploadErr } = await supabase.storage.from("profile-photos").upload(path, file, {
				upsert: true,
				contentType: file.type
			});
			if (uploadErr) throw uploadErr;
			const { data: urlData } = await supabase.storage.from("profile-photos").getPublicUrl(path);
			await updatePhotoFn({ data: { photoUrl: urlData.publicUrl } });
			qc.invalidateQueries({ queryKey: ["current-user"] });
			toast.success("Profile picture updated");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setPhotoUploading(false);
			if (fileRef.current) fileRef.current.value = "";
		}
	};
	if (!me) return null;
	const photoUrl = me.profile?.photo_url;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "max-w-2xl space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-bold",
				children: "Profile"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "premium-card p-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col items-center gap-4 sm:flex-row",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-muted",
								children: photoUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: photoUrl,
									alt: "Profile",
									className: "h-full w-full object-cover"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "h-10 w-10 text-muted-foreground" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => fileRef.current?.click(),
								disabled: photoUploading,
								className: "absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "h-4 w-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								ref: fileRef,
								type: "file",
								accept: "image/*",
								className: "hidden",
								onChange: handlePhotoUpload
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-center sm:text-left",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-lg font-semibold",
							children: me.profile?.full_name || "User"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm text-muted-foreground",
							children: me.user.email
						})]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: (e) => {
					e.preventDefault();
					isEditable && save.mutate(new FormData(e.currentTarget));
				},
				className: "premium-card p-6 space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-xs font-medium",
						children: "Full name"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						name: "full_name",
						defaultValue: me.profile?.full_name ?? "",
						disabled: !isEditable,
						className: "mt-1 w-full rounded-md bg-input px-3 py-2 text-sm disabled:opacity-60"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-xs font-medium",
						children: "Email"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: me.user.email ?? "",
						disabled: true,
						className: "mt-1 w-full rounded-md bg-input px-3 py-2 text-sm opacity-60"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-xs font-medium",
						children: "Phone"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						name: "phone",
						defaultValue: me.profile?.phone ?? "",
						disabled: !isEditable,
						className: "mt-1 w-full rounded-md bg-input px-3 py-2 text-sm disabled:opacity-60"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-xs font-medium",
						children: "Department"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						name: "department",
						defaultValue: me.profile?.department ?? "",
						disabled: !isEditable,
						className: "mt-1 w-full rounded-md bg-input px-3 py-2 text-sm disabled:opacity-60"
					})] }),
					isEditable && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground",
						children: "Save"
					}),
					!isEditable && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "flex items-center gap-2 text-xs text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-3 w-3" }), " Only admins and HR can edit profile details."]
					})
				]
			})
		]
	});
}
//#endregion
export { ProfilePage as component };
