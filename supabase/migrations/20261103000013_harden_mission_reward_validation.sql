-- ==============================================================================
-- Migration: 20261103000013_harden_mission_reward_validation.sql
-- Description: Phase 7 High-Severity Security Fix — Add server-authoritative
--              mission objective definitions, verify_mission_objective_atomic RPC,
--              and enforce completed objective verification inside
--              claim_mission_reward_atomic before granting coins/XP.
-- ==============================================================================

-- 1. Server-Authoritative Mission Objectives Table
create table if not exists public.mission_objective_definitions (
  mission_id text not null references public.mission_definitions (id) on delete cascade,
  id text not null,
  label text not null,
  keywords text[] not null default '{}',
  order_index integer not null default 1,
  primary key (mission_id, id)
);

alter table public.mission_objective_definitions enable row level security;

drop policy if exists "mission_objective_definitions_read_all" on public.mission_objective_definitions;
create policy "mission_objective_definitions_read_all" on public.mission_objective_definitions
  for select using (true);

drop policy if exists "mission_objective_definitions_admin_all" on public.mission_objective_definitions;
create policy "mission_objective_definitions_admin_all" on public.mission_objective_definitions
  for all using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'))
  with check (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- Seed authoritative objectives matching the 3 NPC missions
insert into public.mission_objective_definitions (mission_id, id, label, keywords, order_index)
values
  ('intro', 'name', 'Sampaikan nama', array['my name', 'i am', 'call me'], 1),
  ('intro', 'origin', 'Sampaikan asal atau kampus', array['from', 'live in', 'study at'], 2),
  ('intro', 'interest', 'Sampaikan satu hal yang disukai', array['like', 'love', 'enjoy', 'hobby'], 3),
  ('hobby', 'ask-hobby', 'Tanyakan hobi NPC', array['what do you like', 'your hobby', 'like to do'], 1),
  ('hobby', 'own-hobby', 'Ceritakan hobi sendiri', array['my hobby', 'i like', 'i enjoy', 'i love'], 2),
  ('hobby', 'follow-up', 'Beri satu pertanyaan lanjutan', array['how often', 'why', 'when do you'], 3),
  ('weekend', 'ask-plan', 'Tanyakan rencana akhir pekan', array['what will you do', 'weekend', 'plan'], 1),
  ('weekend', 'own-plan', 'Jelaskan rencana sendiri', array['i will', 'i am going', 'visit'], 2),
  ('weekend', 'polite-close', 'Tutup percakapan dengan sopan', array['see you', 'sounds great', 'thank you', 'later'], 3)
on conflict (mission_id, id) do update set
  label = excluded.label,
  keywords = excluded.keywords,
  order_index = excluded.order_index;

-- 2. RPC: verify_mission_objective_atomic
create or replace function public.verify_mission_objective_atomic(
  p_mission_id text,
  p_user_input text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_mission record;
  v_norm_input text;
  v_existing_ids text[] := '{}';
  v_next_ids text[] := '{}';
  v_obj record;
  v_kw text;
  v_matched boolean;
  v_total_objectives integer := 0;
  v_all_completed boolean := false;
  v_status text := 'active';
begin
  if v_user_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  select * into v_mission
  from public.mission_definitions
  where id = p_mission_id and is_active = true;

  if not found then
    raise exception 'Definisi misi tidak ditemukan: %', p_mission_id;
  end if;

  v_norm_input := lower(btrim(coalesce(p_user_input, '')));
  if char_length(v_norm_input) < 2 or char_length(v_norm_input) > 200 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Kalimat percakapan harus terdiri dari 2 hingga 200 karakter.'
    );
  end if;

  -- Cek prasyarat misi weekend (harus menyelesaikan intro terlebih dahulu)
  if p_mission_id = 'weekend' then
    if not exists (
      select 1 from public.mission_progress
      where user_id = v_user_id and mission_id = 'intro' and status = 'completed'
    ) and not exists (
      select 1 from public.claimed_rewards
      where user_id = v_user_id and mission_id = 'intro'
    ) then
      return jsonb_build_object(
        'ok', false,
        'message', 'Selesaikan misi Perkenalan Diri terlebih dahulu untuk membuka misi Rencana Akhir Pekan.'
      );
    end if;
  end if;

  select coalesce(completed_objective_ids, '{}')
  into v_existing_ids
  from public.mission_progress
  where user_id = v_user_id and mission_id = p_mission_id
  for update;

  v_next_ids := coalesce(v_existing_ids, '{}');

  for v_obj in (
    select id, keywords
    from public.mission_objective_definitions
    where mission_id = p_mission_id
    order by order_index asc
  ) loop
    v_total_objectives := v_total_objectives + 1;
    if not (v_obj.id = any(v_next_ids)) then
      v_matched := false;
      foreach v_kw in array v_obj.keywords loop
        if position(lower(v_kw) in v_norm_input) > 0 then
          v_matched := true;
          exit;
        end if;
      end loop;

      if v_matched then
        v_next_ids := array_append(v_next_ids, v_obj.id);
      end if;
    end if;
  end loop;

  v_all_completed := (v_total_objectives > 0 and coalesce(cardinality(v_next_ids), 0) >= v_total_objectives);
  v_status := case when v_all_completed then 'completed' else 'active' end;

  insert into public.mission_progress (user_id, mission_id, status, completed_objective_ids, updated_at)
  values (v_user_id, p_mission_id, v_status, v_next_ids, now())
  on conflict (user_id, mission_id) do update
    set status = case
          when mission_progress.status = 'completed' then 'completed'
          else excluded.status
        end,
        completed_objective_ids = excluded.completed_objective_ids,
        updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'mission_id', p_mission_id,
    'completed_objective_ids', to_jsonb(v_next_ids),
    'total_objectives', v_total_objectives,
    'all_completed', v_all_completed,
    'status', v_status
  );
end;
$$;

grant execute on function public.verify_mission_objective_atomic(text, text) to authenticated;

-- 3. Harden claim_mission_reward_atomic to require verified objective completion
create or replace function public.claim_mission_reward_atomic(p_mission_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_mission record;
  v_idempotency_key text;
  v_required_objectives text[];
  v_completed_objectives text[];
  v_missing_count integer := 0;
  v_new_coins integer;
  v_new_xp integer;
  v_new_level integer;
begin
  if v_user_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  -- 1. Validasi definisi misi server
  select * into v_mission
  from public.mission_definitions
  where id = p_mission_id and is_active = true;

  if not found then
    raise exception 'Definisi misi tidak ditemukan: %', p_mission_id;
  end if;

  -- 2. Lock baris profil pengguna untuk mencegah race condition klaim ganda
  select coins, xp, level
  into v_new_coins, v_new_xp, v_new_level
  from public.profiles
  where user_id = v_user_id
  for update;

  -- 3. Cek apakah sudah pernah diklaim sebelumnya (idempotency check)
  v_idempotency_key := 'mission:' || v_user_id || ':' || p_mission_id;

  if exists (
    select 1 from public.claimed_rewards
    where user_id = v_user_id and mission_id = p_mission_id
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Reward misi ini sudah pernah diklaim sebelumnya.',
      'already_claimed', true,
      'coins', coalesce(v_new_coins, 0),
      'xp', coalesce(v_new_xp, 0),
      'level', coalesce(v_new_level, 1)
    );
  end if;

  -- 4. Verifikasi bahwa seluruh objektif misi benar-benar telah diselesaikan di server
  select coalesce(array_agg(id), '{}')
  into v_required_objectives
  from public.mission_objective_definitions
  where mission_id = p_mission_id;

  select coalesce(completed_objective_ids, '{}')
  into v_completed_objectives
  from public.mission_progress
  where user_id = v_user_id and mission_id = p_mission_id;

  if cardinality(v_required_objectives) > 0 then
    select count(*)
    into v_missing_count
    from unnest(v_required_objectives) as req_id
    where not (req_id = any(coalesce(v_completed_objectives, '{}')));

    if v_missing_count > 0 then
      return jsonb_build_object(
        'ok', false,
        'code', 'MISSION_INCOMPLETE',
        'message', 'Seluruh objektif percakapan misi harus diselesaikan terlebih dahulu sebelum mengklaim hadiah.',
        'already_claimed', false
      );
    end if;
  end if;

  -- 5. Catat di ledger transaksi dompet
  insert into public.wallet_transactions (user_id, source_type, source_id, delta_coins, delta_xp, idempotency_key)
  values (v_user_id, 'mission_reward', p_mission_id, v_mission.reward_coins, v_mission.reward_xp, v_idempotency_key)
  on conflict (idempotency_key) do nothing;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Reward misi ini sudah pernah diklaim sebelumnya.',
      'already_claimed', true,
      'coins', coalesce(v_new_coins, 0),
      'xp', coalesce(v_new_xp, 0),
      'level', coalesce(v_new_level, 1)
    );
  end if;

  -- 6. Catat status misi dan klaim
  insert into public.claimed_rewards (user_id, mission_id)
  values (v_user_id, p_mission_id)
  on conflict (user_id, mission_id) do nothing;

  insert into public.mission_progress (user_id, mission_id, status, completed_objective_ids, updated_at)
  values (v_user_id, p_mission_id, 'completed', coalesce(v_completed_objectives, v_required_objectives), now())
  on conflict (user_id, mission_id) do update
    set status = 'completed',
        updated_at = now();

  -- Buka misi weekend jika intro selesai
  if p_mission_id = 'intro' then
    insert into public.mission_progress (user_id, mission_id, status)
    values (v_user_id, 'weekend', 'available')
    on conflict (user_id, mission_id) do update
      set status = case when mission_progress.status = 'locked' then 'available' else mission_progress.status end,
          updated_at = now();
  end if;

  -- 7. Update profil koin, xp, dan level secara atomik
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
    'already_claimed', false,
    'gained_coins', v_mission.reward_coins,
    'gained_xp', v_mission.reward_xp,
    'coins', v_new_coins,
    'xp', v_new_xp,
    'level', v_new_level
  );
end;
$$;

grant execute on function public.claim_mission_reward_atomic(text) to authenticated;
