-- ==============================================================================
-- Migration: 20261103000011_fix_lesson_progress_permissions.sql
-- Description: Phase 2 High-Severity Security Fix — Remove direct client write
--              policies on lesson_progress, claimed_rewards, inventory_items,
--              mission_progress, and lesson_attempts; enforce starter balances
--              on profile creation; validate avatar item ownership.
-- ==============================================================================

-- 1. Lock down public.lesson_progress (SELECT only for owner/admin; writes via SECURITY DEFINER RPC)
drop policy if exists "lesson_progress_owner" on public.lesson_progress;
drop policy if exists "lesson_progress_insert_own" on public.lesson_progress;
drop policy if exists "lesson_progress_update_own" on public.lesson_progress;
drop policy if exists "lesson_progress_delete_own" on public.lesson_progress;
drop policy if exists "lesson_progress_select_own_or_admin" on public.lesson_progress;
drop policy if exists "lesson_progress_admin_all" on public.lesson_progress;

create policy "lesson_progress_select_own_or_admin" on public.lesson_progress
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "lesson_progress_admin_all" on public.lesson_progress
  for all using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'))
  with check (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- 2. Lock down public.claimed_rewards (SELECT only for owner/admin; writes via claim_mission_reward_atomic)
drop policy if exists "claimed_rewards_owner" on public.claimed_rewards;
drop policy if exists "claimed_rewards_select_own_or_admin" on public.claimed_rewards;
drop policy if exists "claimed_rewards_admin_all" on public.claimed_rewards;

create policy "claimed_rewards_select_own_or_admin" on public.claimed_rewards
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "claimed_rewards_admin_all" on public.claimed_rewards
  for all using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'))
  with check (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- 3. Lock down public.inventory_items (SELECT only for owner/admin; writes via buy_store_item_atomic / starter trigger)
drop policy if exists "inventory_items_owner" on public.inventory_items;
drop policy if exists "inventory_items_select_own_or_admin" on public.inventory_items;
drop policy if exists "inventory_items_admin_all" on public.inventory_items;

create policy "inventory_items_select_own_or_admin" on public.inventory_items
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "inventory_items_admin_all" on public.inventory_items
  for all using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'))
  with check (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- 4. Lock down public.mission_progress (SELECT only for owner/admin; writes via verify_mission_objective_atomic & claim_mission_reward_atomic)
drop policy if exists "mission_progress_owner" on public.mission_progress;
drop policy if exists "mission_progress_select_own_or_admin" on public.mission_progress;
drop policy if exists "mission_progress_admin_all" on public.mission_progress;

create policy "mission_progress_select_own_or_admin" on public.mission_progress
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "mission_progress_admin_all" on public.mission_progress
  for all using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'))
  with check (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- 5. Lock down public.lesson_attempts (SELECT only for owner/admin; inserts via grade_lesson_attempt_atomic)
drop policy if exists "lesson_attempts_owner_insert" on public.lesson_attempts;
drop policy if exists "lesson_attempts_admin_all" on public.lesson_attempts;

create policy "lesson_attempts_admin_all" on public.lesson_attempts
  for all using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'))
  with check (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- 6. Strengthen profile economy protection trigger to cover both INSERT and UPDATE
create or replace function public.protect_profile_economy_fields()
returns trigger language plpgsql as $$
begin
  -- Allow SECURITY DEFINER functions (running as postgres/table owner) and service_role
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Force canonical starter balances for new learner profiles created from client
    new.coins := 1000;
    new.xp := 0;
    new.level := 1;
    new.hearts := 5;
    new.streak_days := 1;
  elsif tg_op = 'UPDATE' then
    -- Retain authoritative server economy values on client profile updates
    new.coins := old.coins;
    new.xp := old.xp;
    new.level := old.level;
  end if;

  return new;
end;
$$;

drop trigger if exists on_protect_profile_economy on public.profiles;
create trigger on_protect_profile_economy
  before insert or update on public.profiles
  for each row execute function public.protect_profile_economy_fields();

-- 7. Automatically seed starter inventory and initial mission progress when a profile is created
create or replace function public.seed_starter_player_data()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.inventory_items (user_id, item_id)
  values
    (new.user_id, 'hair-short-black'),
    (new.user_id, 'hair-bob-brown'),
    (new.user_id, 'hair-curly-dark'),
    (new.user_id, 'top-hoodie-lavender'),
    (new.user_id, 'top-basic-tee'),
    (new.user_id, 'bottom-dark-pants'),
    (new.user_id, 'bottom-blue-jeans'),
    (new.user_id, 'bottom-casual-skirt'),
    (new.user_id, 'shoes-white')
  on conflict (user_id, item_id) do nothing;

  insert into public.mission_progress (user_id, mission_id, status, completed_objective_ids, updated_at)
  values
    (new.user_id, 'intro', 'active', '{}', now()),
    (new.user_id, 'hobby', 'available', '{}', now()),
    (new.user_id, 'weekend', 'locked', '{}', now())
  on conflict (user_id, mission_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_profile_created_seed_starter on public.profiles;
create trigger on_profile_created_seed_starter
  after insert on public.profiles
  for each row execute function public.seed_starter_player_data();

-- 8. Validate avatar_configs so learners can only equip starter items or owned inventory_items
create or replace function public.is_avatar_item_allowed(p_user_id uuid, p_item_id text)
returns boolean language sql security definer stable set search_path = public as $$
  select
    p_item_id is null
    or p_item_id in (
      'skin-light',
      'skin-medium',
      'skin-tan',
      'skin-dark',
      'hair-short-black',
      'hair-bob-brown',
      'hair-curly-dark',
      'hair-long-wave',
      'top-hoodie-lavender',
      'top-basic-tee',
      'top-tshirt-blue',
      'bottom-dark-pants',
      'bottom-blue-jeans',
      'bottom-casual-skirt',
      'bottom-beige-shorts',
      'shoes-white'
    )
    or exists (
      select 1 from public.inventory_items
      where user_id = p_user_id and item_id = p_item_id
    );
$$;

create or replace function public.validate_avatar_config_ownership()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_avatar_item_allowed(new.user_id, new.skin_tone_id)
     or not public.is_avatar_item_allowed(new.user_id, new.hair_id)
     or not public.is_avatar_item_allowed(new.user_id, new.top_id)
     or not public.is_avatar_item_allowed(new.user_id, new.bottom_id)
     or not public.is_avatar_item_allowed(new.user_id, new.shoes_id)
     or not public.is_avatar_item_allowed(new.user_id, new.accessory_id) then
    raise exception 'Akses ditolak: Kamu belum memiliki salah satu item avatar yang dipilih.';
  end if;

  return new;
end;
$$;

drop trigger if exists on_validate_avatar_config_ownership on public.avatar_configs;
create trigger on_validate_avatar_config_ownership
  before insert or update on public.avatar_configs
  for each row execute function public.validate_avatar_config_ownership();
