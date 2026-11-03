import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../src/data/demoData";
import {
  clearRemoteState,
  fetchRemoteState,
  pushRemoteState,
  resolveHydratePayload,
  sanitizeAvatarForInventory,
} from "../../src/lib/supabaseSync";
import { supabase } from "../../src/lib/supabaseClient";

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
  isSupabaseConfigured: true,
}));

vi.mock("../../src/lib/profileRepository", () => ({
  fetchUserRole: vi.fn().mockResolvedValue("user"),
}));

type FromReturn = ReturnType<NonNullable<typeof supabase>["from"]>;

describe("supabaseSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when profile does not exist in remote", async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase!.from).mockReturnValue({
      select: mockSelect,
    } as unknown as FromReturn);

    const result = await fetchRemoteState("empty-user");
    expect(result).toBeNull();
  });

  it("fetches and maps remote state including lesson progress", async () => {
    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  name: "Ahmad",
                  username: "ahmad",
                  level: 3,
                  xp: 450,
                  coins: 5000,
                  hearts: 5,
                  streak_days: 4,
                },
              }),
            }),
          }),
        } as unknown as FromReturn;
      }
      if (table === "avatar_configs") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  skin_tone_id: "skin-medium",
                  hair_id: "hair-short-black",
                  top_id: "top-varsity",
                  bottom_id: "bottom-dark-pants",
                  shoes_id: "shoes-white",
                  accessory_id: null,
                },
              }),
            }),
          }),
        } as unknown as FromReturn;
      }
      if (table === "lesson_progress") {
        return {
          select: () => ({
            eq: async () => ({
              data: [{ lesson_unit_id: "lesson-intro" }, { lesson_unit_id: "lesson-hobby" }],
            }),
          }),
        } as unknown as FromReturn;
      }
      return {
        select: () => ({
          eq: async () => ({ data: [] }),
        }),
      } as unknown as FromReturn;
    });

    const result = await fetchRemoteState("user-123");
    expect(result).not.toBeNull();
    expect(result?.user.name).toBe("Ahmad");
    expect(result?.user.level).toBe(3);
    expect(result?.completedLessonIds).toEqual(["lesson-intro", "lesson-hobby"]);
  });

  it("pushes ONLY profile metadata and sanitized avatar_configs without touching authoritative economy or progress tables", async () => {
    const upsertedByTable = new Map<string, unknown>();
    const mockDelete = vi.fn();

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      return {
        upsert: vi.fn().mockImplementation(async (payload: unknown) => {
          upsertedByTable.set(table, payload);
          return { error: null };
        }),
        delete: mockDelete,
      } as unknown as FromReturn;
    });

    const base = createInitialState(true);
    const tamperedState = {
      ...base,
      user: {
        ...base.user,
        name: "Budi Learner",
        username: "budi_learner",
        coins: 999999,
        xp: 999999,
        level: 5,
      },
      avatar: {
        ...base.avatar,
        topId: "top-varsity", // Not in base.inventory!
      },
      completedLessonIds: ["lesson-intro", "lesson-hobby", "lesson-weekend"],
      claimedRewards: ["intro", "hobby", "weekend"],
    };

    await pushRemoteState("user-abc", tamperedState);

    // Only profiles and avatar_configs may be written from client sync
    expect(Array.from(upsertedByTable.keys()).sort()).toEqual(["avatar_configs", "profiles"]);
    expect(upsertedByTable.has("lesson_progress")).toBe(false);
    expect(upsertedByTable.has("claimed_rewards")).toBe(false);
    expect(upsertedByTable.has("inventory_items")).toBe(false);
    expect(upsertedByTable.has("mission_progress")).toBe(false);

    // Profile payload must NOT include coins, xp, or level
    const profilePayload = upsertedByTable.get("profiles") as Record<string, unknown>;
    expect(profilePayload.name).toBe("Budi Learner");
    expect(profilePayload.username).toBe("budi_learner");
    expect(profilePayload.coins).toBeUndefined();
    expect(profilePayload.xp).toBeUndefined();
    expect(profilePayload.level).toBeUndefined();

    // Unowned avatar item (top-varsity) must be sanitized back to default owned top
    const avatarPayload = upsertedByTable.get("avatar_configs") as Record<string, unknown>;
    expect(avatarPayload.top_id).toBe("top-hoodie-lavender");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("sanitizes unowned avatar items while preserving owned store items", () => {
    const base = createInitialState(true);
    const unownedResult = sanitizeAvatarForInventory(
      { ...base.avatar, topId: "top-varsity", accessoryId: "accessory-round-glasses" },
      base.inventory,
    );
    expect(unownedResult.topId).toBe("top-hoodie-lavender");
    expect(unownedResult.accessoryId).toBeNull();

    const ownedResult = sanitizeAvatarForInventory(
      { ...base.avatar, topId: "top-varsity", accessoryId: "accessory-round-glasses" },
      [...base.inventory, "top-varsity", "accessory-round-glasses"],
    );
    expect(ownedResult.topId).toBe("top-varsity");
    expect(ownedResult.accessoryId).toBe("accessory-round-glasses");
  });

  it("propagates errors when an upsert fails during pushRemoteState", async () => {
    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          upsert: async () => ({ error: { message: "Database constraint error" } }),
        } as unknown as FromReturn;
      }
      return {
        upsert: async () => ({ error: null }),
      } as unknown as FromReturn;
    });

    const state = createInitialState(true);
    await expect(pushRemoteState("user-err", state)).rejects.toThrow(/Gagal menyimpan profil remote/i);
  });

  it("blocks destructive clearRemoteState for authenticated accounts", async () => {
    const mockDelete = vi.fn();
    vi.mocked(supabase!.from).mockReturnValue({
      delete: mockDelete,
    } as unknown as FromReturn);

    await expect(clearRemoteState("user-reset")).rejects.toThrow(/dinonaktifkan/i);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("resolves hydrate payload with completed lesson IDs", async () => {
    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  name: "Budi",
                  username: "budi",
                  level: 2,
                  xp: 150,
                  coins: 2000,
                  hearts: 5,
                  streak_days: 1,
                },
              }),
            }),
          }),
        } as unknown as FromReturn;
      }
      if (table === "avatar_configs") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        } as unknown as FromReturn;
      }
      if (table === "lesson_progress") {
        return {
          select: () => ({
            eq: async () => ({
              data: [{ lesson_unit_id: "lesson-intro" }],
            }),
          }),
        } as unknown as FromReturn;
      }
      return {
        select: () => ({
          eq: async () => ({ data: [] }),
        }),
      } as unknown as FromReturn;
    });

    const payload = await resolveHydratePayload("budi-id");
    expect(payload.userId).toBe("budi-id");
    expect(payload.user?.name).toBe("Budi");
    expect(payload.completedLessonIds).toContain("lesson-intro");
  });
});
