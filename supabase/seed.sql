-- SMT Family Demo Accounts Seed
-- Run this in Supabase Dashboard → SQL Editor
-- These users will be created in auth.users, and the trigger handle_new_user
-- will automatically create corresponding rows in public.users.

-- NOTE: Supabase Auth requires the pgcrypto extension for password hashing.
-- Passwords are already hashed correctly by Supabase's auth API, but when
-- inserting directly into auth.users we use the pre-hashed password format.

-- Instead of direct inserts (which bypass auth security), use the
-- Supabase Auth admin API or create users through the UI.
-- For a quick seed, use the Sign Up form or the Supabase Dashboard.

-- Run this AFTER the main schema migration:
-- 1. Go to Authentication → Users in Supabase Dashboard
-- 2. Click "Add User" and create each account manually:
--    - shovo@smt.family / shovo@1234 (then set role to super_admin in public.users)
--    - admin@smt.family / Admin@1234 (then set role to admin)
--    - hr@smt.family / Hr@1234 (then set role to hr)
--    - dhr@smt.family / Dhr@1234 (then set role to dhr)
--    - so@smt.family / So@1234 (then set role to so)
--    - fi@smt.family / Fi@1234 (then set role to fi)
-- 3. Or use the SQL below if you have the service_role key:

-- ============================================================
-- Option B: SQL seed using auth.admin functions (requires superadmin)
-- These inserts rely on the trigger to create public.users rows.
-- ============================================================

-- Create demo users (requires service_role access via Supabase dashboard SQL editor)
-- The handle_new_user trigger will create public.users entries automatically.
-- After creating users, update their roles:

update public.users set role = 'super_admin', full_name = 'Shovo', employee_id = 'SA-001' where email = 'shovo@smt.family';
update public.users set role = 'admin', full_name = 'Admin User', employee_id = 'AD-001' where email = 'admin@smt.family';
update public.users set role = 'hr', full_name = 'HR Manager', employee_id = 'HR-001' where email = 'hr@smt.family';
update public.users set role = 'dhr', full_name = 'DHR Agent', employee_id = 'DH-001' where email = 'dhr@smt.family';
update public.users set role = 'so', full_name = 'SO Agent', employee_id = 'SO-001' where email = 'so@smt.family';
update public.users set role = 'fi', full_name = 'FI Agent', employee_id = 'FI-001' where email = 'fi@smt.family';

-- Seed default role permissions for non-admin roles
insert into public.role_permissions (role, permission, enabled) values
  ('hr', 'manageEmployees', true),
  ('hr', 'viewTasks', true),
  ('hr', 'manageTasks', true),
  ('hr', 'viewTA', true),
  ('hr', 'manageTA', true),
  ('hr', 'viewReports', true),
  ('hr', 'viewLiveTracking', true),
  ('dhr', 'viewReports', true),
  ('dhr', 'viewLiveTracking', true),
  ('so', 'viewTasks', true),
  ('so', 'manageTasks', true),
  ('so', 'viewLiveTracking', true),
  ('fi', 'viewTasks', true),
  ('fi', 'manageTasks', true),
  ('fi', 'viewLiveTracking', true)
on conflict (role, permission) do nothing;

-- ============================================================
-- Audit Logs Table (run this first in the SQL editor)
-- ============================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  actor_name text not null default '',
  action text not null,
  target_user_id uuid references public.users(id) on delete set null,
  target_name text,
  target_employee_id text,
  details text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;
create policy "audit_logs super_admin select" on public.audit_logs
  for select using (
    exists (select 1 from public.users where id = auth.uid() and role = 'super_admin')
  );
create policy "audit_logs insert" on public.audit_logs
  for insert with check (auth.uid() is not null);
