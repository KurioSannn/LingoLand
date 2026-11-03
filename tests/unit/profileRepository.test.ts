import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkIsAdmin,
  fetchProfile,
  fetchPublicProfile,
  fetchUserRole,
  updateProfileSettings,
} from "../../src/lib/profileRepository";
import { supabase } from "../../src/lib/supabaseClient";

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: true,
}));

type FromReturn = ReturnType<NonNullable<typeof supabase>["from"]>;

describe("profileRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 'user' role for guest or demo user without database query", async () => {
    expect(await fetchUserRole("guest-user")).toBe("user");
    expect(await fetchUserRole("demo-user")).toBe("user");
    expect(await checkIsAdmin("guest-user")).toBe(false);
  });

  it("fetches user role from user_roles table", async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase!.from).mockReturnValue({
      select: mockSelect,
    } as unknown as FromReturn);

    const role = await fetchUserRole("real-user-id");
    expect(role).toBe("admin");
    expect(await checkIsAdmin("real-user-id")).toBe(true);
  });

  it("defaults to 'user' role when database returns no role or error", async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase!.from).mockReturnValue({
      select: mockSelect,
    } as unknown as FromReturn);

    const role = await fetchUserRole("user-without-role");
    expect(role).toBe("user");
    expect(await checkIsAdmin("user-without-role")).toBe(false);
  });

  it("updates profile settings cleanly", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase!.from).mockReturnValue({
      update: mockUpdate,
    } as unknown as FromReturn);

    const result = await updateProfileSettings("user-123", {
      displayName: "New Display Name",
      isPrivate: true,
    });

    expect(result.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: "New Display Name",
        is_private: true,
      }),
    );
  });

  it("fetches full user profile including role", async () => {
    const mockProfileSingle = vi.fn().mockResolvedValue({
      data: {
        user_id: "user-456",
        name: "Test Learner",
        username: "test_learner",
        display_name: "Learner",
        level: 2,
        xp: 150,
        coins: 2000,
        hearts: 5,
        streak_days: 2,
        is_private: false,
      },
      error: null,
    });
    const mockProfileEq = vi.fn().mockReturnValue({ maybeSingle: mockProfileSingle });
    const mockProfileSelect = vi.fn().mockReturnValue({ eq: mockProfileEq });

    vi.mocked(supabase!.from).mockReturnValue({
      select: mockProfileSelect,
    } as unknown as FromReturn);

    const profile = await fetchProfile("user-456");
    expect(profile).not.toBeNull();
    expect(profile?.username).toBe("test_learner");
    expect(profile?.displayName).toBe("Learner");
  });

  it("fetches public profile by username with case-insensitivity", async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        user_id: "u-1",
        name: "Ahmad",
        username: "ahmad",
        display_name: "Ahmad Cool",
        level: 3,
        is_private: false,
      },
      error: null,
    });
    const mockIlike = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ ilike: mockIlike });

    vi.mocked(supabase!.from).mockReturnValue({
      select: mockSelect,
    } as unknown as FromReturn);

    const publicProfile = await fetchPublicProfile("AHMAD");
    expect(publicProfile).not.toBeNull();
    expect(publicProfile?.username).toBe("ahmad");
    expect(publicProfile?.isPrivate).toBe(false);
  });
});
