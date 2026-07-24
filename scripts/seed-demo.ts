import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env");
  if (!existsSync(envPath)) {
    console.error("Missing .env file. Copy .env.example to .env and set your keys.");
    process.exit(1);
  }
  const text = readFileSync(envPath, "utf-8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  console.error("Missing VITE_SUPABASE_URL in .env");
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY in .env\n" +
    "Add: SUPABASE_SERVICE_ROLE_KEY=your_service_role_key\n" +
    "Get it from: Supabase Dashboard → Project Settings → API → service_role key"
  );
  process.exit(1);
}
if (!ANON_KEY) {
  console.error("Missing VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_USERS = [
  { email: "shovo@smt.family", password: "shovo@1234", role: "super_admin", name: "Shovo", id: "SA-001" },
  { email: "admin@smt.family",  password: "Admin@1234",  role: "admin",       name: "Admin User",  id: "AD-001" },
  { email: "hr@smt.family",     password: "Hr@1234",     role: "hr",          name: "HR Manager",  id: "HR-001" },
  { email: "dsr@smt.family",    password: "Dsr@1234",    role: "dsr",         name: "DSR Agent",   id: "DS-001" },
  { email: "sr@smt.family",     password: "Sr@1234",     role: "sr",          name: "SR Agent",    id: "SR-001" },
];

async function seed() {
  console.log(`\n🔌 Connecting to Supabase: ${SUPABASE_URL}\n`);

  for (const u of DEMO_USERS) {
    process.stdout.write(`  ${u.email} … `);

    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing?.users?.find((user: any) => user.email === u.email);

    if (found) {
      console.log(`✅ already exists (uid: ${found.id})`);
      const { error: updateErr } = await admin
        .from("users")
        .update({ role: u.role, full_name: u.name, employee_id: u.id, is_active: true, updated_at: new Date().toISOString() })
        .eq("id", found.id);
      if (updateErr) console.error(`  ⚠️  profile update failed: ${updateErr.message}`);
      else console.log(`  ✅ profile updated`);
      continue;
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.name },
    });

    if (createErr) {
      console.error(`❌ creation failed: ${createErr.message}`);
      continue;
    }

    if (!created?.user) {
      console.error("❌ no user returned");
      continue;
    }

    const uid = created.user.id;
    console.log(`✅ created (uid: ${uid})`);

    const { error: profileErr } = await admin
      .from("users")
      .update({
        full_name: u.name,
        email: u.email,
        role: u.role,
        employee_id: u.id,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", uid);

    if (profileErr) {
      console.error(`  ❌ profile update failed: ${profileErr.message}`);
    } else {
      console.log(`  ✅ profile set: role=${u.role}, employee_id=${u.id}`);
    }
  }

  const PERMISSION_SEEDS = [
    { role: "hr",  permission: "manageEmployees", enabled: true },
    { role: "hr",  permission: "viewTasks",        enabled: true },
    { role: "hr",  permission: "manageTasks",      enabled: true },
    { role: "hr",  permission: "viewTA",           enabled: true },
    { role: "hr",  permission: "manageTA",         enabled: true },
    { role: "hr",  permission: "viewReports",      enabled: true },
    { role: "hr",  permission: "viewLiveTracking", enabled: true },
    { role: "dsr", permission: "viewTasks",        enabled: true },
    { role: "dsr", permission: "manageTasks",      enabled: true },
    { role: "dsr", permission: "viewLiveTracking", enabled: true },
    { role: "sr",  permission: "viewTasks",        enabled: true },
    { role: "sr",  permission: "manageTasks",      enabled: true },
    { role: "sr",  permission: "viewLiveTracking", enabled: true },
  ];

  for (const p of PERMISSION_SEEDS) {
    const { error } = await admin.from("role_permissions").upsert(p, { onConflict: "role,permission" });
    if (error) console.error(`  ⚠️  perm seed failed: ${p.role}/${p.permission}: ${error.message}`);
  }
  console.log(`\n  ✅ default permissions seeded\n`);

  const { count } = await admin.from("users").select("id", { count: "exact", head: true });
  console.log(`📊 Total users in public.users: ${count ?? 0}`);
  console.log(`\n✅ Seed complete. You can now sign in with any demo account.\n`);
}

seed().catch((err) => {
  console.error("\n❌ Seed failed:", err);
  process.exit(1);
});
