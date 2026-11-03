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
create policy "moderation_reports_insert_auth" on public.moderation_reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists "moderation_reports_select_reporter_or_admin" on public.moderation_reports;
create policy "moderation_reports_select_reporter_or_admin" on public.moderation_reports
  for select using (auth.uid() = reporter_id or public.is_admin(auth.uid()));

drop policy if exists "moderation_reports_update_admin" on public.moderation_reports;
create policy "moderation_reports_update_admin" on public.moderation_reports
  for update using (public.is_admin(auth.uid()));

-- User Mutes RLS
drop policy if exists "user_mutes_select_own" on public.user_mutes;
create policy "user_mutes_select_own" on public.user_mutes
  for select using (auth.uid() = muter_id);

drop policy if exists "user_mutes_insert_own" on public.user_mutes;
create policy "user_mutes_insert_own" on public.user_mutes
  for insert with check (auth.uid() = muter_id);

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
