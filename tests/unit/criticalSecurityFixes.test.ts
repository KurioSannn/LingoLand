import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../src/data/demoData";
import {
  fetchCurriculumUnits,
  submitLessonAttempt,
} from "../../src/lib/learningRepository";
import { isValidMovementPayload } from "../../src/lib/realtime/protocol";
import { supabase } from "../../src/lib/supabaseClient";
import { selectLearningPath, selectLessonUnitSummaries } from "../../src/state/selectors";

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
  isSupabaseConfigured: true,
}));

type FromReturn = ReturnType<NonNullable<typeof supabase>["from"]>;

describe("Master Prompt Critical Security & Integration Regression Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Phase 1 & 4: Authoritative Lesson Grading & Dynamic Question Bank", () => {
    it("resolves dynamic units where lesson.id differs from unit.id and never leaks answer keys", async () => {
      vi.mocked(supabase!.from).mockImplementation((table: string) => {
        if (table === "curriculum_units") {
          return {
            select: () => ({
              eq: () => ({
                order: async () => ({
                  data: [
                    {
                      id: "unit-custom-travel",
                      title: "Bahasa Inggris Bandara",
                      description: "Percakapan di imigrasi dan check-in.",
                      related_mission_id: "intro",
                      unlock_policy: "always_unlocked",
                      order_index: 4,
                      status: "published",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          } as unknown as FromReturn;
        }
        if (table === "curriculum_lessons") {
          return {
            select: () => ({
              eq: () => ({
                order: async () => ({
                  data: [
                    {
                      id: "lesson-airport-101",
                      unit_id: "unit-custom-travel",
                      title: "Check-in & Boarding",
                      description: "Kosakata bandara",
                      reward_xp: 25,
                      pass_threshold: 80,
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
            select: () => ({
              eq: () => ({
                order: async () => ({
                  data: [
                    {
                      id: "q-airport-1",
                      lesson_id: "lesson-airport-101",
                      question_type: "multiple-choice",
                      prompt: "Apa arti Boarding Pass?",
                      order_index: 1,
                      status: "published",
                      word_bank: [],
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
            select: () => ({
              order: async () => ({
                data: [
                  { question_id: "q-airport-1", id: "a", label: "Kartu izin naik pesawat", order_index: 1 },
                  { question_id: "q-airport-1", id: "b", label: "Koper kabin", order_index: 2 },
                ],
                error: null,
              }),
            }),
          } as unknown as FromReturn;
        }
        return {} as unknown as FromReturn;
      });

      const units = await fetchCurriculumUnits({ isGuest: false });
      expect(units).toHaveLength(1);
      expect(units[0].id).toBe("unit-custom-travel");
      expect(units[0].lessonId).toBe("lesson-airport-101");
      expect(units[0].rewardXp).toBe(25);
      expect(units[0].passThreshold).toBe(80);
      expect(units[0].exercises).toHaveLength(1);
      expect(units[0].exercises[0].correctOptionId).toBeUndefined();
      expect(units[0].exercises[0].correctOrder).toBeUndefined();

      // Dynamic unit is surfaced in selectors and Learning Path
      const state = {
        ...createInitialState(true),
        isGuest: false,
        curriculumUnits: units,
      };
      const summaries = selectLessonUnitSummaries(state);
      expect(summaries).toHaveLength(1);
      expect(summaries[0].unit.id).toBe("unit-custom-travel");
      expect(summaries[0].status).toBe("unlocked");

      const path = selectLearningPath(state);
      expect(path.some((p) => p.lessonUnitId === "unit-custom-travel")).toBe(true);
    });

    it("does NOT inject hardcoded exercises when a remote published lesson has 0 published questions", async () => {
      vi.mocked(supabase!.from).mockImplementation((table: string) => {
        if (table === "curriculum_units") {
          return {
            select: () => ({
              eq: () => ({
                order: async () => ({
                  data: [
                    {
                      id: "lesson-intro",
                      title: "Perkenalan Diri",
                      description: "Bab 1",
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
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: [], error: null }),
            }),
            order: async () => ({ data: [], error: null }),
          }),
        } as unknown as FromReturn;
      });

      const units = await fetchCurriculumUnits({ isGuest: false });
      expect(units).toHaveLength(1);
      expect(units[0].id).toBe("lesson-intro");
      expect(units[0].exercises).toEqual([]);
    });

    it("propagates grading RPC error instead of fabricating a local pass for authenticated users", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: "network timeout" },
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      await expect(
        submitLessonAttempt({
          lessonUnitId: "lesson-intro",
          answers: { "intro-mc-1": "a" },
          isGuest: false,
        }),
      ).rejects.toThrow(/Gagal mengevaluasi latihan: network timeout/i);
    });

    it("returns authoritative currentXp, currentLevel, and completionStatus from grade_lesson_attempt_atomic", async () => {
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
          current_xp: 135,
          current_level: 2,
          completion_status: "completed",
          lesson_id: "lesson-intro",
          unit_id: "lesson-intro",
          message: "Selamat! Kamu lulus lesson ini.",
          details: [],
        },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const res = await submitLessonAttempt({
        lessonUnitId: "lesson-intro",
        answers: { "intro-mc-1": "a", "intro-mc-2": "b", "intro-wo-1": ["I", "like", "playing", "games"] },
        isGuest: false,
      });

      expect(res.ok).toBe(true);
      expect(res.passed).toBe(true);
      expect(res.gainedXp).toBe(15);
      expect(res.currentXp).toBe(135);
      expect(res.currentLevel).toBe(2);
      expect(res.completionStatus).toBe("completed");
    });
  });

  describe("Phase 3: Multiplayer Movement Payload Validation & Room Isolation", () => {
    it("rejects movement packets from a different roomId or outside world bounds", () => {
      const validPacket = {
        playerId: "user-1",
        roomId: "plaza-lobby-1",
        x: 3.5,
        z: -4.2,
        rotation: 1.2,
        animState: "walk",
        seq: 5,
        timestamp: Date.now(),
        version: 1,
      };

      expect(isValidMovementPayload(validPacket, "plaza-lobby-1")).toBe(true);
      // Mismatched roomId must be rejected
      expect(isValidMovementPayload(validPacket, "plaza-lobby-2")).toBe(false);
      // Out-of-bounds coordinates (> 50) must be rejected
      expect(isValidMovementPayload({ ...validPacket, x: 999 }, "plaza-lobby-1")).toBe(false);
      expect(isValidMovementPayload({ ...validPacket, z: -999 }, "plaza-lobby-1")).toBe(false);
      // Non-finite numbers (Infinity / NaN) must be rejected
      expect(isValidMovementPayload({ ...validPacket, x: Number.POSITIVE_INFINITY }, "plaza-lobby-1")).toBe(false);
      // Non-positive sequence numbers must be rejected
      expect(isValidMovementPayload({ ...validPacket, seq: 0 }, "plaza-lobby-1")).toBe(false);
    });
  });

  describe("Database Forward-Only Corrective Migrations Verification (000010 - 000013)", () => {
    it("verifies 20261103000010 drops complete_lesson_atomic and rejects 0-question lessons", () => {
      const sql = readFileSync(
        resolve(process.cwd(), "supabase/migrations/20261103000010_fix_lesson_reward_security.sql"),
        "utf-8",
      );
      expect(sql).toContain("drop function if exists public.complete_lesson_atomic(text, integer)");
      expect(sql).toContain("if v_total_questions = 0 then");
      expect(sql).toContain("'passed', false");
      expect(sql).toContain("'current_xp'");
      expect(sql).toContain("'current_level'");
      expect(sql).toContain("'completion_status'");
    });

    it("verifies 20261103000011 removes direct learner write policies on lesson_progress and economy tables", () => {
      const sql = readFileSync(
        resolve(process.cwd(), "supabase/migrations/20261103000011_fix_lesson_progress_permissions.sql"),
        "utf-8",
      );
      expect(sql).toContain('drop policy if exists "lesson_progress_insert_own" on public.lesson_progress');
      expect(sql).toContain('drop policy if exists "lesson_progress_update_own" on public.lesson_progress');
      expect(sql).toContain('drop policy if exists "lesson_progress_delete_own" on public.lesson_progress');
      expect(sql).toContain('drop policy if exists "claimed_rewards_owner" on public.claimed_rewards');
      expect(sql).toContain('drop policy if exists "inventory_items_owner" on public.inventory_items');
      expect(sql).toContain('drop policy if exists "mission_progress_owner" on public.mission_progress');
      expect(sql).toContain("before insert or update on public.profiles");
      expect(sql).toContain("validate_avatar_config_ownership");
    });

    it("verifies 20261103000012 eliminates recursive room_memberships RLS and locks world_rooms FOR UPDATE", () => {
      const sql = readFileSync(
        resolve(process.cwd(), "supabase/migrations/20261103000012_fix_room_membership_rls.sql"),
        "utf-8",
      );
      expect(sql).toContain("create or replace function public.get_my_active_room_id()");
      expect(sql).toContain("security definer stable set search_path = public");
      expect(sql).toContain("room_id = public.get_my_active_room_id()");
      expect(sql).toContain("for update;");
      expect(sql).toContain("'ROOM_FULL'");
    });

    it("verifies 20261103000013 enforces server-side mission objective completion before claiming rewards", () => {
      const sql = readFileSync(
        resolve(process.cwd(), "supabase/migrations/20261103000013_harden_mission_reward_validation.sql"),
        "utf-8",
      );
      expect(sql).toContain("create table if not exists public.mission_objective_definitions");
      expect(sql).toContain("create or replace function public.verify_mission_objective_atomic");
      expect(sql).toContain("'MISSION_INCOMPLETE'");
      expect(sql).toContain("if v_missing_count > 0 then");
    });
  });
});
