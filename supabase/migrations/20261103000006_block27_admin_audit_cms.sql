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

create policy "admin_audit_logs_select_admin" on public.admin_audit_logs
  for select using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

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
