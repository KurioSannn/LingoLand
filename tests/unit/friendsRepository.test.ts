import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  blockUser,
  fetchFriends,
  removeFriend,
  respondFriendRequest,
  sendFriendRequest,
  unblockUser,
  updatePresencePrivacy,
} from "../../src/lib/friendsRepository";
import { supabase } from "../../src/lib/supabaseClient";

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "current-user-uuid" } },
        error: null,
      }),
    },
  },
  isSupabaseConfigured: true,
}));

type FromReturn = ReturnType<NonNullable<typeof supabase>["from"]>;

describe("friendsRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchFriends", () => {
    it("returns simulated friends in guest mode", async () => {
      const friends = await fetchFriends(true);
      expect(friends.length).toBeGreaterThan(0);
      expect(friends[0].id).toBeDefined();
      expect(friends[0].name).toBeDefined();
      expect(supabase!.rpc).not.toHaveBeenCalled();
    });

    it("calls get_friends_list RPC for remote authenticated user", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: [
          {
            id: "friend-uuid-1",
            name: "Bintang",
            username: "bintang_lingo",
            level: 3,
            custom_status: "Belajar vocab",
            presence_privacy: "friends_only",
            avatar: {
              skinToneId: "skin-medium",
              hairId: "hair-short-black",
              topId: "top-hoodie-lavender",
              bottomId: "bottom-dark-pants",
              shoesId: "shoes-white",
              accessoryId: null,
            },
          },
        ],
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const friends = await fetchFriends(false);
      expect(supabase!.rpc).toHaveBeenCalledWith("get_friends_list");
      expect(friends).toHaveLength(1);
      expect(friends[0].id).toBe("friend-uuid-1");
      expect(friends[0].username).toBe("bintang_lingo");
    });
  });

  describe("sendFriendRequest", () => {
    it("rejects request in guest mode with friendly message", async () => {
      const result = await sendFriendRequest("bintang_lingo", true);
      expect(result.ok).toBe(false);
      expect(result.message).toContain("Akun tamu");
      expect(supabase!.rpc).not.toHaveBeenCalled();
    });

    it("invokes send_friend_request RPC for remote user", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: { ok: true, message: "Permintaan pertemanan berhasil dikirim!" },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const result = await sendFriendRequest("bintang_lingo", false);
      expect(supabase!.rpc).toHaveBeenCalledWith("send_friend_request", {
        p_receiver_username: "bintang_lingo",
      });
      expect(result.ok).toBe(true);
    });
  });

  describe("respondFriendRequest", () => {
    it("calls respond_friend_request RPC with accept action", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: { ok: true, message: "Permintaan pertemanan diterima!" },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const result = await respondFriendRequest(42, "accept", false);
      expect(supabase!.rpc).toHaveBeenCalledWith("respond_friend_request", {
        p_request_id: 42,
        p_action: "accept",
      });
      expect(result.ok).toBe(true);
    });
  });

  describe("removeFriend", () => {
    it("calls remove_friend RPC", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: { ok: true, message: "Pertemanan berhasil dihapus." },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const result = await removeFriend("friend-uuid-1", false);
      expect(supabase!.rpc).toHaveBeenCalledWith("remove_friend", {
        p_target_user_id: "friend-uuid-1",
      });
      expect(result.ok).toBe(true);
    });
  });

  describe("blockUser and unblockUser", () => {
    it("calls block_user RPC", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: { ok: true, message: "Pengguna berhasil diblokir." },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const result = await blockUser("bad-actor-uuid", false);
      expect(supabase!.rpc).toHaveBeenCalledWith("block_user", {
        p_target_user_id: "bad-actor-uuid",
      });
      expect(result.ok).toBe(true);
    });

    it("calls unblock_user RPC", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: { ok: true, message: "Pemblokiran pengguna dibuka." },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const result = await unblockUser("reformed-uuid", false);
      expect(supabase!.rpc).toHaveBeenCalledWith("unblock_user", {
        p_target_user_id: "reformed-uuid",
      });
      expect(result.ok).toBe(true);
    });
  });

  describe("updatePresencePrivacy", () => {
    it("updates presence_privacy in profiles table", async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase!.from).mockReturnValue({
        update: mockUpdate,
      } as unknown as FromReturn);

      const result = await updatePresencePrivacy("hidden", "Sedang fokus");
      expect(supabase!.from).toHaveBeenCalledWith("profiles");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          presence_privacy: "hidden",
          custom_status: "Sedang fokus",
        }),
      );
      expect(result.ok).toBe(true);
    });
  });
});
