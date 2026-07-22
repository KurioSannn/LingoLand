-- Lingoland Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
--
-- Mission/objective/keyword content stays hardcoded in src/data/demoData.ts.
-- These tables only hold per-user data that previously lived in localStorage
-- under the `lingoland_demo_v1` key.

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

-- Row Level Security: each user can only read/write their own rows.
alter table public.profiles enable row level security;
alter table public.avatar_configs enable row level security;
alter table public.inventory_items enable row level security;
alter table public.mission_progress enable row level security;
alter table public.claimed_rewards enable row level security;

create policy "profiles_owner" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "avatar_configs_owner" on public.avatar_configs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "inventory_items_owner" on public.inventory_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "mission_progress_owner" on public.mission_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "claimed_rewards_owner" on public.claimed_rewards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
