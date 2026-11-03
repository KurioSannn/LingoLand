-- Blok 22 Migration: User Roles (RBAC), Enhanced Profiles, and Granular RLS Policies
-- Migration ID: 20261103000001_block22_rbac_profiles_rls.sql

-- 1. Role Enum
do $$ begin
  create type public.app_role as enum ('user', 'moderator', 'admin');
exception
  when duplicate_object then null;
end $$;

-- 2. User Roles Table (Protected role assignments)
create table if not exists public.user_roles (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create index if not exists idx_user_roles_user_id on public.user_roles (user_id);

-- 3. Security Definer Role Check Functions
create or replace function public.has_role(user_uuid uuid, required_role public.app_role)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = user_uuid and role = required_role
  );
$$;

create or replace function public.is_admin(user_uuid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = user_uuid and role = 'admin'
  );
$$;

-- Secure Admin-only Role Assignment RPC
create or replace function public.assign_user_role(target_user_id uuid, target_role public.app_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Akses ditolak: Hanya admin yang dapat mengubah atau menetapkan peran.';
  end if;

  insert into public.user_roles (user_id, role)
  values (target_user_id, target_role)
  on conflict (user_id, role) do nothing;
end;
$$;

-- 4. RLS for user_roles Table
alter table public.user_roles enable row level security;

drop policy if exists "user_roles_read_own_or_admin" on public.user_roles;
drop policy if exists "user_roles_service_role_all" on public.user_roles;

-- Users can read their own assigned roles; Admins can view all user roles
create policy "user_roles_read_own_or_admin" on public.user_roles
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Only service_role can directly insert/update/delete user_roles
create policy "user_roles_service_role_all" on public.user_roles
  for all using (auth.jwt() ->> 'role' = 'service_role');

-- 5. Enhanced Profiles Table
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists is_private boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

-- Ensure display_name defaults to name if empty
update public.profiles set display_name = name where display_name is null;

-- Non-negative Constraints
do $$ begin
  alter table public.profiles add constraint check_profiles_coins_non_negative check (coins >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles add constraint check_profiles_xp_non_negative check (xp >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles add constraint check_profiles_level_positive check (level >= 1);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles add constraint check_profiles_hearts_non_negative check (hearts >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles add constraint check_profiles_streak_non_negative check (streak_days >= 0);
exception when duplicate_object then null; end $$;

-- Case-insensitive unique username index
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(trim(username)));

-- 6. Granular Profiles RLS Policies
drop policy if exists "profiles_owner" on public.profiles;
drop policy if exists "profiles_select_own_or_public" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

-- Read policy: Owner can read full profile, others can read public profiles (is_private = false), admin can read all
create policy "profiles_select_own_or_public" on public.profiles
  for select using (auth.uid() = user_id or is_private = false or public.is_admin(auth.uid()));

-- Insert policy: Authenticated users can insert their own profile
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

-- Update policy: Users can update their own profile, Admins can update any profile
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id or public.is_admin(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

-- 7. Automatic Default Role Assignment Trigger
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_assign_role on auth.users;
create trigger on_auth_user_created_assign_role
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
