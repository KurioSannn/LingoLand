-- ==============================================================================
-- Migration: 20261103000012_fix_room_membership_rls.sql
-- Description: Phase 3 Critical Multiplayer Fix — Resolve infinite RLS recursion
--              on public.room_memberships and public.world_rooms, and enforce
--              concurrency-safe capacity locking in join_world_room.
-- ==============================================================================

-- 1. Safe SECURITY DEFINER helpers to break direct and mutual RLS recursion
create or replace function public.get_my_active_room_id()
returns text language sql security definer stable set search_path = public as $$
  select room_id
  from public.room_memberships
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_public_active_room(p_room_id text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.world_rooms
    where id = p_room_id
      and visibility = 'public'
      and status = 'active'
  );
$$;

grant execute on function public.get_my_active_room_id() to authenticated, anon;
grant execute on function public.is_public_active_room(text) to authenticated, anon;

-- 2. Replace recursive policies on public.world_rooms and public.room_memberships
drop policy if exists "world_rooms_select_accessible" on public.world_rooms;
create policy "world_rooms_select_accessible" on public.world_rooms
  for select using (
    visibility = 'public'
    or auth.uid() = created_by
    or id = public.get_my_active_room_id()
    or public.is_admin(auth.uid())
  );

drop policy if exists "room_memberships_select_room" on public.room_memberships;
create policy "room_memberships_select_room" on public.room_memberships
  for select using (
    auth.uid() = user_id
    or room_id = public.get_my_active_room_id()
    or public.is_public_active_room(room_id)
    or public.is_admin(auth.uid())
  );

-- 3. Harden join_world_room with row-level lock (FOR UPDATE) to prevent capacity race conditions
create or replace function public.join_world_room(
  p_room_id text,
  p_invite_code text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_room record;
  v_other_count integer := 0;
  v_pair_a uuid;
  v_pair_b uuid;
begin
  if v_user_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  -- 1. Lock baris room secara eksklusif agar dua pemain bersamaan tidak melebihi kapasitas
  select *
  into v_room
  from public.world_rooms
  where id = p_room_id
    and status = 'active'
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'ROOM_NOT_FOUND',
      'message', 'Room tidak ditemukan atau telah ditutup.'
    );
  end if;

  -- 2. Bersihkan membership kadaluarsa (> 90 detik tanpa heartbeat)
  delete from public.room_memberships
  where last_heartbeat_at < (now() - interval '90 seconds');

  -- 3. Validasi izin akses berdasarkan visibility sebelum memeriksa kapasitas
  if v_room.visibility = 'private' and v_room.created_by is distinct from v_user_id and not public.is_admin(v_user_id) then
    if p_invite_code is null or upper(btrim(p_invite_code)) != upper(btrim(coalesce(v_room.invite_code, ''))) then
      return jsonb_build_object(
        'ok', false,
        'code', 'INVALID_INVITE',
        'message', 'Kode undangan tidak valid untuk room privat ini.'
      );
    end if;
  elsif v_room.visibility = 'friends_only' and v_room.created_by is distinct from v_user_id and not public.is_admin(v_user_id) then
    if v_room.created_by is null then
      return jsonb_build_object(
        'ok', false,
        'code', 'NOT_FRIEND',
        'message', 'Room ini khusus teman pembuat room.'
      );
    end if;
    v_pair_a := least(v_user_id, v_room.created_by);
    v_pair_b := greatest(v_user_id, v_room.created_by);
    if not exists (select 1 from public.friendships where user_a = v_pair_a and user_b = v_pair_b) then
      return jsonb_build_object(
        'ok', false,
        'code', 'NOT_FRIEND',
        'message', 'Room ini khusus teman pembuat room.'
      );
    end if;
  end if;

  -- 4. Cek kapasitas room (hitung pemain aktif selain diri sendiri)
  select count(*)
  into v_other_count
  from public.room_memberships
  where room_id = p_room_id
    and user_id != v_user_id;

  if v_other_count >= v_room.capacity then
    return jsonb_build_object(
      'ok', false,
      'code', 'ROOM_FULL',
      'message', 'Room sudah penuh (' || v_other_count || '/' || v_room.capacity || '). Silakan pilih room lain.'
    );
  end if;

  -- 5. Kebijakan single-active-room: upsert keanggotaan pengguna ke room target
  insert into public.room_memberships (room_id, user_id, joined_at, last_heartbeat_at)
  values (p_room_id, v_user_id, now(), now())
  on conflict (user_id) do update
    set room_id = excluded.room_id,
        joined_at = case
          when room_memberships.room_id = excluded.room_id then room_memberships.joined_at
          else now()
        end,
        last_heartbeat_at = now();

  return jsonb_build_object(
    'ok', true,
    'code', 'JOINED',
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

grant execute on function public.join_world_room(text, text) to authenticated;
