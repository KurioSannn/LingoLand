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
