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

create policy "wallet_transactions_select_own_or_admin" on public.wallet_transactions
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

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
