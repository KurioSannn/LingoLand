-- Blok 25 Migration: Dynamic Curriculum, Question Bank, Answer Keys & Content Lifecycle
-- Migration ID: 20261103000004_block25_curriculum_question_bank.sql

-- 1. Content Status Enum
do $$ begin
  create type public.content_status as enum ('draft', 'published', 'archived');
exception
  when duplicate_object then null;
end $$;

-- 2. Question Type Enum
do $$ begin
  create type public.question_type_enum as enum ('multiple-choice', 'word-order', 'fill-blank', 'listening', 'speaking');
exception
  when duplicate_object then null;
end $$;

-- 3. Courses Table
create table if not exists public.courses (
  id text primary key,
  slug text not null unique,
  title text not null check (char_length(title) between 3 and 150),
  language text not null default 'en',
  description text,
  status public.content_status not null default 'published',
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Curriculum Units Table
create table if not exists public.curriculum_units (
  id text primary key,
  course_id text not null references public.courses (id) on delete cascade,
  slug text not null,
  title text not null check (char_length(title) between 3 and 150),
  description text,
  level_cefr text not null default 'A1' check (level_cefr in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  order_index integer not null default 1,
  unlock_policy text not null default 'previous_completed' check (unlock_policy in ('always_unlocked', 'previous_completed', 'admin_only')),
  related_mission_id text,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_curriculum_units_course on public.curriculum_units (course_id, order_index);
create index if not exists idx_curriculum_units_status on public.curriculum_units (status);

-- 5. Curriculum Lessons Table
create table if not exists public.curriculum_lessons (
  id text primary key,
  unit_id text not null references public.curriculum_units (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 150),
  description text,
  reward_xp integer not null default 15 check (reward_xp >= 0 and reward_xp <= 500),
  pass_threshold integer not null default 70 check (pass_threshold between 1 and 100),
  status public.content_status not null default 'published',
  version integer not null default 1 check (version >= 1),
  order_index integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_curriculum_lessons_unit on public.curriculum_lessons (unit_id, order_index);
create index if not exists idx_curriculum_lessons_status on public.curriculum_lessons (status);

-- 6. Curriculum Questions Table
create table if not exists public.curriculum_questions (
  id text primary key,
  lesson_id text not null references public.curriculum_lessons (id) on delete cascade,
  question_type public.question_type_enum not null,
  prompt text not null check (char_length(prompt) between 2 and 500),
  explanation text,
  difficulty text not null default 'beginner' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  order_index integer not null default 1,
  status public.content_status not null default 'published',
  version integer not null default 1 check (version >= 1),
  word_bank jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_curriculum_questions_lesson on public.curriculum_questions (lesson_id, order_index);
create index if not exists idx_curriculum_questions_status on public.curriculum_questions (status);

-- 7. Curriculum Question Options Table (Learner visible choices)
create table if not exists public.curriculum_question_options (
  id text not null,
  question_id text not null references public.curriculum_questions (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 250),
  order_index integer not null default 1,
  created_at timestamptz not null default now(),
  primary key (question_id, id)
);

create index if not exists idx_question_options_qid on public.curriculum_question_options (question_id, order_index);

-- 8. Curriculum Question Answer Keys (SERVER-ONLY / PRIVATE)
create table if not exists public.curriculum_question_answer_keys (
  question_id text primary key references public.curriculum_questions (id) on delete cascade,
  validation_type text not null default 'exact' check (validation_type in ('exact', 'word-order', 'regex', 'json')),
  expected_answer text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Lesson Attempts Table (Audit and progression history)
create table if not exists public.lesson_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null references public.curriculum_lessons (id) on delete cascade,
  lesson_version integer not null default 1,
  score integer not null check (score between 0 and 100),
  passed boolean not null default false,
  answers_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_lesson_attempts_user_lesson on public.lesson_attempts (user_id, lesson_id);

-- 10. Granular Row Level Security (RLS)
alter table public.courses enable row level security;
alter table public.curriculum_units enable row level security;
alter table public.curriculum_lessons enable row level security;
alter table public.curriculum_questions enable row level security;
alter table public.curriculum_question_options enable row level security;
alter table public.curriculum_question_answer_keys enable row level security;
alter table public.lesson_attempts enable row level security;

-- Courses: Public/Learners can view published, Admins can view all and mutate
create policy "courses_select_published_or_admin" on public.courses
  for select using (status = 'published' or public.is_admin(auth.uid()));
create policy "courses_admin_all" on public.courses
  for all using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- Units: Public/Learners can view published, Admins can view all and mutate
create policy "units_select_published_or_admin" on public.curriculum_units
  for select using (status = 'published' or public.is_admin(auth.uid()));
create policy "units_admin_all" on public.curriculum_units
  for all using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- Lessons: Public/Learners can view published, Admins can view all and mutate
create policy "lessons_select_published_or_admin" on public.curriculum_lessons
  for select using (status = 'published' or public.is_admin(auth.uid()));
create policy "lessons_admin_all" on public.curriculum_lessons
  for all using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- Questions: Public/Learners can view published, Admins can view all and mutate
create policy "questions_select_published_or_admin" on public.curriculum_questions
  for select using (status = 'published' or public.is_admin(auth.uid()));
create policy "questions_admin_all" on public.curriculum_questions
  for all using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- Question Options: Public/Learners can view options of published questions
create policy "question_options_select_published" on public.curriculum_question_options
  for select using (
    exists (
      select 1 from public.curriculum_questions q
      where q.id = curriculum_question_options.question_id
      and (q.status = 'published' or public.is_admin(auth.uid()))
    )
  );
create policy "question_options_admin_all" on public.curriculum_question_options
  for all using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- Question Answer Keys: STRICT SERVER-ONLY / ADMIN-ONLY (Learners NEVER have SELECT access!)
create policy "answer_keys_admin_and_service_only" on public.curriculum_question_answer_keys
  for all using (public.is_admin(auth.uid()) or (auth.jwt() ->> 'role' = 'service_role'));

-- Lesson Attempts: Learners can read and insert their own attempts
create policy "lesson_attempts_owner_select" on public.lesson_attempts
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "lesson_attempts_owner_insert" on public.lesson_attempts
  for insert with check (auth.uid() = user_id);

-- 11. Idempotent Seeding of Core Curriculum
insert into public.courses (id, slug, title, language, description, status, sort_order)
values (
  'english-starter',
  'english-starter',
  'English Starter (A1-A2)',
  'en',
  'Fondasi percakapan bahasa Inggris interaktif untuk pemula.',
  'published',
  1
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description;

-- Units Seeding
insert into public.curriculum_units (id, course_id, slug, title, description, level_cefr, order_index, unlock_policy, related_mission_id, status)
values
  ('lesson-intro', 'english-starter', 'perkenalan-diri', 'Perkenalan Diri', 'Latihan kosakata perkenalan sebelum ngobrol langsung dengan Bintang di Mini Home.', 'A1', 1, 'always_unlocked', 'intro', 'published'),
  ('lesson-hobby', 'english-starter', 'hobi-dan-minat', 'Hobi dan Minat', 'Latihan tanya-jawab soal hobi sebelum ngobrol dengan Lala.', 'A1', 2, 'previous_completed', 'hobby', 'published'),
  ('lesson-weekend', 'english-starter', 'rencana-akhir-pekan', 'Percakapan Sehari-hari', 'Latihan bicara soal rencana akhir pekan sebelum ngobrol dengan Benny.', 'A2', 3, 'previous_completed', 'weekend', 'published')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  order_index = excluded.order_index;

-- Lessons Seeding
insert into public.curriculum_lessons (id, unit_id, title, description, reward_xp, pass_threshold, status, version, order_index)
values
  ('lesson-intro', 'lesson-intro', 'Perkenalan Diri', 'Latihan kosakata perkenalan dasar.', 15, 70, 'published', 1, 1),
  ('lesson-hobby', 'lesson-hobby', 'Hobi dan Minat', 'Latihan tanya jawab hobi dan minat.', 15, 70, 'published', 1, 1),
  ('lesson-weekend', 'lesson-weekend', 'Rencana Akhir Pekan', 'Latihan ekspresi rencana akhir pekan.', 15, 70, 'published', 1, 1)
on conflict (id) do update set
  title = excluded.title,
  reward_xp = excluded.reward_xp;

-- Questions Seeding
-- Unit 1: Intro
insert into public.curriculum_questions (id, lesson_id, question_type, prompt, difficulty, order_index, status, word_bank)
values
  ('intro-mc-1', 'lesson-intro', 'multiple-choice', 'Pilih cara paling tepat memperkenalkan nama.', 'beginner', 1, 'published', '[]'::jsonb),
  ('intro-mc-2', 'lesson-intro', 'multiple-choice', '"I am from Surabaya" artinya...', 'beginner', 2, 'published', '[]'::jsonb),
  ('intro-wo-1', 'lesson-intro', 'word-order', 'Susun kata menjadi kalimat yang benar.', 'beginner', 3, 'published', '["playing", "I", "games", "like"]'::jsonb),

-- Unit 2: Hobby
  ('hobby-mc-1', 'lesson-hobby', 'multiple-choice', 'Cara menanyakan hobi orang lain yang tepat...', 'beginner', 1, 'published', '[]'::jsonb),
  ('hobby-wo-1', 'lesson-hobby', 'word-order', 'Susun kata menjadi kalimat yang benar.', 'beginner', 2, 'published', '["is", "drawing", "hobby", "my"]'::jsonb),
  ('hobby-mc-2', 'lesson-hobby', 'multiple-choice', 'Pertanyaan lanjutan yang sopan setelah tahu hobi seseorang...', 'beginner', 3, 'published', '[]'::jsonb),

-- Unit 3: Weekend
  ('weekend-mc-1', 'lesson-weekend', 'multiple-choice', 'Cara menanyakan rencana akhir pekan yang tepat...', 'beginner', 1, 'published', '[]'::jsonb),
  ('weekend-wo-1', 'lesson-weekend', 'word-order', 'Susun kata menjadi kalimat yang benar.', 'beginner', 2, 'published', '["visit", "family", "will", "I", "my"]'::jsonb),
  ('weekend-mc-2', 'lesson-weekend', 'multiple-choice', 'Cara menutup percakapan dengan sopan...', 'beginner', 3, 'published', '[]'::jsonb)
on conflict (id) do update set
  prompt = excluded.prompt,
  word_bank = excluded.word_bank;

-- Question Options Seeding
insert into public.curriculum_question_options (question_id, id, label, order_index)
values
  ('intro-mc-1', 'a', 'My name is Raka.', 1),
  ('intro-mc-1', 'b', 'Name my is Raka.', 2),
  ('intro-mc-1', 'c', 'Raka name is.', 3),

  ('intro-mc-2', 'a', 'Saya suka Surabaya', 1),
  ('intro-mc-2', 'b', 'Saya berasal dari Surabaya', 2),
  ('intro-mc-2', 'c', 'Saya pergi ke Surabaya', 3),

  ('hobby-mc-1', 'a', 'What do you like to do?', 1),
  ('hobby-mc-1', 'b', 'What you like do?', 2),
  ('hobby-mc-1', 'c', 'Do you what like?', 3),

  ('hobby-mc-2', 'a', 'How often do you do it?', 1),
  ('hobby-mc-2', 'b', 'How much it do you?', 2),
  ('hobby-mc-2', 'c', 'You do it how often?', 3),

  ('weekend-mc-1', 'a', 'What will you do this weekend?', 1),
  ('weekend-mc-1', 'b', 'What you will weekend do?', 2),
  ('weekend-mc-1', 'c', 'Weekend what will do you?', 3),

  ('weekend-mc-2', 'a', 'That sounds great. See you later.', 1),
  ('weekend-mc-2', 'b', 'Ok bye now.', 2),
  ('weekend-mc-2', 'c', 'Sounds great you later see.', 3)
on conflict (question_id, id) do update set
  label = excluded.label,
  order_index = excluded.order_index;

-- Server-only Answer Keys Seeding (NOT ACCESSIBLE TO LEARNERS)
insert into public.curriculum_question_answer_keys (question_id, validation_type, expected_answer)
values
  ('intro-mc-1', 'exact', 'a'),
  ('intro-mc-2', 'exact', 'b'),
  ('intro-wo-1', 'word-order', '["I", "like", "playing", "games"]'),
  ('hobby-mc-1', 'exact', 'a'),
  ('hobby-wo-1', 'word-order', '["my", "hobby", "is", "drawing"]'),
  ('hobby-mc-2', 'exact', 'a'),
  ('weekend-mc-1', 'exact', 'a'),
  ('weekend-wo-1', 'word-order', '["I", "will", "visit", "my", "family"]'),
  ('weekend-mc-2', 'exact', 'a')
on conflict (question_id) do update set
  expected_answer = excluded.expected_answer;
