-- Blok 26 Migration: Server-Authoritative Grading Engine & Attempt Verification
-- Migration ID: 20261103000005_block26_server_grading_engine.sql

create or replace function public.grade_lesson_attempt_atomic(
  p_lesson_unit_id text,
  p_answers jsonb
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_lesson record;
  v_total_questions integer := 0;
  v_correct_count integer := 0;
  v_score integer := 0;
  v_passed boolean := false;
  v_q record;
  v_user_ans text;
  v_expected_ans text;
  v_is_correct boolean;
  v_results jsonb := '[]'::jsonb;
  v_already_completed boolean := false;
  v_idempotency_key text;
  v_reward_xp integer := 15;
  v_gained_xp integer := 0;
  v_new_xp integer;
  v_new_level integer;
begin
  if v_user_id is null then
    raise exception 'Akses ditolak: Pengguna harus login.';
  end if;

  -- 1. Validasi lesson
  select * into v_lesson from public.curriculum_lessons where id = p_lesson_unit_id and status = 'published';
  if not found then
    raise exception 'Lesson tidak ditemukan atau belum dipublikasikan: %', p_lesson_unit_id;
  end if;

  -- 2. Evaluasi setiap soal berdasarkan kunci jawaban server-only
  for v_q in (
    select q.id, q.question_type, q.explanation, ak.validation_type, ak.expected_answer
    from public.curriculum_questions q
    join public.curriculum_question_answer_keys ak on ak.question_id = q.id
    where q.lesson_id = p_lesson_unit_id and q.status = 'published'
    order by q.order_index
  ) loop
    v_total_questions := v_total_questions + 1;
    v_is_correct := false;

    -- Ekstrak jawaban user dari payload jsonb: { "question_id": "answer" }
    v_user_ans := trim(both '"' from (p_answers ->> v_q.id));

    if v_user_ans is not null then
      if v_q.validation_type = 'word-order' then
        -- Normalisasi token urutan kata
        v_expected_ans := replace(replace(replace(v_q.expected_answer, '[', ''), ']', ''), '"', '');
        v_user_ans := replace(replace(replace(v_user_ans, '[', ''), ']', ''), '"', '');
        if lower(trim(v_expected_ans)) = lower(trim(v_user_ans)) then
          v_is_correct := true;
        end if;
      else
        -- Multiple-choice / exact match
        if lower(trim(v_q.expected_answer)) = lower(trim(v_user_ans)) then
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

  -- 3. Hitung skor persentase
  if v_total_questions > 0 then
    v_score := round((v_correct_count::numeric / v_total_questions::numeric) * 100);
  else
    v_score := 100;
  end if;

  v_passed := (v_score >= coalesce(v_lesson.pass_threshold, 70));

  -- 4. Simpan rekam jejak attempt
  insert into public.lesson_attempts (
    user_id, lesson_id, lesson_version, score, passed, answers_snapshot, created_at
  ) values (
    v_user_id, p_lesson_unit_id, v_lesson.version, v_score, v_passed, p_answers, now()
  );

  -- 5. Jika lulus, perbarui lesson_progress dan ledger
  if v_passed then
    select exists (
      select 1 from public.lesson_progress
      where user_id = v_user_id and lesson_unit_id = p_lesson_unit_id and status = 'completed'
    ) into v_already_completed;

    insert into public.lesson_progress (user_id, lesson_unit_id, status, score, updated_at)
    values (v_user_id, p_lesson_unit_id, 'completed', v_score, now())
    on conflict (user_id, lesson_unit_id) do update
      set status = 'completed', score = greatest(lesson_progress.score, excluded.score), updated_at = now();

    -- Berikan reward XP jika baru pertama kali lulus
    if not v_already_completed then
      v_idempotency_key := 'lesson:' || v_user_id || ':' || p_lesson_unit_id;
      insert into public.wallet_transactions (user_id, source_type, source_id, delta_coins, delta_xp, idempotency_key)
      values (v_user_id, 'lesson_reward', p_lesson_unit_id, 0, v_reward_xp, v_idempotency_key)
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
        returning xp, level into v_new_xp, v_new_level;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'passed', v_passed,
    'score', v_score,
    'correct_count', v_correct_count,
    'total_questions', v_total_questions,
    'pass_threshold', coalesce(v_lesson.pass_threshold, 70),
    'gained_xp', v_gained_xp,
    'already_rewarded', v_already_completed,
    'details', v_results,
    'message', case
      when v_passed and v_already_completed then 'Latihan ulang berhasil diselesaikan.'
      when v_passed then 'Selamat! Kamu lulus lesson ini.'
      else 'Kamu belum mencapai batas kelulusan minimum (' || coalesce(v_lesson.pass_threshold, 70) || '%). Silakan coba lagi!'
    end
  );
end;
$$;
