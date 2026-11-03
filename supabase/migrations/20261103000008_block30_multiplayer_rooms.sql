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
create policy "world_definitions_select_all" on public.world_definitions
  for select using (true);

-- World rooms: Public rooms visible to all authenticated users, private visible to creator/admin
create policy "world_rooms_select_accessible" on public.world_rooms
  for select using (
    visibility = 'public'
    or auth.uid() = created_by
    or public.is_admin(auth.uid())
    or exists (select 1 from public.room_memberships rm where rm.room_id = world_rooms.id and rm.user_id = auth.uid())
  );

-- Room memberships: visible to members in the same room or admin
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
