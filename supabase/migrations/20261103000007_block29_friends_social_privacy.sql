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
create policy "friendships_select_members_or_admin" on public.friendships
  for select using (auth.uid() = user_a or auth.uid() = user_b or public.is_admin(auth.uid()));

-- Friend Requests RLS
drop policy if exists "friend_requests_select_parties_or_admin" on public.friend_requests;
create policy "friend_requests_select_parties_or_admin" on public.friend_requests
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id or public.is_admin(auth.uid()));

-- User Blocks RLS
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
