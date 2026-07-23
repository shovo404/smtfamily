-- Run this whole file in Supabase Dashboard → SQL Editor before deploying.
create extension if not exists pgcrypto;

create type public.app_role as enum ('super_admin', 'admin', 'hr', 'dhr', 'sr', 'dsr', 'fso');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '', full_name text not null default '',
  employee_id text, phone text, department text, photo_url text,
  role public.app_role not null default 'fso', is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index users_employee_id_unique on public.users(employee_id) where employee_id is not null;

create table public.attendance (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  work_date date not null, check_in timestamptz, check_out timestamptz,
  check_in_lat double precision, check_in_lng double precision,
  check_out_lat double precision, check_out_lng double precision,
  check_in_photo_url text, check_out_photo_url text,
  check_in_face_verified boolean not null default false, check_out_face_verified boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, work_date)
);

create table public.employee_locations (
  user_id uuid primary key references public.users(id) on delete cascade,
  latitude double precision not null, longitude double precision not null,
  accuracy double precision, speed double precision, duty_on boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.location_pings (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  latitude double precision not null, longitude double precision not null, accuracy double precision,
  speed double precision, heading double precision, recorded_at timestamptz not null default now()
);
create index location_pings_user_recorded_idx on public.location_pings(user_id, recorded_at desc);

create table public.tasks (
  id uuid primary key default gen_random_uuid(), title text not null, description text,
  assigned_to uuid references public.users(id) on delete set null, created_by uuid references public.users(id) on delete set null,
  status text not null default 'pending', due_date date, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.ta_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  amount numeric(12,2) not null, purpose text, status text not null default 'pending',
  approved_by uuid references public.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), type text not null, title text not null, message text,
  actor_user_id uuid references public.users(id) on delete set null, meta jsonb, is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.app_settings (
  key text primary key, value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(), updated_by uuid references public.users(id) on delete set null
);
create table public.role_permissions (
  role public.app_role not null, permission text not null, enabled boolean not null default false,
  updated_at timestamptz not null default now(), primary key(role, permission)
);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.users where id = auth.uid() and role in ('super_admin', 'admin'));
$$;
create or replace function public.can_manage_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.users where id = auth.uid() and role in ('super_admin', 'admin', 'hr'));
$$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name) values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'full_name', new.email, ''));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.users enable row level security; alter table public.attendance enable row level security;
alter table public.employee_locations enable row level security; alter table public.location_pings enable row level security;
alter table public.tasks enable row level security; alter table public.ta_requests enable row level security;
alter table public.notifications enable row level security; alter table public.app_settings enable row level security;
alter table public.role_permissions enable row level security;

create policy "users view own or staff" on public.users for select using (id = auth.uid() or public.can_manage_staff());
create policy "users update own basic profile" on public.users for update using (id = auth.uid()) with check (id = auth.uid());
create policy "staff manage users" on public.users for all using (public.can_manage_staff()) with check (public.can_manage_staff());
create policy "attendance own or staff view" on public.attendance for select using (user_id = auth.uid() or public.can_manage_staff());
create policy "attendance own insert" on public.attendance for insert with check (user_id = auth.uid());
create policy "attendance own update" on public.attendance for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "staff delete attendance" on public.attendance for delete using (public.is_admin());
create policy "locations own insert" on public.employee_locations for insert with check (user_id = auth.uid());
create policy "locations own update" on public.employee_locations for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff view locations" on public.employee_locations for select using (public.can_manage_staff());
create policy "pings own insert" on public.location_pings for insert with check (user_id = auth.uid());
create policy "staff view pings" on public.location_pings for select using (public.can_manage_staff());
create policy "task view" on public.tasks for select using (assigned_to = auth.uid() or public.can_manage_staff());
create policy "staff manage tasks" on public.tasks for all using (public.can_manage_staff()) with check (public.can_manage_staff());
create policy "ta own or staff view" on public.ta_requests for select using (user_id = auth.uid() or public.can_manage_staff());
create policy "ta own insert" on public.ta_requests for insert with check (user_id = auth.uid());
create policy "staff update ta" on public.ta_requests for update using (public.can_manage_staff());
create policy "notifications staff view" on public.notifications for select using (public.is_admin());
create policy "notifications authenticated insert" on public.notifications for insert with check (auth.uid() is not null);
create policy "notifications admin update" on public.notifications for update using (public.is_admin());
create policy "settings authenticated view" on public.app_settings for select using (auth.uid() is not null);
create policy "settings staff manage" on public.app_settings for all using (public.can_manage_staff()) with check (public.can_manage_staff());
create policy "permissions authenticated view" on public.role_permissions for select using (auth.uid() is not null);
create policy "permissions admin manage" on public.role_permissions for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public) values ('attendance-faces', 'attendance-faces', false), ('avatars', 'avatars', false), ('app-assets', 'app-assets', false)
on conflict (id) do nothing;
create policy "own attendance upload" on storage.objects for insert to authenticated with check (bucket_id = 'attendance-faces' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own attendance read" on storage.objects for select to authenticated using (bucket_id = 'attendance-faces' and ((storage.foldername(name))[1] = auth.uid()::text or public.can_manage_staff()));
create policy "own avatar upload" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar read" on storage.objects for select to authenticated using (bucket_id = 'avatars');
create policy "staff app assets" on storage.objects for all to authenticated using (bucket_id = 'app-assets' and public.can_manage_staff()) with check (bucket_id = 'app-assets' and public.can_manage_staff());
create policy "app assets read" on storage.objects for select to authenticated using (bucket_id = 'app-assets');

alter publication supabase_realtime add table public.employee_locations, public.location_pings, public.notifications;
insert into public.app_settings(key, value) values ('office_hours', '{"start":"09:00","end":"18:00"}'::jsonb) on conflict (key) do nothing;
