import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { firebase } from "@/lib/firebase-client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { updateOwnProfilePhoto } from "@/lib/admin-users.functions";
import { Camera, User, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — SMT Family" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const isEditable = me?.isAdmin || me?.isHR;

  const save = useMutation({
    mutationFn: async (f: FormData) => {
      const { error } = await firebase.from("users").update({
        full_name: String(f.get("full_name")),
        phone: String(f.get("phone") || ""),
        department: String(f.get("department") || ""),
      }).eq("id", me!.user.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["current-user"] }); toast.success("Profile saved"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !me) return;
    setPhotoUploading(true);
    try {
      const path = `profiles/${me.user.id}`;
      const { error: uploadErr } = await firebase.storage
        .from("profile-photos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;

      const { data: urlData, error: urlErr } = await firebase.storage
        .from("profile-photos")
        .getPublicUrl(path);
      if (urlErr || !urlData?.publicUrl) throw urlErr || new Error("Failed to get public URL");

      await updateOwnProfilePhoto({ data: { photoUrl: urlData.publicUrl } });

      qc.invalidateQueries({ queryKey: ["current-user"] });
      toast.success("Profile picture updated");
    } catch (err) {
      console.error("[profile photo upload]", err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPhotoUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!me) return null;

  const photoUrl = me.profile?.photo_url;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="premium-card p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative">
            <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={photoUploading}
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
          <div className="text-center sm:text-left">
            <div className="text-lg font-semibold">{me.profile?.full_name || "User"}</div>
            <div className="text-sm text-muted-foreground">{me.user.email}</div>
          </div>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); isEditable && save.mutate(new FormData(e.currentTarget)); }}
        className="premium-card p-6 space-y-4">
        <div>
          <label className="text-xs font-medium">Full name</label>
          <input name="full_name" defaultValue={me.profile?.full_name ?? ""} disabled={!isEditable}
            className="mt-1 w-full rounded-md bg-input px-3 py-2 text-sm disabled:opacity-60" />
        </div>
        <div>
          <label className="text-xs font-medium">Email</label>
          <input value={me.user.email ?? ""} disabled className="mt-1 w-full rounded-md bg-input px-3 py-2 text-sm opacity-60" />
        </div>
        <div>
          <label className="text-xs font-medium">Phone</label>
          <input name="phone" defaultValue={me.profile?.phone ?? ""} disabled={!isEditable}
            className="mt-1 w-full rounded-md bg-input px-3 py-2 text-sm disabled:opacity-60" />
        </div>
        <div>
          <label className="text-xs font-medium">Department</label>
          <input name="department" defaultValue={me.profile?.department ?? ""} disabled={!isEditable}
            className="mt-1 w-full rounded-md bg-input px-3 py-2 text-sm disabled:opacity-60" />
        </div>
        {isEditable && (
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save</button>
        )}
        {!isEditable && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" /> Only admins and HR can edit profile details.
          </p>
        )}
      </form>
    </div>
  );
}
