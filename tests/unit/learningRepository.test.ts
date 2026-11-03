import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchCurriculumUnits,
  fetchLessonById,
  fetchPublishedCourses,
  submitLessonAttempt,
} from "../../src/lib/learningRepository";
import { supabase } from "../../src/lib/supabaseClient";

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
  isSupabaseConfigured: true,
}));

type FromReturn = ReturnType<NonNullable<typeof supabase>["from"]>;

describe("learningRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchPublishedCourses", () => {
    it("fetches published courses ordered by sort_order", async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            id: "english-starter",
            slug: "english-starter",
            title: "English Starter",
            language: "en",
            description: "Starter Course",
            status: "published",
            sort_order: 1,
          },
        ],
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase!.from).mockReturnValue({
        select: mockSelect,
      } as unknown as FromReturn);

      const courses = await fetchPublishedCourses();
      expect(courses).toHaveLength(1);
      expect(courses[0].id).toBe("english-starter");
      expect(mockEq).toHaveBeenCalledWith("status", "published");
      expect(mockOrder).toHaveBeenCalledWith("sort_order", { ascending: true });
    });
  });

  describe("fetchCurriculumUnits", () => {
    it("fetches published units, questions, and options and shapes them into LessonUnits", async () => {
      // Mock curriculum_units, curriculum_questions, curriculum_question_options
      vi.mocked(supabase!.from).mockImplementation((table: string) => {
        if (table === "curriculum_units") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: "lesson-intro",
                      title: "Perkenalan Diri",
                      description: "Latihan perkenalan",
                      related_mission_id: "intro",
                      order_index: 1,
                      status: "published",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          } as unknown as FromReturn;
        }

        if (table === "curriculum_questions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: "intro-mc-1",
                      lesson_id: "lesson-intro",
                      question_type: "multiple-choice",
                      prompt: "Pilih cara paling tepat memperkenalkan nama.",
                      order_index: 1,
                      status: "published",
                      word_bank: [],
                    },
                    {
                      id: "intro-wo-1",
                      lesson_id: "lesson-intro",
                      question_type: "word-order",
                      prompt: "Susun kata menjadi kalimat yang benar.",
                      order_index: 2,
                      status: "published",
                      word_bank: ["playing", "I", "games", "like"],
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          } as unknown as FromReturn;
        }

        if (table === "curriculum_question_options") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  { question_id: "intro-mc-1", id: "a", label: "My name is Raka.", order_index: 1 },
                  { question_id: "intro-mc-1", id: "b", label: "Name my is Raka.", order_index: 2 },
                ],
                error: null,
              }),
            }),
          } as unknown as FromReturn;
        }

        return {} as unknown as FromReturn;
      });

      const units = await fetchCurriculumUnits();
      expect(units).toHaveLength(1);
      expect(units[0].id).toBe("lesson-intro");
      expect(units[0].exercises).toHaveLength(2);

      // Verify multiple choice question has options
      const mc = units[0].exercises[0];
      expect(mc.type).toBe("multiple-choice");
      expect(mc.options).toHaveLength(2);
      expect(mc.correctOptionId).toBeUndefined(); // Answer keys are NOT leaked!

      // Verify word order question has wordBank
      const wo = units[0].exercises[1];
      expect(wo.type).toBe("word-order");
      expect(wo.wordBank).toEqual(["playing", "I", "games", "like"]);
      expect(wo.correctOrder).toBeUndefined(); // Answer keys are NOT leaked!
    });
  });

  describe("fetchLessonById", () => {
    it("returns null when lesson unit is not found", async () => {
      vi.mocked(supabase!.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      } as unknown as FromReturn);

      const result = await fetchLessonById("non-existent-lesson");
      expect(result).toBeNull();
    });
  });

  describe("submitLessonAttempt", () => {
    it("evaluates answers locally in guest mode and passes when score >= 70%", async () => {
      const res = await submitLessonAttempt({
        lessonUnitId: "lesson-intro",
        answers: {
          "intro-mc-1": "a",
          "intro-mc-2": "b",
          "intro-wo-1": ["I", "like", "playing", "games"],
        },
        isGuest: true,
      });

      expect(res.ok).toBe(true);
      expect(res.passed).toBe(true);
      expect(res.score).toBe(100);
      expect(res.correctCount).toBe(3);
      expect(res.gainedXp).toBe(15);
      expect(supabase!.rpc).not.toHaveBeenCalled();
    });

    it("evaluates answers locally in guest mode and fails when score < 70%", async () => {
      const res = await submitLessonAttempt({
        lessonUnitId: "lesson-intro",
        answers: {
          "intro-mc-1": "c", // Wrong
          "intro-mc-2": "c", // Wrong
          "intro-wo-1": ["games", "playing"], // Wrong
        },
        isGuest: true,
      });

      expect(res.ok).toBe(true);
      expect(res.passed).toBe(false);
      expect(res.score).toBe(0);
      expect(res.gainedXp).toBe(0);
      expect(supabase!.rpc).not.toHaveBeenCalled();
    });

    it("returns zero extra XP on repeated pass in guest mode", async () => {
      const res = await submitLessonAttempt({
        lessonUnitId: "lesson-intro",
        answers: {
          "intro-mc-1": "a",
          "intro-mc-2": "b",
          "intro-wo-1": ["I", "like", "playing", "games"],
        },
        alreadyCompleted: true,
        isGuest: true,
      });

      expect(res.ok).toBe(true);
      expect(res.passed).toBe(true);
      expect(res.alreadyRewarded).toBe(true);
      expect(res.gainedXp).toBe(0);
    });

    it("invokes grade_lesson_attempt_atomic RPC for remote registered user", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: {
          ok: true,
          passed: true,
          score: 100,
          correct_count: 3,
          total_questions: 3,
          pass_threshold: 70,
          gained_xp: 15,
          already_rewarded: false,
          message: "Selamat! Kamu lulus lesson ini.",
          details: [],
        },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const res = await submitLessonAttempt({
        lessonUnitId: "lesson-intro",
        answers: {
          "intro-mc-1": "a",
          "intro-mc-2": "b",
        },
        isGuest: false,
      });

      expect(supabase!.rpc).toHaveBeenCalledWith("grade_lesson_attempt_atomic", {
        p_lesson_unit_id: "lesson-intro",
        p_answers: {
          "intro-mc-1": "a",
          "intro-mc-2": "b",
        },
      });
      expect(res.ok).toBe(true);
      expect(res.passed).toBe(true);
      expect(res.score).toBe(100);
      expect(res.gainedXp).toBe(15);
    });
  });
});
