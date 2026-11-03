import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assignAdminUserRole,
  fetchAdminAuditLogs,
  fetchAdminQuestions,
  fetchAdminStats,
  fetchAdminUsers,
  saveAdminQuestion,
  setAdminQuestionStatus,
} from "../../src/lib/adminRepository";
import { supabase } from "../../src/lib/supabaseClient";

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
  isSupabaseConfigured: true,
}));

type FromReturn = ReturnType<NonNullable<typeof supabase>["from"]>;

describe("adminRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchAdminStats", () => {
    it("calls admin_get_system_stats RPC and maps KPIs", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: {
          courses_count: 2,
          units_count: 5,
          lessons_count: 8,
          questions_count: 24,
          learners_count: 15,
          attempts_count: 42,
        },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const stats = await fetchAdminStats();
      expect(supabase!.rpc).toHaveBeenCalledWith("admin_get_system_stats");
      expect(stats.coursesCount).toBe(2);
      expect(stats.questionsCount).toBe(24);
      expect(stats.attemptsCount).toBe(42);
    });
  });

  describe("fetchAdminQuestions", () => {
    it("fetches questions, options, and answer keys", async () => {
      vi.mocked(supabase!.from).mockImplementation((table: string) => {
        if (table === "curriculum_questions") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "q-1",
                    lesson_id: "lesson-intro",
                    question_type: "multiple-choice",
                    prompt: "Hello?",
                    explanation: "Greeting",
                    difficulty: "beginner",
                    order_index: 1,
                    status: "published",
                    version: 1,
                    word_bank: [],
                  },
                ],
                error: null,
              }),
            }),
          } as unknown as FromReturn;
        }

        if (table === "curriculum_question_options") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  { question_id: "q-1", id: "a", label: "Halo", order_index: 1 },
                  { question_id: "q-1", id: "b", label: "Hai", order_index: 2 },
                ],
                error: null,
              }),
            }),
          } as unknown as FromReturn;
        }

        if (table === "curriculum_question_answer_keys") {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { question_id: "q-1", expected_answer: "a", validation_type: "exact" },
              ],
              error: null,
            }),
          } as unknown as FromReturn;
        }

        return {} as unknown as FromReturn;
      });

      const items = await fetchAdminQuestions();
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("q-1");
      expect(items[0].options).toHaveLength(2);
      expect(items[0].answerKey).toBe("a");
    });
  });

  describe("saveAdminQuestion", () => {
    it("calls admin_save_question RPC with question payload", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: { ok: true, message: "Soal berhasil disimpan.", question_id: "q-new" },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const result = await saveAdminQuestion({
        id: "q-new",
        lessonId: "lesson-intro",
        questionType: "multiple-choice",
        prompt: "Sample Question",
        options: [{ id: "a", label: "Option A", orderIndex: 1 }],
        answerKey: "a",
      });

      expect(supabase!.rpc).toHaveBeenCalledWith("admin_save_question", expect.objectContaining({
        p_id: "q-new",
        p_prompt: "Sample Question",
        p_answer_key: "a",
      }));
      expect(result.ok).toBe(true);
      expect(result.questionId).toBe("q-new");
    });
  });

  describe("setAdminQuestionStatus", () => {
    it("calls admin_set_question_status RPC", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: { ok: true, message: "Status diubah" },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const result = await setAdminQuestionStatus("q-1", "archived");
      expect(supabase!.rpc).toHaveBeenCalledWith("admin_set_question_status", {
        p_question_id: "q-1",
        p_status: "archived",
      });
      expect(result.ok).toBe(true);
    });
  });

  describe("fetchAdminAuditLogs", () => {
    it("fetches audit logs ordered by created_at desc", async () => {
      const mockLimit = vi.fn().mockResolvedValue({
        data: [
          {
            id: 1,
            actor_id: "admin-uuid",
            action: "save_question",
            entity_type: "question",
            entity_id: "q-1",
            details: { prompt: "Test" },
            created_at: "2026-11-03T00:00:00Z",
          },
        ],
        error: null,
      });
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

      vi.mocked(supabase!.from).mockReturnValue({
        select: mockSelect,
      } as unknown as FromReturn);

      const logs = await fetchAdminAuditLogs(10);
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe("save_question");
      expect(logs[0].actorId).toBe("admin-uuid");
      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
      expect(mockLimit).toHaveBeenCalledWith(10);
    });
  });

  describe("fetchAdminUsers & assignAdminUserRole", () => {
    it("fetches users and calls assign_user_role RPC", async () => {
      vi.mocked(supabase!.from).mockImplementation((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  { user_id: "u-1", name: "Alice", username: "alice", coins: 100, xp: 50, level: 1 },
                ],
                error: null,
              }),
            }),
          } as unknown as FromReturn;
        }

        if (table === "user_roles") {
          return {
            select: vi.fn().mockResolvedValue({
              data: [{ user_id: "u-1", role: "moderator" }],
              error: null,
            }),
          } as unknown as FromReturn;
        }

        return {} as unknown as FromReturn;
      });

      const users = await fetchAdminUsers();
      expect(users).toHaveLength(1);
      expect(users[0].role).toBe("moderator");

      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: null,
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const assignRes = await assignAdminUserRole("u-1", "admin");
      expect(supabase!.rpc).toHaveBeenCalledWith("assign_user_role", {
        target_user_id: "u-1",
        target_role: "admin",
      });
      expect(assignRes.ok).toBe(true);
    });
  });
});
