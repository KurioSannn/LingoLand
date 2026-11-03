import { lessonUnits as defaultLessonUnits } from "../data/demoData";
import type { Course, LessonExercise, LessonUnit } from "../types";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

function stripAnswerKeys(units: LessonUnit[]): LessonUnit[] {
  return units.map((u) => ({
    ...u,
    exercises: u.exercises.map((ex) => {
      const sanitized: LessonExercise = {
        id: ex.id,
        type: ex.type,
        prompt: ex.prompt,
      };
      if (ex.options) {
        sanitized.options = ex.options.map((o) => ({ id: o.id, label: o.label }));
      }
      if (ex.wordBank) {
        sanitized.wordBank = [...ex.wordBank];
      }
      return sanitized;
    }),
  }));
}

export async function fetchPublishedCourses(): Promise<Course[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [
      {
        id: "english-starter",
        slug: "english-starter",
        title: "English Starter (A1-A2)",
        language: "en",
        description: "Fondasi percakapan bahasa Inggris interaktif untuk pemula.",
        status: "published",
        sortOrder: 1,
      },
    ];
  }

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) {
    return [
      {
        id: "english-starter",
        slug: "english-starter",
        title: "English Starter (A1-A2)",
        language: "en",
        description: "Fondasi percakapan bahasa Inggris interaktif untuk pemula.",
        status: "published",
        sortOrder: 1,
      },
    ];
  }

  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    language: row.language,
    description: row.description,
    status: row.status,
    sortOrder: row.sort_order,
  }));
}

export async function fetchCurriculumUnits(options?: { isGuest?: boolean }): Promise<LessonUnit[]> {
  const isGuest = Boolean(options?.isGuest);

  if (!isSupabaseConfigured || !supabase || isGuest) {
    return defaultLessonUnits;
  }

  try {
    const safeLessonsQuery = async (): Promise<{ data?: Array<Record<string, unknown>> | null }> => {
      try {
        const tableRef = supabase?.from("curriculum_lessons");
        if (!tableRef || typeof tableRef.select !== "function") {
          return { data: [] };
        }
        return await tableRef.select("*").eq("status", "published").order("order_index", { ascending: true });
      } catch {
        return { data: [] };
      }
    };

    const [unitsRes, lessonsRes, questionsRes, optionsRes] = await Promise.all([
      supabase
        .from("curriculum_units")
        .select("*")
        .eq("status", "published")
        .order("order_index", { ascending: true }),
      safeLessonsQuery(),
      supabase
        .from("curriculum_questions")
        .select("*")
        .eq("status", "published")
        .order("order_index", { ascending: true }),
      supabase
        .from("curriculum_question_options")
        .select("*")
        .order("order_index", { ascending: true }),
    ]);

    if (unitsRes.error || !unitsRes.data || unitsRes.data.length === 0) {
      return stripAnswerKeys(defaultLessonUnits);
    }

    const optionsByQuestionId = new Map<string, Array<{ id: string; label: string }>>();
    for (const opt of optionsRes.data ?? []) {
      const qid = opt.question_id as string;
      const list = optionsByQuestionId.get(qid) ?? [];
      list.push({ id: opt.id as string, label: opt.label as string });
      optionsByQuestionId.set(qid, list);
    }

    const questionsByLessonId = new Map<string, LessonExercise[]>();
    for (const q of questionsRes.data ?? []) {
      if (q.status && q.status !== "published") continue;
      const lid = q.lesson_id as string;
      const list = questionsByLessonId.get(lid) ?? [];
      const wordBank = (q.word_bank as string[] | null) ?? [];

      const exercise: LessonExercise = {
        id: q.id as string,
        type: q.question_type as LessonExercise["type"],
        prompt: q.prompt as string,
      };

      if (exercise.type === "multiple-choice") {
        exercise.options = optionsByQuestionId.get(q.id as string) ?? [];
      } else if (exercise.type === "word-order") {
        exercise.wordBank = wordBank;
      }

      list.push(exercise);
      questionsByLessonId.set(lid, list);
    }

    const lessonsByUnitId = new Map<
      string,
      Array<{
        id: string;
        unitId: string;
        title: string;
        description: string;
        rewardXp: number;
        passThreshold: number;
      }>
    >();

    for (const l of lessonsRes?.data ?? []) {
      if (l.status && l.status !== "published") continue;
      const uid = (l.unit_id as string) || (l.id as string);
      const list = lessonsByUnitId.get(uid) ?? [];
      list.push({
        id: l.id as string,
        unitId: uid,
        title: (l.title as string) ?? "",
        description: (l.description as string) ?? "",
        rewardXp: typeof l.reward_xp === "number" ? l.reward_xp : 15,
        passThreshold: typeof l.pass_threshold === "number" ? l.pass_threshold : 70,
      });
      lessonsByUnitId.set(uid, list);
    }

    return unitsRes.data.map((u) => {
      const unitId = u.id as string;
      const unitLessons = lessonsByUnitId.get(unitId) ?? [];
      const primaryLesson = unitLessons[0];
      const lessonId = primaryLesson?.id ?? unitId;

      // Gather exercises mapped to the primary lesson ID or directly to the unit ID
      const lessonExercises =
        questionsByLessonId.get(lessonId) ??
        (lessonId !== unitId ? questionsByLessonId.get(unitId) : undefined) ??
        [];

      return {
        id: unitId,
        lessonId,
        title: (u.title as string) || primaryLesson?.title || unitId,
        description: (u.description as string) ?? primaryLesson?.description ?? "",
        relatedMissionId: (u.related_mission_id as string) ?? "",
        rewardXp: primaryLesson?.rewardXp ?? 15,
        passThreshold: primaryLesson?.passThreshold ?? 70,
        unlockPolicy:
          (u.unlock_policy as "always_unlocked" | "previous_completed" | "admin_only" | undefined) ??
          "previous_completed",
        exercises: lessonExercises,
      };
    });
  } catch {
    return stripAnswerKeys(defaultLessonUnits);
  }
}

export async function fetchLessonById(
  unitOrLessonId: string,
  options?: { isGuest?: boolean },
): Promise<LessonUnit | null> {
  const units = await fetchCurriculumUnits(options);
  return (
    units.find((u) => u.id === unitOrLessonId || u.lessonId === unitOrLessonId) ?? null
  );
}

export interface LessonGradeDetail {
  question_id: string;
  is_correct: boolean;
  explanation?: string;
}

export interface LessonGradeResult {
  ok: boolean;
  passed: boolean;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passThreshold: number;
  gainedXp: number;
  alreadyRewarded: boolean;
  currentXp?: number;
  currentLevel?: number;
  completionStatus?: "completed" | "unlocked" | "incomplete";
  lessonId?: string;
  unitId?: string;
  message: string;
  details: LessonGradeDetail[];
}

export interface SubmitLessonParams {
  lessonUnitId: string;
  answers: Record<string, string | string[]>;
  alreadyCompleted?: boolean;
  isGuest?: boolean;
}

export async function submitLessonAttempt(params: SubmitLessonParams): Promise<LessonGradeResult> {
  const { lessonUnitId, answers, alreadyCompleted = false, isGuest } = params;

  // Guest / Offline fallback grading ONLY when in Guest Mode or Supabase is not configured
  if (!isSupabaseConfigured || !supabase || isGuest) {
    const unit = defaultLessonUnits.find((u) => u.id === lessonUnitId);
    if (!unit) {
      return {
        ok: false,
        passed: false,
        score: 0,
        correctCount: 0,
        totalQuestions: 0,
        passThreshold: 70,
        gainedXp: 0,
        alreadyRewarded: false,
        completionStatus: "incomplete",
        message: "Lesson tidak ditemukan.",
        details: [],
      };
    }

    const totalQuestions = unit.exercises.length;
    if (totalQuestions === 0) {
      return {
        ok: false,
        passed: false,
        score: 0,
        correctCount: 0,
        totalQuestions: 0,
        passThreshold: unit.passThreshold ?? 70,
        gainedXp: 0,
        alreadyRewarded: false,
        completionStatus: "incomplete",
        message: "Lesson ini belum memiliki soal aktif yang dipublikasikan.",
        details: [],
      };
    }

    let correctCount = 0;
    const details: LessonGradeDetail[] = [];

    for (const ex of unit.exercises) {
      let isCorrect = false;
      const userAns = answers[ex.id];

      if (ex.type === "multiple-choice") {
        isCorrect = userAns === ex.correctOptionId;
      } else if (ex.type === "word-order") {
        let userList: string[] = [];
        if (Array.isArray(userAns)) {
          userList = userAns;
        } else if (typeof userAns === "string") {
          try {
            const parsed = JSON.parse(userAns);
            userList = Array.isArray(parsed) ? parsed : [];
          } catch {
            userList = [];
          }
        }
        isCorrect = JSON.stringify(userList) === JSON.stringify(ex.correctOrder);
      }

      if (isCorrect) correctCount += 1;
      details.push({ question_id: ex.id, is_correct: isCorrect });
    }

    const passThreshold = unit.passThreshold ?? 70;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= passThreshold;
    const gainedXp = passed && !alreadyCompleted ? (unit.rewardXp ?? 15) : 0;

    return {
      ok: true,
      passed,
      score,
      correctCount,
      totalQuestions,
      passThreshold,
      gainedXp,
      alreadyRewarded: alreadyCompleted,
      completionStatus: passed || alreadyCompleted ? "completed" : "unlocked",
      unitId: unit.id,
      lessonId: unit.lessonId ?? unit.id,
      message: passed
        ? alreadyCompleted
          ? "Latihan ulang berhasil diselesaikan."
          : "Selamat! Kamu lulus lesson ini."
        : `Kamu belum mencapai batas kelulusan minimum (${passThreshold}%). Silakan coba lagi!`,
      details,
    };
  }

  // Remote Server-Authoritative Grading via RPC
  const payloadAnswers: Record<string, string> = {};
  for (const [k, v] of Object.entries(answers)) {
    payloadAnswers[k] = Array.isArray(v) ? JSON.stringify(v) : String(v);
  }

  const { data, error } = await supabase.rpc("grade_lesson_attempt_atomic", {
    p_lesson_unit_id: lessonUnitId,
    p_answers: payloadAnswers,
  });

  if (error) {
    throw new Error(`Gagal mengevaluasi latihan: ${error.message}`);
  }

  const res = data as {
    ok: boolean;
    passed: boolean;
    score: number;
    correct_count: number;
    total_questions: number;
    pass_threshold: number;
    gained_xp: number;
    already_rewarded: boolean;
    current_xp?: number;
    current_level?: number;
    completion_status?: "completed" | "unlocked" | "incomplete";
    lesson_id?: string;
    unit_id?: string;
    message: string;
    details: LessonGradeDetail[];
  };

  return {
    ok: res.ok,
    passed: res.passed,
    score: res.score,
    correctCount: res.correct_count,
    totalQuestions: res.total_questions,
    passThreshold: res.pass_threshold ?? 70,
    gainedXp: res.gained_xp ?? 0,
    alreadyRewarded: Boolean(res.already_rewarded),
    currentXp: res.current_xp,
    currentLevel: res.current_level,
    completionStatus: res.completion_status,
    lessonId: res.lesson_id,
    unitId: res.unit_id ?? lessonUnitId,
    message: res.message,
    details: res.details ?? [],
  };
}
