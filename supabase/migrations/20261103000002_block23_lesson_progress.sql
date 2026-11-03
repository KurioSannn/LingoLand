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
create policy "lesson_progress_select_own_or_admin" on public.lesson_progress
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Users can insert/update their own lesson progress
create policy "lesson_progress_insert_own" on public.lesson_progress
  for insert with check (auth.uid() = user_id);

create policy "lesson_progress_update_own" on public.lesson_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "lesson_progress_delete_own" on public.lesson_progress
  for delete using (auth.uid() = user_id or public.is_admin(auth.uid()));
