-- ==============================================================================
-- Migration: 20261103000010_fix_lesson_reward_security.sql
-- Description: Phase 1 & Phase 4.4 Critical Security Fix — Remove legacy client-score
--              lesson completion bypass (complete_lesson_atomic) and harden
--              server-authoritative grading (grade_lesson_attempt_atomic).
-- ==============================================================================

-- 1. Revoke execution permissions and drop legacy insecure completion RPC
do $$ begin
  revoke all on function public.complete_lesson_atomic(text, integer) from public, anon, authenticated;
exception
  when undefined_function then null;
end $$;

drop function if exists public.complete_lesson_atomic(text, integer);

-- 2. Upgrade grade_lesson_attempt_atomic to be the single authoritative grading & reward path
create or replace function public.grade_lesson_attempt_atomic(
  p_lesson_unit_id text,
  p_answers jsonb
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_lesson record;
  v_unit_id text;
  v_total_questions integer := 0;
  v_correct_count integer := 0;
  v_score integer := 0;
  v_pass_threshold integer := 70;
  v_passed boolean := false;
  v_q record;
  v_raw_ans jsonb;
  v_user_ans text;
  v_expected_ans text;
  v_is_correct boolean;
  v_results jsonb := '[]'::jsonb;
  v_already_completed boolean := false;
  v_idempotency_key text;
  v_reward_xp integer := 15;
  v_gained_xp integer := 0;
  v_current_xp integer := 0;
  v_current_level integer := 1;
begin
  if v_user_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  if p_lesson_unit_id is null or btrim(p_lesson_unit_id) = '' then
    raise exception 'ID lesson tidak valid.';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) != 'object' then
    raise exception 'Format jawaban tidak valid: harus berupa objek JSON.';
  end if;

  -- 1. Cari lesson yang dipublikasikan berdasarkan lesson.id atau lesson.unit_id
  --    Pastikan unit induk juga berstatus published.
  select l.*
  into v_lesson
  from public.curriculum_lessons l
  join public.curriculum_units u on u.id = l.unit_id
  where (l.id = p_lesson_unit_id or l.unit_id = p_lesson_unit_id)
    and l.status = 'published'
    and u.status = 'published'
  order by case when l.id = p_lesson_unit_id then 0 else 1 end, l.order_index asc
  limit 1;

  if not found then
    raise exception 'Lesson tidak ditemukan atau belum dipublikasikan: %', p_lesson_unit_id;
  end if;

  v_unit_id := coalesce(v_lesson.unit_id, v_lesson.id);
  v_pass_threshold := coalesce(v_lesson.pass_threshold, 70);
  v_reward_xp := coalesce(v_lesson.reward_xp, 15);

  -- 2. Lock baris profil pengguna untuk mencegah race condition reward ganda
  select xp, level
  into v_current_xp, v_current_level
  from public.profiles
  where user_id = v_user_id
  for update;

  -- 3. Evaluasi seluruh soal published yang memiliki kunci jawaban
  for v_q in (
    select q.id, q.question_type, q.explanation, ak.validation_type, ak.expected_answer
    from public.curriculum_questions q
    join public.curriculum_question_answer_keys ak on ak.question_id = q.id
    where q.lesson_id = v_lesson.id
      and q.status = 'published'
    order by q.order_index asc, q.id asc
  ) loop
    v_total_questions := v_total_questions + 1;
    v_is_correct := false;
    v_user_ans := null;

    if p_answers ? v_q.id then
      v_raw_ans := p_answers -> v_q.id;
      if v_raw_ans is not null and jsonb_typeof(v_raw_ans) != 'null' then
        if jsonb_typeof(v_raw_ans) = 'array' then
          select string_agg(lower(btrim(elem)), ' ')
          into v_user_ans
          from jsonb_array_elements_text(v_raw_ans) as elem;
        else
          v_user_ans := trim(both '"' from (p_answers ->> v_q.id));
        end if;
      end if;
    end if;

    if v_user_ans is not null and btrim(v_user_ans) != '' then
      if v_q.validation_type = 'word-order' or v_q.question_type = 'word-order' then
        -- Normalisasi urutan kata baik dari JSON array maupun string
        v_expected_ans := regexp_replace(
          lower(btrim(replace(replace(replace(replace(v_q.expected_answer, '[', ''), ']', ''), '"', ''), ',', ' '))),
          '\s+',
          ' ',
          'g'
        );
        v_user_ans := regexp_replace(
          lower(btrim(replace(replace(replace(replace(v_user_ans, '[', ''), ']', ''), '"', ''), ',', ' '))),
          '\s+',
          ' ',
          'g'
        );
        if v_expected_ans = v_user_ans and v_expected_ans != '' then
          v_is_correct := true;
        end if;
      else
        if lower(btrim(v_q.expected_answer)) = lower(btrim(v_user_ans)) then
          v_is_correct := true;
        end if;
      end if;
    end if;

    if v_is_correct then
      v_correct_count := v_correct_count + 1;
    end if;

    v_results := v_results || jsonb_build_object(
      'question_id', v_q.id,
      'is_correct', v_is_correct,
      'explanation', v_q.explanation
    );
  end loop;

  -- 4. Guard kritis: lesson dengan 0 soal published TIDAK BOLEH lulus otomatis
  if v_total_questions = 0 then
    return jsonb_build_object(
      'ok', false,
      'passed', false,
      'score', 0,
      'correct_count', 0,
      'total_questions', 0,
      'pass_threshold', v_pass_threshold,
      'gained_xp', 0,
      'already_rewarded', false,
      'current_xp', coalesce(v_current_xp, 0),
      'current_level', coalesce(v_current_level, 1),
      'completion_status', 'incomplete',
      'lesson_id', v_lesson.id,
      'unit_id', v_unit_id,
      'details', '[]'::jsonb,
      'message', 'Lesson ini belum memiliki soal aktif yang dipublikasikan.'
    );
  end if;

  -- 5. Hitung skor persentase dan status kelulusan
  v_score := round((v_correct_count::numeric / v_total_questions::numeric) * 100);
  v_passed := (v_score >= v_pass_threshold);

  -- 6. Simpan rekam jejak attempt
  insert into public.lesson_attempts (
    user_id, lesson_id, lesson_version, score, passed, answers_snapshot, created_at
  ) values (
    v_user_id, v_lesson.id, coalesce(v_lesson.version, 1), v_score, v_passed, p_answers, now()
  );

  -- 7. Cek apakah lesson/unit ini sudah pernah diselesaikan sebelumnya
  select exists (
    select 1 from public.lesson_progress
    where user_id = v_user_id
      and lesson_unit_id in (v_unit_id, v_lesson.id)
      and status = 'completed'
  ) into v_already_completed;

  -- 8. Jika lulus, catat penyelesaian dan berikan XP maksimal satu kali per pengguna
  if v_passed then
    insert into public.lesson_progress (user_id, lesson_unit_id, status, score, completed_at, updated_at)
    values (v_user_id, v_unit_id, 'completed', v_score, now(), now())
    on conflict (user_id, lesson_unit_id) do update
      set status = 'completed',
          score = greatest(lesson_progress.score, excluded.score),
          updated_at = now();

    if not v_already_completed then
      v_idempotency_key := 'lesson:' || v_user_id || ':' || v_unit_id;
      insert into public.wallet_transactions (user_id, source_type, source_id, delta_coins, delta_xp, idempotency_key)
      values (v_user_id, 'lesson_reward', v_unit_id, 0, v_reward_xp, v_idempotency_key)
      on conflict (idempotency_key) do nothing;

      if found then
        v_gained_xp := v_reward_xp;
        update public.profiles
        set
          xp = xp + v_gained_xp,
          level = case
            when (xp + v_gained_xp) >= 1000 then 5
            when (xp + v_gained_xp) >= 600 then 4
            when (xp + v_gained_xp) >= 300 then 3
            when (xp + v_gained_xp) >= 100 then 2
            else 1
          end,
          updated_at = now()
        where user_id = v_user_id
        returning xp, level into v_current_xp, v_current_level;
      else
        v_already_completed := true;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'passed', v_passed,
    'score', v_score,
    'correct_count', v_correct_count,
    'total_questions', v_total_questions,
    'pass_threshold', v_pass_threshold,
    'gained_xp', v_gained_xp,
    'already_rewarded', v_already_completed,
    'current_xp', coalesce(v_current_xp, 0),
    'current_level', coalesce(v_current_level, 1),
    'completion_status', case
      when v_passed or v_already_completed then 'completed'
      else 'unlocked'
    end,
    'lesson_id', v_lesson.id,
    'unit_id', v_unit_id,
    'details', v_results,
    'message', case
      when v_passed and v_already_completed then 'Latihan ulang berhasil diselesaikan (XP hanya diberikan pada kelulusan pertama).'
      when v_passed then 'Selamat! Kamu lulus lesson ini.'
      else 'Kamu belum mencapai batas kelulusan minimum (' || v_pass_threshold || '%). Silakan coba lagi!'
    end
  );
end;
$$;

grant execute on function public.grade_lesson_attempt_atomic(text, jsonb) to authenticated;
