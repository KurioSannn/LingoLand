import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buyStoreItem,
  claimMissionReward,
  completeLessonReward,
  fetchWalletTransactions,
  verifyMissionObjective,
} from "../../src/lib/economyRepository";
import { supabase } from "../../src/lib/supabaseClient";

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
  isSupabaseConfigured: true,
}));

type FromReturn = ReturnType<NonNullable<typeof supabase>["from"]>;

describe("economyRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("verifyMissionObjective", () => {
    it("evaluates mission input locally in guest mode without calling RPC", async () => {
      const res = await verifyMissionObjective({
        missionId: "intro",
        userInput: "My name is Raka.",
        currentCompletedIds: [],
        isGuest: true,
      });

      expect(res.ok).toBe(true);
      expect(res.completedObjectiveIds).toContain("name");
      expect(res.allCompleted).toBe(false);
      expect(supabase!.rpc).not.toHaveBeenCalled();
    });

    it("calls verify_mission_objective_atomic RPC for authenticated user", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: {
          ok: true,
          mission_id: "intro",
          completed_objective_ids: ["name", "origin", "interest"],
          total_objectives: 3,
          all_completed: true,
          status: "completed",
        },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const res = await verifyMissionObjective({
        missionId: "intro",
        userInput: "I like playing games.",
        currentCompletedIds: ["name", "origin"],
        isGuest: false,
      });

      expect(supabase!.rpc).toHaveBeenCalledWith("verify_mission_objective_atomic", {
        p_mission_id: "intro",
        p_user_input: "I like playing games.",
      });
      expect(res.ok).toBe(true);
      expect(res.allCompleted).toBe(true);
      expect(res.completedObjectiveIds).toEqual(["name", "origin", "interest"]);
    });
  });

  describe("claimMissionReward", () => {
    it("handles guest mode offline without invoking supabase rpc", async () => {
      const result = await claimMissionReward({
        missionId: "intro",
        fallbackReward: { xp: 50, coins: 20, title: "Perkenalan Diri" },
        isGuest: true,
      });

      expect(result.ok).toBe(true);
      expect(result.gainedCoins).toBe(20);
      expect(result.gainedXp).toBe(50);
      expect(supabase!.rpc).not.toHaveBeenCalled();
    });

    it("calls claim_mission_reward_atomic RPC for remote registered user", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: {
          ok: true,
          message: "Reward misi berhasil diklaim!",
          gained_coins: 20,
          gained_xp: 50,
          coins: 1020,
          xp: 50,
          level: 1,
        },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const result = await claimMissionReward({
        missionId: "intro",
        fallbackReward: { xp: 50, coins: 20, title: "Perkenalan Diri" },
        isGuest: false,
      });

      expect(supabase!.rpc).toHaveBeenCalledWith("claim_mission_reward_atomic", {
        p_mission_id: "intro",
      });
      expect(result.ok).toBe(true);
      expect(result.coins).toBe(1020);
      expect(result.xp).toBe(50);
      expect(result.level).toBe(1);
    });

    it("handles server duplicate claim response", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: {
          ok: false,
          message: "Reward misi ini sudah pernah diklaim sebelumnya.",
          already_claimed: true,
        },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const result = await claimMissionReward({
        missionId: "intro",
        fallbackReward: { xp: 50, coins: 20, title: "Perkenalan Diri" },
        isGuest: false,
      });

      expect(result.ok).toBe(false);
      expect(result.alreadyClaimed).toBe(true);
    });

    it("rejects claim when server reports mission objectives are incomplete", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: {
          ok: false,
          code: "MISSION_INCOMPLETE",
          message: "Seluruh objektif percakapan misi harus diselesaikan terlebih dahulu sebelum mengklaim hadiah.",
          already_claimed: false,
        },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const result = await claimMissionReward({
        missionId: "intro",
        fallbackReward: { xp: 50, coins: 20, title: "Perkenalan Diri" },
        isGuest: false,
      });

      expect(result.ok).toBe(false);
      expect(result.alreadyClaimed).toBe(false);
      expect(result.gainedCoins).toBeUndefined();
    });

    it("throws error when RPC encounters database failure", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: "Internal server error" },
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      await expect(
        claimMissionReward({
          missionId: "intro",
          fallbackReward: { xp: 50, coins: 20, title: "Perkenalan Diri" },
          isGuest: false,
        }),
      ).rejects.toThrow("Gagal mengklaim reward misi: Internal server error");
    });
  });

  describe("buyStoreItem", () => {
    it("rejects purchase when item is already owned (guest mode)", async () => {
      const result = await buyStoreItem({
        itemId: "top-varsity",
        fallbackPrice: 450,
        fallbackName: "Jaket Varsity",
        currentCoins: 1000,
        alreadyOwned: true,
        isGuest: true,
      });

      expect(result.ok).toBe(false);
      expect(result.message).toContain("sudah dimiliki");
      expect(supabase!.rpc).not.toHaveBeenCalled();
    });

    it("rejects purchase when user has insufficient coins (guest mode)", async () => {
      const result = await buyStoreItem({
        itemId: "top-varsity",
        fallbackPrice: 450,
        fallbackName: "Jaket Varsity",
        currentCoins: 100,
        alreadyOwned: false,
        isGuest: true,
      });

      expect(result.ok).toBe(false);
      expect(result.message).toContain("Koin tidak cukup");
      expect(supabase!.rpc).not.toHaveBeenCalled();
    });

    it("executes local purchase when affordable (guest mode)", async () => {
      const result = await buyStoreItem({
        itemId: "top-varsity",
        fallbackPrice: 450,
        fallbackName: "Jaket Varsity",
        currentCoins: 1000,
        alreadyOwned: false,
        isGuest: true,
      });

      expect(result.ok).toBe(true);
      expect(result.coins).toBe(550);
      expect(result.itemId).toBe("top-varsity");
      expect(supabase!.rpc).not.toHaveBeenCalled();
    });

    it("calls buy_store_item_atomic RPC for remote user", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: {
          ok: true,
          message: "Jaket Varsity berhasil dibeli!",
          item_id: "top-varsity",
          coins: 550,
        },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const result = await buyStoreItem({
        itemId: "top-varsity",
        fallbackPrice: 450,
        fallbackName: "Jaket Varsity",
        currentCoins: 1000,
        alreadyOwned: false,
        isGuest: false,
      });

      expect(supabase!.rpc).toHaveBeenCalledWith("buy_store_item_atomic", {
        p_item_id: "top-varsity",
      });
      expect(result.ok).toBe(true);
      expect(result.coins).toBe(550);
    });
  });

  describe("completeLessonReward", () => {
    it("returns zero extra XP on repeated lesson completion (guest mode)", async () => {
      const result = await completeLessonReward({
        lessonUnitId: "lesson-intro",
        fallbackReward: { xp: 15, title: "Perkenalan Diri" },
        alreadyCompleted: true,
        isGuest: true,
      });

      expect(result.ok).toBe(true);
      expect(result.alreadyRewarded).toBe(true);
      expect(result.gainedXp).toBe(0);
      expect(supabase!.rpc).not.toHaveBeenCalled();
    });

    it("blocks direct client-score completion for authenticated remote users", async () => {
      await expect(
        completeLessonReward({
          lessonUnitId: "lesson-intro",
          score: 100,
          fallbackReward: { xp: 15, title: "Perkenalan Diri" },
          alreadyCompleted: false,
          isGuest: false,
        }),
      ).rejects.toThrow(/grade_lesson_attempt_atomic/i);

      expect(supabase!.rpc).not.toHaveBeenCalled();
    });
  });

  describe("fetchWalletTransactions", () => {
    it("fetches ledger records from wallet_transactions table", async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            id: 1,
            user_id: "user-123",
            source_type: "mission_reward",
            source_id: "intro",
            delta_coins: 20,
            delta_xp: 50,
            idempotency_key: "mission:user-123:intro",
            created_at: "2026-11-03T00:00:00Z",
          },
        ],
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase!.from).mockReturnValue({
        select: mockSelect,
      } as unknown as FromReturn);

      const txs = await fetchWalletTransactions("user-123");
      expect(txs).toHaveLength(1);
      expect(txs[0].sourceType).toBe("mission_reward");
      expect(txs[0].deltaCoins).toBe(20);
      expect(txs[0].deltaXp).toBe(50);
      expect(mockEq).toHaveBeenCalledWith("user_id", "user-123");
      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    });
  });
});
