-- ============================================================================
-- LINGOLAND FULL PRODUCTION DATABASE SCHEMA (BLOK 1 - BLOK 34)
-- Copy seluruh isi file ini ke Supabase Dashboard -> SQL Editor -> Klik RUN
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SOURCE: 20260722000000_baseline_schema.sql
-- ----------------------------------------------------------------------------
-- Lingoland Baseline Schema (Migration 20260722000000)
-- Matches original schema.sql created during prototype development

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  username text not null,
  level integer not null default 1,
  xp integer not null default 0,
  coins integer not null default 0,
  hearts integer not null default 5,
  streak_days integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.avatar_configs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  skin_tone_id text not null,
  hair_id text not null,
  top_id text not null,
  bottom_id text not null,
  shoes_id text not null,
  accessory_id text,
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.mission_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_id text not null,
  status text not null check (status in ('locked', 'available', 'active', 'completed', 'incomplete')),
  completed_objective_ids text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, mission_id)
);

create table if not exists public.claimed_rewards (
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_id text not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, mission_id)
);

alter table public.profiles enable row level security;
alter table public.avatar_configs enable row level security;
alter table public.inventory_items enable row level security;
alter table public.mission_progress enable row level security;
alter table public.claimed_rewards enable row level security;

drop policy if exists "profiles_owner" on public.profiles;
create policy "profiles_owner" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "avatar_configs_owner" on public.avatar_configs;
create policy "avatar_configs_owner" on public.avatar_configs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "inventory_items_owner" on public.inventory_items;
create policy "inventory_items_owner" on public.inventory_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "mission_progress_owner" on public.mission_progress;
create policy "mission_progress_owner" on public.mission_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "claimed_rewards_owner" on public.claimed_rewards;
create policy "claimed_rewards_owner" on public.claimed_rewards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- SOURCE: 20261103000001_block22_rbac_profiles_rls.sql
-- ----------------------------------------------------------------------------
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
drop policy if exists "user_roles_read_own_or_admin" on public.user_roles;
create policy "user_roles_read_own_or_admin" on public.user_roles
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Only service_role can directly insert/update/delete user_roles
drop policy if exists "user_roles_service_role_all" on public.user_roles;
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
drop policy if exists "profiles_select_own_or_public" on public.profiles;
create policy "profiles_select_own_or_public" on public.profiles
  for select using (auth.uid() = user_id or is_private = false or public.is_admin(auth.uid()));

-- Insert policy: Authenticated users can insert their own profile
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

-- Update policy: Users can update their own profile, Admins can update any profile
drop policy if exists "profiles_update_own" on public.profiles;
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

-- ----------------------------------------------------------------------------
-- SOURCE: 20261103000002_block23_lesson_progress.sql
-- ----------------------------------------------------------------------------
-- Blok 23 Migration: Lesson Progress Persistence and Synchronisation Hardening
-- Migration ID: 20261103000002_block23_lesson_progress.sql

-- 1. Lesson Progress Table (Multi-device progress for Duolingo-style learning path units)
create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_unit_id text not null,
  status text not null default 'completed' check (status in ('unlocked', 'completed')),
  score integer not null default 100 check (score >= 0 and score <= 100),
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_unit_id)
);

create index if not exists idx_lesson_progress_user_id on public.lesson_progress (user_id);

-- 2. Row Level Security for lesson_progress
alter table public.lesson_progress enable row level security;

drop policy if exists "lesson_progress_owner" on public.lesson_progress;
drop policy if exists "lesson_progress_select_own_or_admin" on public.lesson_progress;

-- Users can read their own lesson progress; Admins can read all for analytics
drop policy if exists "lesson_progress_select_own_or_admin" on public.lesson_progress;
create policy "lesson_progress_select_own_or_admin" on public.lesson_progress
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Users can insert/update their own lesson progress
drop policy if exists "lesson_progress_insert_own" on public.lesson_progress;
create policy "lesson_progress_insert_own" on public.lesson_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "lesson_progress_update_own" on public.lesson_progress;
create policy "lesson_progress_update_own" on public.lesson_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "lesson_progress_delete_own" on public.lesson_progress;
create policy "lesson_progress_delete_own" on public.lesson_progress
  for delete using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- SOURCE: 20261103000003_block24_economy_ledger_rpc.sql
-- ----------------------------------------------------------------------------
-- Blok 24 Migration: Server-Authoritative Economy, Wallet Transactions Ledger & Atomic RPCs
-- Migration ID: 20261103000003_block24_economy_ledger_rpc.sql

-- 1. Transaction Source Enum
do $$ begin
  create type public.transaction_source_type as enum (
    'mission_reward',
    'lesson_reward',
    'store_purchase',
    'admin_adjustment',
    'initial_grant'
  );
exception
  when duplicate_object then null;
end $$;

-- 2. Wallet Transactions Table (Audit Ledger)
create table if not exists public.wallet_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type public.transaction_source_type not null,
  source_id text not null,
  delta_coins integer not null default 0,
  delta_xp integer not null default 0,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_transactions_user_id on public.wallet_transactions (user_id);
create index if not exists idx_wallet_transactions_idempotency on public.wallet_transactions (idempotency_key);

-- RLS for wallet_transactions: Read-only for owner and admin, mutations strictly via Security Definer RPC
alter table public.wallet_transactions enable row level security;

drop policy if exists "wallet_transactions_select_own_or_admin" on public.wallet_transactions;
drop policy if exists "wallet_transactions_service_role_all" on public.wallet_transactions;

drop policy if exists "wallet_transactions_select_own_or_admin" on public.wallet_transactions;
create policy "wallet_transactions_select_own_or_admin" on public.wallet_transactions
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "wallet_transactions_service_role_all" on public.wallet_transactions;
create policy "wallet_transactions_service_role_all" on public.wallet_transactions
  for all using (auth.jwt() ->> 'role' = 'service_role');

-- 3. Server-Authoritative Missions Reference Table
create table if not exists public.mission_definitions (
  id text primary key,
  title text not null,
  reward_xp integer not null check (reward_xp >= 0),
  reward_coins integer not null check (reward_coins >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.mission_definitions enable row level security;
drop policy if exists "mission_definitions_read_all" on public.mission_definitions;
create policy "mission_definitions_read_all" on public.mission_definitions
  for select using (is_active = true or public.is_admin(auth.uid()));

-- Seed authoritative mission rewards
insert into public.mission_definitions (id, title, reward_xp, reward_coins)
values
  ('intro', 'Perkenalan Diri', 50, 20),
  ('hobby', 'Hobi Favorit', 70, 30),
  ('weekend', 'Rencana Akhir Pekan', 90, 40)
on conflict (id) do update set
  reward_xp = excluded.reward_xp,
  reward_coins = excluded.reward_coins;

-- 4. Server-Authoritative Store Items Reference Table
create table if not exists public.store_item_definitions (
  id text primary key,
  name text not null,
  category text not null,
  price integer not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.store_item_definitions enable row level security;
drop policy if exists "store_item_definitions_read_all" on public.store_item_definitions;
create policy "store_item_definitions_read_all" on public.store_item_definitions
  for select using (is_active = true or public.is_admin(auth.uid()));

-- Seed authoritative store prices
insert into public.store_item_definitions (id, name, category, price)
values
  ('top-hoodie-lavender', 'Hoodie Lavender', 'top', 300),
  ('top-varsity', 'Jaket Varsity', 'top', 450),
  ('accessory-round-glasses', 'Kacamata Bulat', 'accessory', 180),
  ('accessory-mini-home-cap', 'Topi Mini Home', 'accessory', 250),
  ('shoes-black', 'Sneakers Hitam', 'shoes', 350)
on conflict (id) do update set
  price = excluded.price;

-- 5. Atomic RPC: Claim Mission Reward
create or replace function public.claim_mission_reward_atomic(p_mission_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_mission record;
  v_idempotency_key text;
  v_new_coins integer;
  v_new_xp integer;
  v_new_level integer;
begin
  if v_user_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  -- 1. Validasi definisi misi server
  select * into v_mission from public.mission_definitions where id = p_mission_id and is_active = true;
  if not found then
    raise exception 'Definisi misi tidak ditemukan: %', p_mission_id;
  end if;

  -- 2. Cek apakah sudah pernah diklaim sebelumnya (anti duplicate claim)
  v_idempotency_key := 'mission:' || v_user_id || ':' || p_mission_id;

  if exists (select 1 from public.claimed_rewards where user_id = v_user_id and mission_id = p_mission_id) then
    return jsonb_build_object('ok', false, 'message', 'Reward misi ini sudah pernah diklaim sebelumnya.', 'already_claimed', true);
  end if;

  -- 3. Catat di ledger transaksi dompet
  insert into public.wallet_transactions (user_id, source_type, source_id, delta_coins, delta_xp, idempotency_key)
  values (v_user_id, 'mission_reward', p_mission_id, v_mission.reward_coins, v_mission.reward_xp, v_idempotency_key)
  on conflict (idempotency_key) do nothing;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Reward misi ini sudah pernah diklaim sebelumnya.', 'already_claimed', true);
  end if;

  -- 4. Catat status misi dan klaim
  insert into public.claimed_rewards (user_id, mission_id)
  values (v_user_id, p_mission_id)
  on conflict (user_id, mission_id) do nothing;

  insert into public.mission_progress (user_id, mission_id, status)
  values (v_user_id, p_mission_id, 'completed')
  on conflict (user_id, mission_id) do update set status = 'completed', updated_at = now();

  -- Buka misi weekend jika intro selesai
  if p_mission_id = 'intro' then
    insert into public.mission_progress (user_id, mission_id, status)
    values (v_user_id, 'weekend', 'available')
    on conflict (user_id, mission_id) do update
      set status = case when mission_progress.status = 'locked' then 'available' else mission_progress.status end;
  end if;

  -- 5. Update profil koin, xp, dan level secara atomik
  update public.profiles
  set
    coins = coins + v_mission.reward_coins,
    xp = xp + v_mission.reward_xp,
    level = case
      when (xp + v_mission.reward_xp) >= 1000 then 5
      when (xp + v_mission.reward_xp) >= 600 then 4
      when (xp + v_mission.reward_xp) >= 300 then 3
      when (xp + v_mission.reward_xp) >= 100 then 2
      else 1
    end,
    updated_at = now()
  where user_id = v_user_id
  returning coins, xp, level into v_new_coins, v_new_xp, v_new_level;

  return jsonb_build_object(
    'ok', true,
    'message', 'Reward misi berhasil diklaim!',
    'gained_coins', v_mission.reward_coins,
    'gained_xp', v_mission.reward_xp,
    'coins', v_new_coins,
    'xp', v_new_xp,
    'level', v_new_level
  );
end;
$$;

-- 6. Atomic RPC: Buy Store Item
create or replace function public.buy_store_item_atomic(p_item_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_item record;
  v_user_coins integer;
  v_idempotency_key text;
  v_new_coins integer;
begin
  if v_user_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  -- 1. Validasi item dan harga resmi di database
  select * into v_item from public.store_item_definitions where id = p_item_id and is_active = true;
  if not found then
    raise exception 'Item tidak ditemukan di katalog toko: %', p_item_id;
  end if;

  -- 2. Cek apakah item sudah dimiliki
  if exists (select 1 from public.inventory_items where user_id = v_user_id and item_id = p_item_id) then
    return jsonb_build_object('ok', false, 'message', 'Item sudah dimiliki di inventori kamu.');
  end if;

  -- 3. Cek saldo koin dengan row locking untuk cegah race condition
  select coins into v_user_coins from public.profiles where user_id = v_user_id for update;
  if v_user_coins is null or v_user_coins < v_item.price then
    return jsonb_build_object('ok', false, 'message', 'Koin tidak cukup untuk membeli item ini.', 'coins', coalesce(v_user_coins, 0));
  end if;

  -- 4. Potong saldo koin secara atomik
  update public.profiles
  set coins = coins - v_item.price, updated_at = now()
  where user_id = v_user_id
  returning coins into v_new_coins;

  -- 5. Tambahkan ke inventori
  insert into public.inventory_items (user_id, item_id)
  values (v_user_id, p_item_id)
  on conflict (user_id, item_id) do nothing;

  -- 6. Catat transaksi debit di ledger
  v_idempotency_key := 'buy:' || v_user_id || ':' || p_item_id;
  insert into public.wallet_transactions (user_id, source_type, source_id, delta_coins, delta_xp, idempotency_key)
  values (v_user_id, 'store_purchase', p_item_id, -v_item.price, 0, v_idempotency_key);

  return jsonb_build_object(
    'ok', true,
    'message', v_item.name || ' berhasil dibeli!',
    'coins', v_new_coins,
    'item_id', p_item_id
  );
end;
$$;

-- 7. Atomic RPC: Complete Lesson with Once-Only Reward
create or replace function public.complete_lesson_atomic(p_lesson_unit_id text, p_score integer default 100)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_reward_xp integer := 15;
  v_idempotency_key text;
  v_new_xp integer;
  v_new_level integer;
  v_already_completed boolean;
begin
  if v_user_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  -- Cek apakah sudah pernah selesai sebelumnya
  select exists (
    select 1 from public.lesson_progress where user_id = v_user_id and lesson_unit_id = p_lesson_unit_id and status = 'completed'
  ) into v_already_completed;

  -- Catat progress di lesson_progress
  insert into public.lesson_progress (user_id, lesson_unit_id, status, score, updated_at)
  values (v_user_id, p_lesson_unit_id, 'completed', coalesce(p_score, 100), now())
  on conflict (user_id, lesson_unit_id) do update
    set status = 'completed', score = greatest(lesson_progress.score, coalesce(excluded.score, 100)), updated_at = now();

  -- Jika latihan ulang, tidak memberikan XP tambahan
  if v_already_completed then
    return jsonb_build_object(
      'ok', true,
      'message', 'Latihan ulang selesai (reward XP hanya diberikan pada penyelesaian pertama).',
      'already_rewarded', true,
      'gained_xp', 0
    );
  end if;

  -- Catat transaksi reward di ledger
  v_idempotency_key := 'lesson:' || v_user_id || ':' || p_lesson_unit_id;
  insert into public.wallet_transactions (user_id, source_type, source_id, delta_coins, delta_xp, idempotency_key)
  values (v_user_id, 'lesson_reward', p_lesson_unit_id, 0, v_reward_xp, v_idempotency_key)
  on conflict (idempotency_key) do nothing;

  if not found then
    return jsonb_build_object('ok', true, 'message', 'Latihan ulang selesai.', 'already_rewarded', true, 'gained_xp', 0);
  end if;

  -- Update profil XP dan level secara atomik
  update public.profiles
  set
    xp = xp + v_reward_xp,
    level = case
      when (xp + v_reward_xp) >= 1000 then 5
      when (xp + v_reward_xp) >= 600 then 4
      when (xp + v_reward_xp) >= 300 then 3
      when (xp + v_reward_xp) >= 100 then 2
      else 1
    end,
    updated_at = now()
  where user_id = v_user_id
  returning xp, level into v_new_xp, v_new_level;

  return jsonb_build_object(
    'ok', true,
    'message', 'Lesson selesai!',
    'gained_xp', v_reward_xp,
    'xp', v_new_xp,
    'level', v_new_level
  );
end;
$$;

-- 8. Anti-tampering Trigger on profiles (Disallow direct client manipulation of coins, xp, level)
create or replace function public.protect_profile_economy_fields()
returns trigger language plpgsql as $$
begin
  -- Bypass for database definer / service role
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  -- Bypass for system admin
  if public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role') then
    return new;
  end if;

  -- Disallow direct client overwrite of wallet balances: retain authoritative server values
  new.coins := old.coins;
  new.xp := old.xp;
  new.level := old.level;

  return new;
end;
$$;

drop trigger if exists on_protect_profile_economy on public.profiles;
create trigger on_protect_profile_economy
  before update on public.profiles
  for each row execute function public.protect_profile_economy_fields();

-- ----------------------------------------------------------------------------
-- SOURCE: 20261103000004_block25_curriculum_question_bank.sql
-- ----------------------------------------------------------------------------
-- Blok 25 Migration: Dynamic Curriculum, Question Bank, Answer Keys & Content Lifecycle
-- Migration ID: 20261103000004_block25_curriculum_question_bank.sql

-- 1. Content Status Enum
do $$ begin
  create type public.content_status as enum ('draft', 'published', 'archived');
exception
  when duplicate_object then null;
end $$;

-- 2. Question Type Enum
do $$ begin
  create type public.question_type_enum as enum ('multiple-choice', 'word-order', 'fill-blank', 'listening', 'speaking');
exception
  when duplicate_object then null;
end $$;

-- 3. Courses Table
create table if not exists public.courses (
  id text primary key,
  slug text not null unique,
  title text not null check (char_length(title) between 3 and 150),
  language text not null default 'en',
  description text,
  status public.content_status not null default 'published',
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Curriculum Units Table
create table if not exists public.curriculum_units (
  id text primary key,
  course_id text not null references public.courses (id) on delete cascade,
  slug text not null,
  title text not null check (char_length(title) between 3 and 150),
  description text,
  level_cefr text not null default 'A1' check (level_cefr in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  order_index integer not null default 1,
  unlock_policy text not null default 'previous_completed' check (unlock_policy in ('always_unlocked', 'previous_completed', 'admin_only')),
  related_mission_id text,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_curriculum_units_course on public.curriculum_units (course_id, order_index);
create index if not exists idx_curriculum_units_status on public.curriculum_units (status);

-- 5. Curriculum Lessons Table
create table if not exists public.curriculum_lessons (
  id text primary key,
  unit_id text not null references public.curriculum_units (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 150),
  description text,
  reward_xp integer not null default 15 check (reward_xp >= 0 and reward_xp <= 500),
  pass_threshold integer not null default 70 check (pass_threshold between 1 and 100),
  status public.content_status not null default 'published',
  version integer not null default 1 check (version >= 1),
  order_index integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_curriculum_lessons_unit on public.curriculum_lessons (unit_id, order_index);
create index if not exists idx_curriculum_lessons_status on public.curriculum_lessons (status);

-- 6. Curriculum Questions Table
create table if not exists public.curriculum_questions (
  id text primary key,
  lesson_id text not null references public.curriculum_lessons (id) on delete cascade,
  question_type public.question_type_enum not null,
  prompt text not null check (char_length(prompt) between 2 and 500),
  explanation text,
  difficulty text not null default 'beginner' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  order_index integer not null default 1,
  status public.content_status not null default 'published',
  version integer not null default 1 check (version >= 1),
  word_bank jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_curriculum_questions_lesson on public.curriculum_questions (lesson_id, order_index);
create index if not exists idx_curriculum_questions_status on public.curriculum_questions (status);

-- 7. Curriculum Question Options Table (Learner visible choices)
create table if not exists public.curriculum_question_options (
  id text not null,
  question_id text not null references public.curriculum_questions (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 250),
  order_index integer not null default 1,
  created_at timestamptz not null default now(),
  primary key (question_id, id)
);

create index if not exists idx_question_options_qid on public.curriculum_question_options (question_id, order_index);

-- 8. Curriculum Question Answer Keys (SERVER-ONLY / PRIVATE)
create table if not exists public.curriculum_question_answer_keys (
  question_id text primary key references public.curriculum_questions (id) on delete cascade,
  validation_type text not null default 'exact' check (validation_type in ('exact', 'word-order', 'regex', 'json')),
  expected_answer text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Lesson Attempts Table (Audit and progression history)
create table if not exists public.lesson_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null references public.curriculum_lessons (id) on delete cascade,
  lesson_version integer not null default 1,
  score integer not null check (score between 0 and 100),
  passed boolean not null default false,
  answers_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_lesson_attempts_user_lesson on public.lesson_attempts (user_id, lesson_id);

-- 10. Granular Row Level Security (RLS)
alter table public.courses enable row level security;
alter table public.curriculum_units enable row level security;
alter table public.curriculum_lessons enable row level security;
alter table public.curriculum_questions enable row level security;
alter table public.curriculum_question_options enable row level security;
alter table public.curriculum_question_answer_keys enable row level security;
alter table public.lesson_attempts enable row level security;

-- Courses: Public/Learners can view published, Admins can view all and mutate
drop policy if exists "courses_select_published_or_admin" on public.courses;
create policy "courses_select_published_or_admin" on public.courses
  for select using (status = 'published' or public.is_admin(auth.uid()));
drop policy if exists "courses_admin_all" on public.courses;
create policy "courses_admin_all" on public.courses
  for all using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- Units: Public/Learners can view published, Admins can view all and mutate
drop policy if exists "units_select_published_or_admin" on public.curriculum_units;
create policy "units_select_published_or_admin" on public.curriculum_units
  for select using (status = 'published' or public.is_admin(auth.uid()));
drop policy if exists "units_admin_all" on public.curriculum_units;
create policy "units_admin_all" on public.curriculum_units
  for all using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- Lessons: Public/Learners can view published, Admins can view all and mutate
drop policy if exists "lessons_select_published_or_admin" on public.curriculum_lessons;
create policy "lessons_select_published_or_admin" on public.curriculum_lessons
  for select using (status = 'published' or public.is_admin(auth.uid()));
drop policy if exists "lessons_admin_all" on public.curriculum_lessons;
create policy "lessons_admin_all" on public.curriculum_lessons
  for all using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- Questions: Public/Learners can view published, Admins can view all and mutate
drop policy if exists "questions_select_published_or_admin" on public.curriculum_questions;
create policy "questions_select_published_or_admin" on public.curriculum_questions
  for select using (status = 'published' or public.is_admin(auth.uid()));
drop policy if exists "questions_admin_all" on public.curriculum_questions;
create policy "questions_admin_all" on public.curriculum_questions
  for all using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- Question Options: Public/Learners can view options of published questions
drop policy if exists "question_options_select_published" on public.curriculum_question_options;
create policy "question_options_select_published" on public.curriculum_question_options
  for select using (
    exists (
      select 1 from public.curriculum_questions q
      where q.id = curriculum_question_options.question_id
      and (q.status = 'published' or public.is_admin(auth.uid()))
    )
  );
drop policy if exists "question_options_admin_all" on public.curriculum_question_options;
create policy "question_options_admin_all" on public.curriculum_question_options
  for all using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- Question Answer Keys: STRICT SERVER-ONLY / ADMIN-ONLY (Learners NEVER have SELECT access!)
drop policy if exists "answer_keys_admin_and_service_only" on public.curriculum_question_answer_keys;
create policy "answer_keys_admin_and_service_only" on public.curriculum_question_answer_keys
  for all using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- Lesson Attempts: Learners can read and insert their own attempts
drop policy if exists "lesson_attempts_owner_select" on public.lesson_attempts;
create policy "lesson_attempts_owner_select" on public.lesson_attempts
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
drop policy if exists "lesson_attempts_owner_insert" on public.lesson_attempts;
create policy "lesson_attempts_owner_insert" on public.lesson_attempts
  for insert with check (auth.uid() = user_id);

-- 11. Idempotent Seeding of Core Curriculum
insert into public.courses (id, slug, title, language, description, status, sort_order)
values (
  'english-starter',
  'english-starter',
  'English Starter (A1-A2)',
  'en',
  'Fondasi percakapan bahasa Inggris interaktif untuk pemula.',
  'published',
  1
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description;

-- Units Seeding
insert into public.curriculum_units (id, course_id, slug, title, description, level_cefr, order_index, unlock_policy, related_mission_id, status)
values
  ('lesson-intro', 'english-starter', 'perkenalan-diri', 'Perkenalan Diri', 'Latihan kosakata perkenalan sebelum ngobrol langsung dengan Bintang di Mini Home.', 'A1', 1, 'always_unlocked', 'intro', 'published'),
  ('lesson-hobby', 'english-starter', 'hobi-dan-minat', 'Hobi dan Minat', 'Latihan tanya-jawab soal hobi sebelum ngobrol dengan Lala.', 'A1', 2, 'previous_completed', 'hobby', 'published'),
  ('lesson-weekend', 'english-starter', 'rencana-akhir-pekan', 'Percakapan Sehari-hari', 'Latihan bicara soal rencana akhir pekan sebelum ngobrol dengan Benny.', 'A2', 3, 'previous_completed', 'weekend', 'published')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  order_index = excluded.order_index;

-- Lessons Seeding
insert into public.curriculum_lessons (id, unit_id, title, description, reward_xp, pass_threshold, status, version, order_index)
values
  ('lesson-intro', 'lesson-intro', 'Perkenalan Diri', 'Latihan kosakata perkenalan dasar.', 15, 70, 'published', 1, 1),
  ('lesson-hobby', 'lesson-hobby', 'Hobi dan Minat', 'Latihan tanya jawab hobi dan minat.', 15, 70, 'published', 1, 1),
  ('lesson-weekend', 'lesson-weekend', 'Rencana Akhir Pekan', 'Latihan ekspresi rencana akhir pekan.', 15, 70, 'published', 1, 1)
on conflict (id) do update set
  title = excluded.title,
  reward_xp = excluded.reward_xp;

-- Questions Seeding
-- Unit 1: Intro
insert into public.curriculum_questions (id, lesson_id, question_type, prompt, difficulty, order_index, status, word_bank)
values
  ('intro-mc-1', 'lesson-intro', 'multiple-choice', 'Pilih cara paling tepat memperkenalkan nama.', 'beginner', 1, 'published', '[]'::jsonb),
  ('intro-mc-2', 'lesson-intro', 'multiple-choice', '"I am from Surabaya" artinya...', 'beginner', 2, 'published', '[]'::jsonb),
  ('intro-wo-1', 'lesson-intro', 'word-order', 'Susun kata menjadi kalimat yang benar.', 'beginner', 3, 'published', '["playing", "I", "games", "like"]'::jsonb),

-- Unit 2: Hobby
  ('hobby-mc-1', 'lesson-hobby', 'multiple-choice', 'Cara menanyakan hobi orang lain yang tepat...', 'beginner', 1, 'published', '[]'::jsonb),
  ('hobby-wo-1', 'lesson-hobby', 'word-order', 'Susun kata menjadi kalimat yang benar.', 'beginner', 2, 'published', '["is", "drawing", "hobby", "my"]'::jsonb),
  ('hobby-mc-2', 'lesson-hobby', 'multiple-choice', 'Pertanyaan lanjutan yang sopan setelah tahu hobi seseorang...', 'beginner', 3, 'published', '[]'::jsonb),

-- Unit 3: Weekend
  ('weekend-mc-1', 'lesson-weekend', 'multiple-choice', 'Cara menanyakan rencana akhir pekan yang tepat...', 'beginner', 1, 'published', '[]'::jsonb),
  ('weekend-wo-1', 'lesson-weekend', 'word-order', 'Susun kata menjadi kalimat yang benar.', 'beginner', 2, 'published', '["visit", "family", "will", "I", "my"]'::jsonb),
  ('weekend-mc-2', 'lesson-weekend', 'multiple-choice', 'Cara menutup percakapan dengan sopan...', 'beginner', 3, 'published', '[]'::jsonb)
on conflict (id) do update set
  prompt = excluded.prompt,
  word_bank = excluded.word_bank;

-- Question Options Seeding
insert into public.curriculum_question_options (question_id, id, label, order_index)
values
  ('intro-mc-1', 'a', 'My name is Raka.', 1),
  ('intro-mc-1', 'b', 'Name my is Raka.', 2),
  ('intro-mc-1', 'c', 'Raka name is.', 3),

  ('intro-mc-2', 'a', 'Saya suka Surabaya', 1),
  ('intro-mc-2', 'b', 'Saya berasal dari Surabaya', 2),
  ('intro-mc-2', 'c', 'Saya pergi ke Surabaya', 3),

  ('hobby-mc-1', 'a', 'What do you like to do?', 1),
  ('hobby-mc-1', 'b', 'What you like do?', 2),
  ('hobby-mc-1', 'c', 'Do you what like?', 3),

  ('hobby-mc-2', 'a', 'How often do you do it?', 1),
  ('hobby-mc-2', 'b', 'How much it do you?', 2),
  ('hobby-mc-2', 'c', 'You do it how often?', 3),

  ('weekend-mc-1', 'a', 'What will you do this weekend?', 1),
  ('weekend-mc-1', 'b', 'What you will weekend do?', 2),
  ('weekend-mc-1', 'c', 'Weekend what will do you?', 3),

  ('weekend-mc-2', 'a', 'That sounds great. See you later.', 1),
  ('weekend-mc-2', 'b', 'Ok bye now.', 2),
  ('weekend-mc-2', 'c', 'Sounds great you later see.', 3)
on conflict (question_id, id) do update set
  label = excluded.label,
  order_index = excluded.order_index;

-- Server-only Answer Keys Seeding (NOT ACCESSIBLE TO LEARNERS)
insert into public.curriculum_question_answer_keys (question_id, validation_type, expected_answer)
values
  ('intro-mc-1', 'exact', 'a'),
  ('intro-mc-2', 'exact', 'b'),
  ('intro-wo-1', 'word-order', '["I", "like", "playing", "games"]'),
  ('hobby-mc-1', 'exact', 'a'),
  ('hobby-wo-1', 'word-order', '["my", "hobby", "is", "drawing"]'),
  ('hobby-mc-2', 'exact', 'a'),
  ('weekend-mc-1', 'exact', 'a'),
  ('weekend-wo-1', 'word-order', '["I", "will", "visit", "my", "family"]'),
  ('weekend-mc-2', 'exact', 'a')
on conflict (question_id) do update set
  expected_answer = excluded.expected_answer;

-- ----------------------------------------------------------------------------
-- SOURCE: 20261103000005_block26_server_grading_engine.sql
-- ----------------------------------------------------------------------------
-- Blok 26 Migration: Server-Authoritative Grading Engine & Attempt Verification
-- Migration ID: 20261103000005_block26_server_grading_engine.sql

create or replace function public.grade_lesson_attempt_atomic(
  p_lesson_unit_id text,
  p_answers jsonb
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_lesson record;
  v_total_questions integer := 0;
  v_correct_count integer := 0;
  v_score integer := 0;
  v_passed boolean := false;
  v_q record;
  v_user_ans text;
  v_expected_ans text;
  v_is_correct boolean;
  v_results jsonb := '[]'::jsonb;
  v_already_completed boolean := false;
  v_idempotency_key text;
  v_reward_xp integer := 15;
  v_gained_xp integer := 0;
  v_new_xp integer;
  v_new_level integer;
begin
  if v_user_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  -- 1. Validasi lesson
  select * into v_lesson from public.curriculum_lessons where id = p_lesson_unit_id and status = 'published';
  if not found then
    raise exception 'Lesson tidak ditemukan atau belum dipublikasikan: %', p_lesson_unit_id;
  end if;

  -- 2. Evaluasi setiap soal berdasarkan kunci jawaban server-only
  for v_q in (
    select q.id, q.question_type, q.explanation, ak.validation_type, ak.expected_answer
    from public.curriculum_questions q
    join public.curriculum_question_answer_keys ak on ak.question_id = q.id
    where q.lesson_id = p_lesson_unit_id and q.status = 'published'
    order by q.order_index
  ) loop
    v_total_questions := v_total_questions + 1;
    v_is_correct := false;

    -- Ekstrak jawaban user dari payload jsonb: { "question_id": "answer" }
    v_user_ans := trim(both '"' from (p_answers ->> v_q.id));

    if v_user_ans is not null then
      if v_q.validation_type = 'word-order' then
        -- Normalisasi token urutan kata
        v_expected_ans := replace(replace(replace(v_q.expected_answer, '[', ''), ']', ''), '"', '');
        v_user_ans := replace(replace(replace(v_user_ans, '[', ''), ']', ''), '"', '');
        if lower(trim(v_expected_ans)) = lower(trim(v_user_ans)) then
          v_is_correct := true;
        end if;
      else
        -- Multiple-choice / exact match
        if lower(trim(v_q.expected_answer)) = lower(trim(v_user_ans)) then
          v_is_correct := true;
        end if;
      end if;
    end if;

    if v_is_correct then
      v_correct_count := v_correct_count + 1;
    end if;

    v_results := v_results || jsonb_build_object(
      'question_id', v_q.id,
      'is_correct', v_is_correct,
      'explanation', v_q.explanation
    );
  end loop;

  -- 3. Hitung skor persentase
  if v_total_questions > 0 then
    v_score := round((v_correct_count::numeric / v_total_questions::numeric) * 100);
  else
    v_score := 100;
  end if;

  v_passed := (v_score >= coalesce(v_lesson.pass_threshold, 70));

  -- 4. Simpan rekam jejak attempt
  insert into public.lesson_attempts (
    user_id, lesson_id, lesson_version, score, passed, answers_snapshot, created_at
  ) values (
    v_user_id, p_lesson_unit_id, v_lesson.version, v_score, v_passed, p_answers, now()
  );

  -- 5. Jika lulus, perbarui lesson_progress dan ledger
  if v_passed then
    select exists (
      select 1 from public.lesson_progress
      where user_id = v_user_id and lesson_unit_id = p_lesson_unit_id and status = 'completed'
    ) into v_already_completed;

    insert into public.lesson_progress (user_id, lesson_unit_id, status, score, updated_at)
    values (v_user_id, p_lesson_unit_id, 'completed', v_score, now())
    on conflict (user_id, lesson_unit_id) do update
      set status = 'completed', score = greatest(lesson_progress.score, excluded.score), updated_at = now();

    -- Berikan reward XP jika baru pertama kali lulus
    if not v_already_completed then
      v_idempotency_key := 'lesson:' || v_user_id || ':' || p_lesson_unit_id;
      insert into public.wallet_transactions (user_id, source_type, source_id, delta_coins, delta_xp, idempotency_key)
      values (v_user_id, 'lesson_reward', p_lesson_unit_id, 0, v_reward_xp, v_idempotency_key)
      on conflict (idempotency_key) do nothing;

      if found then
        v_gained_xp := v_reward_xp;
        update public.profiles
        set
          xp = xp + v_gained_xp,
          level = case
            when (xp + v_gained_xp) >= 1000 then 5
            when (xp + v_gained_xp) >= 600 then 4
            when (xp + v_gained_xp) >= 300 then 3
            when (xp + v_gained_xp) >= 100 then 2
            else 1
          end,
          updated_at = now()
        where user_id = v_user_id
        returning xp, level into v_new_xp, v_new_level;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'passed', v_passed,
    'score', v_score,
    'correct_count', v_correct_count,
    'total_questions', v_total_questions,
    'pass_threshold', coalesce(v_lesson.pass_threshold, 70),
    'gained_xp', v_gained_xp,
    'already_rewarded', v_already_completed,
    'details', v_results,
    'message', case
      when v_passed and v_already_completed then 'Latihan ulang berhasil diselesaikan.'
      when v_passed then 'Selamat! Kamu lulus lesson ini.'
      else 'Kamu belum mencapai batas kelulusan minimum (' || coalesce(v_lesson.pass_threshold, 70) || '%). Silakan coba lagi!'
    end
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- SOURCE: 20261103000006_block27_admin_audit_cms.sql
-- ----------------------------------------------------------------------------
-- Blok 27 Migration: Admin Audit Logs, CMS Authorization & Admin RPCs
-- Migration ID: 20261103000006_block27_admin_audit_cms.sql

-- 1. Admin Audit Logs Table
create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (char_length(action) between 2 and 100),
  entity_type text not null check (char_length(entity_type) between 2 and 100),
  entity_id text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_actor on public.admin_audit_logs (actor_id);
create index if not exists idx_admin_audit_logs_created on public.admin_audit_logs (created_at desc);

-- 2. RLS for admin_audit_logs: Strictly Admin and Service Role
alter table public.admin_audit_logs enable row level security;

drop policy if exists "admin_audit_logs_select_admin" on public.admin_audit_logs;
drop policy if exists "admin_audit_logs_insert_admin" on public.admin_audit_logs;

drop policy if exists "admin_audit_logs_select_admin" on public.admin_audit_logs;
create policy "admin_audit_logs_select_admin" on public.admin_audit_logs
  for select using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

drop policy if exists "admin_audit_logs_insert_admin" on public.admin_audit_logs;
create policy "admin_audit_logs_insert_admin" on public.admin_audit_logs
  for insert with check (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- 3. Security Definer RPC: admin_log_action
create or replace function public.admin_log_action(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_details jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) and (auth.jwt() ->> 'role' != 'service_role') then
    raise exception 'Akses ditolak: Hanya admin yang dapat mencatat audit log.';
  end if;

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details, created_at)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb), now());
end;
$$;

-- 4. Security Definer RPC: admin_save_question
create or replace function public.admin_save_question(
  p_id text,
  p_lesson_id text,
  p_question_type text,
  p_prompt text,
  p_explanation text,
  p_difficulty text,
  p_order_index integer,
  p_status text,
  p_word_bank jsonb default '[]'::jsonb,
  p_options jsonb default '[]'::jsonb,
  p_answer_key text default '',
  p_validation_type text default 'exact'
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_opt jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Akses ditolak: Hanya administrator yang dapat mengelola bank soal.';
  end if;

  -- 1. Upsert curriculum_questions
  insert into public.curriculum_questions (
    id, lesson_id, question_type, prompt, explanation, difficulty, order_index, status, word_bank, updated_at
  ) values (
    p_id, p_lesson_id, p_question_type::public.question_type_enum, p_prompt, p_explanation, p_difficulty, p_order_index, p_status::public.content_status, p_word_bank, now()
  ) on conflict (id) do update set
    prompt = excluded.prompt,
    explanation = excluded.explanation,
    difficulty = excluded.difficulty,
    order_index = excluded.order_index,
    status = excluded.status,
    word_bank = excluded.word_bank,
    version = curriculum_questions.version + 1,
    updated_at = now();

  -- 2. Update options for multiple-choice
  if p_question_type = 'multiple-choice' and jsonb_array_length(p_options) > 0 then
    delete from public.curriculum_question_options where question_id = p_id;
    for v_opt in select * from jsonb_array_elements(p_options) loop
      insert into public.curriculum_question_options (question_id, id, label, order_index)
      values (p_id, v_opt ->> 'id', v_opt ->> 'label', coalesce((v_opt ->> 'order_index')::integer, 1));
    end loop;
  end if;

  -- 3. Update server-only answer key
  if p_answer_key is not null and p_answer_key != '' then
    insert into public.curriculum_question_answer_keys (
      question_id, validation_type, expected_answer, updated_at
    ) values (
      p_id, p_validation_type, p_answer_key, now()
    ) on conflict (question_id) do update set
      validation_type = excluded.validation_type,
      expected_answer = excluded.expected_answer,
      updated_at = now();
  end if;

  -- 4. Catat jejak audit
  perform public.admin_log_action(
    'save_question', 'question', p_id,
    jsonb_build_object('lesson_id', p_lesson_id, 'status', p_status, 'prompt', p_prompt)
  );

  return jsonb_build_object('ok', true, 'message', 'Soal berhasil disimpan.', 'question_id', p_id);
end;
$$;

-- 5. Security Definer RPC: admin_set_question_status
create or replace function public.admin_set_question_status(
  p_question_id text,
  p_status text
)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Akses ditolak: Hanya administrator yang dapat mengubah status soal.';
  end if;

  update public.curriculum_questions
  set status = p_status::public.content_status, updated_at = now()
  where id = p_question_id;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Soal tidak ditemukan.');
  end if;

  perform public.admin_log_action(
    'set_question_status', 'question', p_question_id,
    jsonb_build_object('new_status', p_status)
  );

  return jsonb_build_object('ok', true, 'message', 'Status soal berhasil diubah ke ' || p_status);
end;
$$;

-- 6. Security Definer RPC: admin_get_system_stats
create or replace function public.admin_get_system_stats()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_courses_count integer := 0;
  v_units_count integer := 0;
  v_lessons_count integer := 0;
  v_questions_count integer := 0;
  v_learners_count integer := 0;
  v_attempts_count integer := 0;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Akses ditolak: Hanya administrator yang dapat melihat statistik sistem.';
  end if;

  select count(*) into v_courses_count from public.courses;
  select count(*) into v_units_count from public.curriculum_units;
  select count(*) into v_lessons_count from public.curriculum_lessons;
  select count(*) into v_questions_count from public.curriculum_questions;
  select count(*) into v_learners_count from public.profiles;
  select count(*) into v_attempts_count from public.lesson_attempts;

  return jsonb_build_object(
    'ok', true,
    'courses_count', v_courses_count,
    'units_count', v_units_count,
    'lessons_count', v_lessons_count,
    'questions_count', v_questions_count,
    'learners_count', v_learners_count,
    'attempts_count', v_attempts_count
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- SOURCE: 20261103000007_block29_friends_social_privacy.sql
-- ----------------------------------------------------------------------------
-- Blok 29 Migration: Real Friends, Friend Requests, Blocks & Presence Privacy
-- Migration ID: 20261103000007_block29_friends_social_privacy.sql

-- 1. Enums
do $$ begin
  create type public.friend_request_status as enum ('pending', 'accepted', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.presence_preference as enum ('public', 'friends_only', 'hidden');
exception when duplicate_object then null; end $$;

-- 2. Add privacy & status columns to profiles
alter table public.profiles
  add column if not exists presence_privacy public.presence_preference not null default 'friends_only',
  add column if not exists custom_status text default '';

-- 3. Friendships Table (Strict canonical user pair: user_a < user_b)
create table if not exists public.friendships (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint check_friendships_canonical_pair check (user_a < user_b),
  primary key (user_a, user_b)
);

create index if not exists idx_friendships_user_a on public.friendships (user_a);
create index if not exists idx_friendships_user_b on public.friendships (user_b);

-- 4. Friend Requests Table
create table if not exists public.friend_requests (
  id bigint generated always as identity primary key,
  sender_id uuid not null references auth.users (id) on delete cascade,
  receiver_id uuid not null references auth.users (id) on delete cascade,
  status public.friend_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_no_self_friend_request check (sender_id != receiver_id)
);

create unique index if not exists idx_friend_requests_pending_unique
  on public.friend_requests (sender_id, receiver_id)
  where (status = 'pending');

create index if not exists idx_friend_requests_receiver on public.friend_requests (receiver_id);
create index if not exists idx_friend_requests_sender on public.friend_requests (sender_id);

-- 5. User Blocks Table
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint check_no_self_block check (blocker_id != blocked_id),
  primary key (blocker_id, blocked_id)
);

create index if not exists idx_user_blocks_blocker on public.user_blocks (blocker_id);

-- 6. Row Level Security
alter table public.friendships enable row level security;
alter table public.friend_requests enable row level security;
alter table public.user_blocks enable row level security;

-- Friendships RLS
drop policy if exists "friendships_select_members_or_admin" on public.friendships;
drop policy if exists "friendships_select_members_or_admin" on public.friendships;
create policy "friendships_select_members_or_admin" on public.friendships
  for select using (auth.uid() = user_a or auth.uid() = user_b or public.is_admin(auth.uid()));

-- Friend Requests RLS
drop policy if exists "friend_requests_select_parties_or_admin" on public.friend_requests;
drop policy if exists "friend_requests_select_parties_or_admin" on public.friend_requests;
create policy "friend_requests_select_parties_or_admin" on public.friend_requests
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id or public.is_admin(auth.uid()));

-- User Blocks RLS
drop policy if exists "user_blocks_select_blocker_or_admin" on public.user_blocks;
drop policy if exists "user_blocks_select_blocker_or_admin" on public.user_blocks;
create policy "user_blocks_select_blocker_or_admin" on public.user_blocks
  for select using (auth.uid() = blocker_id or public.is_admin(auth.uid()));

-- 7. Security Definer RPC: send_friend_request
create or replace function public.send_friend_request(p_receiver_username text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_sender_id uuid := auth.uid();
  v_receiver_id uuid;
  v_pair_a uuid;
  v_pair_b uuid;
begin
  if v_sender_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  -- 1. Cari receiver berdasarkan username (case-insensitive)
  select user_id into v_receiver_id from public.profiles
  where lower(trim(username)) = lower(trim(p_receiver_username));

  if v_receiver_id is null then
    return jsonb_build_object('ok', false, 'message', 'Pengguna dengan username tersebut tidak ditemukan.');
  end if;

  if v_sender_id = v_receiver_id then
    return jsonb_build_object('ok', false, 'message', 'Kamu tidak dapat mengirim permintaan pertemanan ke diri sendiri.');
  end if;

  -- 2. Cek apakah ada pemblokiran antara kedua pihak
  if exists (
    select 1 from public.user_blocks
    where (blocker_id = v_sender_id and blocked_id = v_receiver_id)
       or (blocker_id = v_receiver_id and blocked_id = v_sender_id)
  ) then
    return jsonb_build_object('ok', false, 'message', 'Tidak dapat mengirim permintaan pertemanan ke pengguna ini.');
  end if;

  -- 3. Cek apakah sudah berteman
  v_pair_a := least(v_sender_id, v_receiver_id);
  v_pair_b := greatest(v_sender_id, v_receiver_id);

  if exists (select 1 from public.friendships where user_a = v_pair_a and user_b = v_pair_b) then
    return jsonb_build_object('ok', false, 'message', 'Kalian sudah berteman.');
  end if;

  -- 4. Cek apakah sudah ada permintaan pending aktif
  if exists (
    select 1 from public.friend_requests
    where sender_id = v_sender_id and receiver_id = v_receiver_id and status = 'pending'
  ) then
    return jsonb_build_object('ok', false, 'message', 'Permintaan pertemanan sudah pernah dikirim sebelumnya.');
  end if;

  -- 5. Jika pihak lawan sudah pernah mengirim request pending, langsung terima (mutual)
  if exists (
    select 1 from public.friend_requests
    where sender_id = v_receiver_id and receiver_id = v_sender_id and status = 'pending'
  ) then
    update public.friend_requests
    set status = 'accepted', updated_at = now()
    where sender_id = v_receiver_id and receiver_id = v_sender_id and status = 'pending';

    insert into public.friendships (user_a, user_b)
    values (v_pair_a, v_pair_b)
    on conflict (user_a, user_b) do nothing;

    return jsonb_build_object('ok', true, 'message', 'Permintaan saling cocok! Kalian sekarang telah berteman.', 'mutual', true);
  end if;

  -- 6. Insert friend request baru
  insert into public.friend_requests (sender_id, receiver_id, status)
  values (v_sender_id, v_receiver_id, 'pending');

  return jsonb_build_object('ok', true, 'message', 'Permintaan pertemanan berhasil dikirim!');
end;
$$;

-- 8. Security Definer RPC: respond_friend_request
create or replace function public.respond_friend_request(
  p_request_id bigint,
  p_action text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_req record;
  v_pair_a uuid;
  v_pair_b uuid;
begin
  if v_user_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  select * into v_req from public.friend_requests where id = p_request_id;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Permintaan pertemanan tidak ditemukan.');
  end if;

  if v_req.receiver_id != v_user_id then
    raise exception 'Akses ditolak: Kamu bukan penerima permintaan pertemanan ini.';
  end if;

  if v_req.status != 'pending' then
    return jsonb_build_object('ok', false, 'message', 'Permintaan ini sudah tidak dalam status pending.');
  end if;

  if p_action = 'accept' then
    v_pair_a := least(v_req.sender_id, v_req.receiver_id);
    v_pair_b := greatest(v_req.sender_id, v_req.receiver_id);

    update public.friend_requests
    set status = 'accepted', updated_at = now()
    where id = p_request_id;

    insert into public.friendships (user_a, user_b)
    values (v_pair_a, v_pair_b)
    on conflict (user_a, user_b) do nothing;

    return jsonb_build_object('ok', true, 'message', 'Permintaan pertemanan diterima!');
  elsif p_action = 'reject' then
    update public.friend_requests
    set status = 'rejected', updated_at = now()
    where id = p_request_id;

    return jsonb_build_object('ok', true, 'message', 'Permintaan pertemanan ditolak.');
  else
    return jsonb_build_object('ok', false, 'message', 'Aksi tidak dikenal.');
  end if;
end;
$$;

-- 9. Security Definer RPC: remove_friend
create or replace function public.remove_friend(p_target_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_pair_a uuid;
  v_pair_b uuid;
begin
  if v_user_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  v_pair_a := least(v_user_id, p_target_user_id);
  v_pair_b := greatest(v_user_id, p_target_user_id);

  delete from public.friendships where user_a = v_pair_a and user_b = v_pair_b;

  return jsonb_build_object('ok', true, 'message', 'Pertemanan berhasil dihapus.');
end;
$$;

-- 10. Security Definer RPC: block_user & unblock_user
create or replace function public.block_user(p_target_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_pair_a uuid;
  v_pair_b uuid;
begin
  if v_user_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  if v_user_id = p_target_user_id then
    return jsonb_build_object('ok', false, 'message', 'Tidak dapat memblokir diri sendiri.');
  end if;

  -- 1. Insert ke user_blocks
  insert into public.user_blocks (blocker_id, blocked_id)
  values (v_user_id, p_target_user_id)
  on conflict (blocker_id, blocked_id) do nothing;

  -- 2. Hapus relasi pertemanan dan pending request apapun antara keduanya
  v_pair_a := least(v_user_id, p_target_user_id);
  v_pair_b := greatest(v_user_id, p_target_user_id);
  delete from public.friendships where user_a = v_pair_a and user_b = v_pair_b;

  delete from public.friend_requests
  where (sender_id = v_user_id and receiver_id = p_target_user_id)
     or (sender_id = p_target_user_id and receiver_id = v_user_id);

  return jsonb_build_object('ok', true, 'message', 'Pengguna berhasil diblokir.');
end;
$$;

create or replace function public.unblock_user(p_target_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  delete from public.user_blocks where blocker_id = v_user_id and blocked_id = p_target_user_id;

  return jsonb_build_object('ok', true, 'message', 'Pemblokiran pengguna dibuka.');
end;
$$;

-- 11. Security Definer RPC: get_friends_list
create or replace function public.get_friends_list()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.user_id,
      'name', p.name,
      'username', p.username,
      'level', p.level,
      'custom_status', coalesce(p.custom_status, ''),
      'presence_privacy', p.presence_privacy,
      'avatar', jsonb_build_object(
        'skinToneId', coalesce(ac.skin_tone_id, 'skin-medium'),
        'hairId', coalesce(ac.hair_id, 'hair-short-black'),
        'topId', coalesce(ac.top_id, 'top-hoodie-lavender'),
        'bottomId', coalesce(ac.bottom_id, 'bottom-dark-pants'),
        'shoesId', coalesce(ac.shoes_id, 'shoes-white'),
        'accessoryId', ac.accessory_id
      )
    )
  ), '[]'::jsonb) into v_result
  from public.friendships f
  cross join lateral (
    select case when f.user_a = v_user_id then f.user_b else f.user_a end as friend_uuid
  ) f_uuid
  join public.profiles p on p.user_id = f_uuid.friend_uuid
  left join public.avatar_configs ac on ac.user_id = f_uuid.friend_uuid
  where (f.user_a = v_user_id or f.user_b = v_user_id)
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = v_user_id and b.blocked_id = f_uuid.friend_uuid)
         or (b.blocker_id = f_uuid.friend_uuid and b.blocked_id = v_user_id)
    );

  return v_result;
end;
$$;

-- ----------------------------------------------------------------------------
-- SOURCE: 20261103000008_block30_multiplayer_rooms.sql
-- ----------------------------------------------------------------------------
-- Blok 30 Migration: Multiplayer Worlds, Rooms, Memberships & Realtime Security
-- Migration ID: 20261103000008_block30_multiplayer_rooms.sql

-- 1. World Definitions Table
create table if not exists public.world_definitions (
  id text primary key,
  slug text not null unique,
  title text not null,
  is_active boolean not null default true,
  map_version integer not null default 1,
  max_room_capacity integer not null default 20,
  created_at timestamptz not null default now()
);

-- Seed worlds: Mini Home (private single-player) & Social Plaza (multiplayer)
insert into public.world_definitions (id, slug, title, is_active, map_version, max_room_capacity)
values
  ('mini-home', 'mini-home', 'Mini Home (Private Practice)', true, 1, 1),
  ('social-plaza', 'social-plaza', 'Social Plaza (Multiplayer World)', true, 1, 20)
on conflict (id) do update set
  title = excluded.title,
  max_room_capacity = excluded.max_room_capacity;

-- 2. World Rooms Table
create table if not exists public.world_rooms (
  id text primary key,
  world_id text not null references public.world_definitions (id) on delete cascade,
  name text not null check (char_length(name) between 3 and 100),
  visibility text not null default 'public' check (visibility in ('public', 'private', 'friends_only')),
  capacity integer not null default 15 check (capacity between 2 and 50),
  created_by uuid references auth.users (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'closed', 'archived')),
  invite_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_world_rooms_world_status on public.world_rooms (world_id, status);
create index if not exists idx_world_rooms_invite on public.world_rooms (invite_code);

-- Seed default public rooms for Social Plaza
insert into public.world_rooms (id, world_id, name, visibility, capacity, status)
values
  ('plaza-lobby-1', 'social-plaza', 'Plaza Utama (Lobby 1)', 'public', 20, 'active'),
  ('plaza-lobby-2', 'social-plaza', 'Plaza Bahasa (Lobby 2)', 'public', 20, 'active')
on conflict (id) do update set
  name = excluded.name,
  capacity = excluded.capacity;

-- 3. Room Memberships Table (Single active room enforcement per user)
create table if not exists public.room_memberships (
  id bigint generated always as identity primary key,
  room_id text not null references public.world_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_room_memberships_room on public.room_memberships (room_id);

-- 4. Row Level Security
alter table public.world_definitions enable row level security;
alter table public.world_rooms enable row level security;
alter table public.room_memberships enable row level security;

-- World definitions are publicly readable
drop policy if exists "world_definitions_select_all" on public.world_definitions;
create policy "world_definitions_select_all" on public.world_definitions
  for select using (true);

-- World rooms: Public rooms visible to all authenticated users, private visible to creator/admin
drop policy if exists "world_rooms_select_accessible" on public.world_rooms;
create policy "world_rooms_select_accessible" on public.world_rooms
  for select using (
    visibility = 'public'
    or auth.uid() = created_by
    or public.is_admin(auth.uid())
    or exists (select 1 from public.room_memberships rm where rm.room_id = world_rooms.id and rm.user_id = auth.uid())
  );

-- Room memberships: visible to members in the same room or admin
drop policy if exists "room_memberships_select_room" on public.room_memberships;
create policy "room_memberships_select_room" on public.room_memberships
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.room_memberships mine where mine.room_id = room_memberships.room_id and mine.user_id = auth.uid())
    or public.is_admin(auth.uid())
  );

-- 5. Security Definer RPC: join_world_room
create or replace function public.join_world_room(
  p_room_id text,
  p_invite_code text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_room record;
  v_current_count integer;
  v_pair_a uuid;
  v_pair_b uuid;
begin
  if v_user_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  -- 1. Validasi keberadaan dan status room
  select * into v_room from public.world_rooms where id = p_room_id and status = 'active';
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Room tidak ditemukan atau telah ditutup.');
  end if;

  -- 2. Bersihkan membership kadaluarsa (> 90 detik tanpa heartbeat)
  delete from public.room_memberships
  where last_heartbeat_at < (now() - interval '90 seconds');

  -- 3. Cek kapasitas room
  select count(*) into v_current_count from public.room_memberships where room_id = p_room_id;
  if v_current_count >= v_room.capacity and not exists (select 1 from public.room_memberships where room_id = p_room_id and user_id = v_user_id) then
    return jsonb_build_object('ok', false, 'message', 'Room sudah penuh (' || v_current_count || '/' || v_room.capacity || ').');
  end if;

  -- 4. Validasi izin akses (visibility)
  if v_room.visibility = 'private' and v_room.created_by != v_user_id and not public.is_admin(v_user_id) then
    if p_invite_code is null or p_invite_code != v_room.invite_code then
      return jsonb_build_object('ok', false, 'message', 'Kode undangan tidak valid untuk room privat ini.');
    end if;
  elsif v_room.visibility = 'friends_only' and v_room.created_by != v_user_id and not public.is_admin(v_user_id) then
    v_pair_a := least(v_user_id, v_room.created_by);
    v_pair_b := greatest(v_user_id, v_room.created_by);
    if not exists (select 1 from public.friendships where user_a = v_pair_a and user_b = v_pair_b) then
      return jsonb_build_object('ok', false, 'message', 'Room ini khusus teman pembuat room.');
    end if;
  end if;

  -- 5. Kebijakan single-active-room: hapus keanggotaan room lama pengguna
  delete from public.room_memberships where user_id = v_user_id;

  -- 6. Masukkan keanggotaan room baru
  insert into public.room_memberships (room_id, user_id, joined_at, last_heartbeat_at)
  values (p_room_id, v_user_id, now(), now());

  return jsonb_build_object(
    'ok', true,
    'message', 'Berhasil bergabung ke room.',
    'room', jsonb_build_object(
      'id', v_room.id,
      'world_id', v_room.world_id,
      'name', v_room.name,
      'visibility', v_room.visibility,
      'capacity', v_room.capacity,
      'channel', 'room:' || v_room.id
    )
  );
end;
$$;

-- 6. Security Definer RPC: leave_world_room
create or replace function public.leave_world_room(p_room_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  delete from public.room_memberships where room_id = p_room_id and user_id = v_user_id;

  return jsonb_build_object('ok', true, 'message', 'Berhasil keluar dari room.');
end;
$$;

-- 7. Security Definer RPC: heartbeat_world_room
create or replace function public.heartbeat_world_room(p_room_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  update public.room_memberships
  set last_heartbeat_at = now()
  where room_id = p_room_id and user_id = v_user_id;

  -- Hapus room membership kadaluarsa
  delete from public.room_memberships
  where last_heartbeat_at < (now() - interval '90 seconds');

  return jsonb_build_object('ok', true);
end;
$$;

-- 8. Security Definer RPC: create_world_room
create or replace function public.create_world_room(
  p_name text,
  p_world_id text default 'social-plaza',
  p_visibility text default 'public',
  p_capacity integer default 15
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_room_id text;
  v_invite_code text;
begin
  if v_user_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  v_room_id := 'room-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
  v_invite_code := upper(substr(md5(random()::text), 1, 6));

  insert into public.world_rooms (
    id, world_id, name, visibility, capacity, created_by, status, invite_code
  ) values (
    v_room_id, p_world_id, p_name, p_visibility, p_capacity, v_user_id, 'active', v_invite_code
  );

  -- Langsung gabungkan pembuat room
  delete from public.room_memberships where user_id = v_user_id;
  insert into public.room_memberships (room_id, user_id, joined_at, last_heartbeat_at)
  values (v_room_id, v_user_id, now(), now());

  return jsonb_build_object(
    'ok', true,
    'message', 'Room berhasil dibuat.',
    'room', jsonb_build_object(
      'id', v_room_id,
      'world_id', p_world_id,
      'name', p_name,
      'visibility', p_visibility,
      'capacity', p_capacity,
      'invite_code', v_invite_code,
      'channel', 'room:' || v_room_id
    )
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- SOURCE: 20261103000009_block32_player_chat_moderation_practice.sql
-- ----------------------------------------------------------------------------
-- ==============================================================================
-- Migration: 20261103000009_block32_player_chat_moderation_practice.sql
-- Description: Tabel moderasi laporan pemain, mute list, dan RPC keamanan interaksi
-- ==============================================================================

-- 1. Tabel Moderation Reports (Laporan Pemain)
create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reported_id uuid not null references auth.users (id) on delete cascade,
  room_id text,
  reason text not null check (reason in ('spam', 'harassment', 'inappropriate', 'hate_speech', 'other')),
  notes text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  constraint check_no_self_report check (reporter_id != reported_id)
);

create index if not exists idx_moderation_reports_reported on public.moderation_reports (reported_id);
create index if not exists idx_moderation_reports_status on public.moderation_reports (status);
create index if not exists idx_moderation_reports_created on public.moderation_reports (created_at desc);

-- 2. Tabel Persistent User Mutes (Daftar Mute Pemain)
create table if not exists public.user_mutes (
  muter_id uuid not null references auth.users (id) on delete cascade,
  muted_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint check_no_self_mute check (muter_id != muted_id),
  primary key (muter_id, muted_id)
);

create index if not exists idx_user_mutes_muter on public.user_mutes (muter_id);

-- 3. Row Level Security
alter table public.moderation_reports enable row level security;
alter table public.user_mutes enable row level security;

-- Moderation Reports RLS
drop policy if exists "moderation_reports_insert_auth" on public.moderation_reports;
drop policy if exists "moderation_reports_insert_auth" on public.moderation_reports;
create policy "moderation_reports_insert_auth" on public.moderation_reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists "moderation_reports_select_reporter_or_admin" on public.moderation_reports;
drop policy if exists "moderation_reports_select_reporter_or_admin" on public.moderation_reports;
create policy "moderation_reports_select_reporter_or_admin" on public.moderation_reports
  for select using (auth.uid() = reporter_id or public.is_admin(auth.uid()));

drop policy if exists "moderation_reports_update_admin" on public.moderation_reports;
drop policy if exists "moderation_reports_update_admin" on public.moderation_reports;
create policy "moderation_reports_update_admin" on public.moderation_reports
  for update using (public.is_admin(auth.uid()));

-- User Mutes RLS
drop policy if exists "user_mutes_select_own" on public.user_mutes;
drop policy if exists "user_mutes_select_own" on public.user_mutes;
create policy "user_mutes_select_own" on public.user_mutes
  for select using (auth.uid() = muter_id);

drop policy if exists "user_mutes_insert_own" on public.user_mutes;
drop policy if exists "user_mutes_insert_own" on public.user_mutes;
create policy "user_mutes_insert_own" on public.user_mutes
  for insert with check (auth.uid() = muter_id);

drop policy if exists "user_mutes_delete_own" on public.user_mutes;
drop policy if exists "user_mutes_delete_own" on public.user_mutes;
create policy "user_mutes_delete_own" on public.user_mutes
  for delete using (auth.uid() = muter_id);

-- 4. RPC: submit_moderation_report
create or replace function public.submit_moderation_report(
  p_reported_id uuid,
  p_reason text,
  p_notes text default null,
  p_room_id text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_reporter_id uuid := auth.uid();
begin
  if v_reporter_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  if v_reporter_id = p_reported_id then
    return jsonb_build_object('ok', false, 'message', 'Tidak dapat melaporkan diri sendiri.');
  end if;

  if p_reason not in ('spam', 'harassment', 'inappropriate', 'hate_speech', 'other') then
    return jsonb_build_object('ok', false, 'message', 'Alasan laporan tidak valid.');
  end if;

  insert into public.moderation_reports (reporter_id, reported_id, reason, notes, room_id)
  values (v_reporter_id, p_reported_id, p_reason, trim(p_notes), p_room_id);

  return jsonb_build_object(
    'ok', true,
    'message', 'Laporan berhasil dikirim dan akan segera ditinjau oleh tim moderator.'
  );
end;
$$;

-- 5. RPC: mute_user & unmute_user
create or replace function public.mute_user(p_target_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_muter_id uuid := auth.uid();
begin
  if v_muter_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  if v_muter_id = p_target_user_id then
    return jsonb_build_object('ok', false, 'message', 'Tidak dapat me-mute diri sendiri.');
  end if;

  insert into public.user_mutes (muter_id, muted_id)
  values (v_muter_id, p_target_user_id)
  on conflict (muter_id, muted_id) do nothing;

  return jsonb_build_object('ok', true, 'message', 'Pemain berhasil di-mute.');
end;
$$;

create or replace function public.unmute_user(p_target_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_muter_id uuid := auth.uid();
begin
  if v_muter_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  delete from public.user_mutes
  where muter_id = v_muter_id and muted_id = p_target_user_id;

  return jsonb_build_object('ok', true, 'message', 'Mute pemain dibuka.');
end;
$$;

create or replace function public.get_muted_user_ids()
returns table (muted_id uuid) language sql security definer set search_path = public as $$
  select muted_id from public.user_mutes where muter_id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- AUTO-BOOTSTRAP ROLE ADMIN UNTUK AKUN YANG SUDAH TERDAFTAR DI AUTH.USERS
-- ----------------------------------------------------------------------------
insert into public.user_roles (user_id, role)
select id, 'user'::public.app_role from auth.users
on conflict (user_id, role) do nothing;

insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role from auth.users
on conflict (user_id, role) do nothing;
