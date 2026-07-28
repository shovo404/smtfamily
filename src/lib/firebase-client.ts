import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Keep the existing UI imports stable during the Firebase → Supabase migration.
// This compatibility name can be renamed to `supabase` incrementally later.
export const firebase = {
  auth: supabase.auth,
  from: supabase.from.bind(supabase),
  channel: supabase.channel.bind(supabase),
  removeChannel: supabase.removeChannel.bind(supabase),
  storage: {
    from: (bucket: string) => ({
      upload: (path: string, file: Blob | Uint8Array | ArrayBuffer, options?: { upsert?: boolean; contentType?: string }) =>
        supabase.storage.from(bucket).upload(path, file, {
          upsert: options?.upsert,
          contentType: options?.contentType,
        }),
      getPublicUrl: async (path: string) => {
        return supabase.storage.from(bucket).getPublicUrl(path);
      },
    }),
  },
};
