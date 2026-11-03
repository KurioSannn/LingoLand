import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../src/data/demoData";
import {
  clearRemoteState,
  fetchRemoteState,
  pushRemoteState,
  resolveHydratePayload,
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

  it("pushes remote state using atomic upserts without mass deleting rows", async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn();

    vi.mocked(supabase!.from).mockReturnValue({
      upsert: mockUpsert,
      delete: mockDelete,
    } as unknown as FromReturn);

    const state = {
      ...createInitialState(true),
      completedLessonIds: ["lesson-intro"],
    };

    await pushRemoteState("user-abc", state);

    // Verify .upsert was called for all domain entities
    expect(mockUpsert).toHaveBeenCalled();
    // Verify no mass wipe (.delete) occurred during push
    expect(mockDelete).not.toHaveBeenCalled();
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

  it("clears all user tables during clearRemoteState", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase!.from).mockReturnValue({
      delete: mockDelete,
    } as unknown as FromReturn);

    await clearRemoteState("user-reset");
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-reset");
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
