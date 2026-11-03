import { lessonUnits as defaultLessonUnits } from "../data/demoData";
import type { Course, LessonExercise, LessonUnit } from "../types";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

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

export async function fetchCurriculumUnits(): Promise<LessonUnit[]> {
  if (!isSupabaseConfigured || !supabase) {
    return defaultLessonUnits;
  }

  try {
    const [unitsRes, questionsRes, optionsRes] = await Promise.all([
      supabase
        .from("curriculum_units")
        .select("*")
        .eq("status", "published")
        .order("order_index", { ascending: true }),
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
      return defaultLessonUnits;
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

    return unitsRes.data.map((u) => {
      const exercises = questionsByLessonId.get(u.id as string) ?? [];
      return {
        id: u.id as string,
        title: u.title as string,
        description: u.description ?? "",
        relatedMissionId: u.related_mission_id ?? "",
        rewardXp: 15,
        exercises: exercises.length > 0 ? exercises : (defaultLessonUnits.find((d) => d.id === u.id)?.exercises ?? []),
      };
    });
  } catch {
    return defaultLessonUnits;
  }
}

export async function fetchLessonById(unitId: string): Promise<LessonUnit | null> {
  const units = await fetchCurriculumUnits();
  return units.find((u) => u.id === unitId) ?? null;
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

  // Guest / Offline fallback grading
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
        message: "Lesson tidak ditemukan.",
        details: [],
      };
    }

    const totalQuestions = unit.exercises.length;
    let correctCount = 0;
    const details: LessonGradeDetail[] = [];

    for (const ex of unit.exercises) {
      let isCorrect = false;
      const userAns = answers[ex.id];

      if (ex.type === "multiple-choice") {
        isCorrect = userAns === ex.correctOptionId;
      } else if (ex.type === "word-order") {
        const userList = Array.isArray(userAns) ? userAns : typeof userAns === "string" ? JSON.parse(userAns) : [];
        isCorrect = JSON.stringify(userList) === JSON.stringify(ex.correctOrder);
      }

      if (isCorrect) correctCount += 1;
      details.push({ question_id: ex.id, is_correct: isCorrect });
    }

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;
    const passed = score >= 70;
    const gainedXp = passed && !alreadyCompleted ? 15 : 0;

    return {
      ok: true,
      passed,
      score,
      correctCount,
      totalQuestions,
      passThreshold: 70,
      gainedXp,
      alreadyRewarded: alreadyCompleted,
      message: passed
        ? (alreadyCompleted ? "Latihan ulang berhasil diselesaikan." : "Selamat! Kamu lulus lesson ini.")
        : "Kamu belum mencapai batas kelulusan minimum (70%). Silakan coba lagi!",
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
    message: string;
    details: LessonGradeDetail[];
  };

  return {
    ok: res.ok,
    passed: res.passed,
    score: res.score,
    correctCount: res.correct_count,
    totalQuestions: res.total_questions,
    passThreshold: res.pass_threshold,
    gainedXp: res.gained_xp,
    alreadyRewarded: res.already_rewarded,
    message: res.message,
    details: res.details ?? [],
  };
}
