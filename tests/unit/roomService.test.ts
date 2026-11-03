import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWorldRoom,
  fetchAvailableRooms,
  joinWorldRoom,
  leaveWorldRoom,
  sendRoomHeartbeat,
} from "../../src/lib/realtime/roomService";
import { supabase } from "../../src/lib/supabaseClient";

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
  isSupabaseConfigured: true,
}));

type FromReturn = ReturnType<NonNullable<typeof supabase>["from"]>;

describe("roomService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchAvailableRooms", () => {
    it("fetches active rooms and aggregates player counts", async () => {
      vi.mocked(supabase!.from).mockImplementation((table: string) => {
        if (table === "world_rooms") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: "plaza-lobby-1",
                        world_id: "social-plaza",
                        name: "Plaza Utama",
                        visibility: "public",
                        capacity: 20,
                        invite_code: null,
                        status: "active",
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          } as unknown as FromReturn;
        }

        if (table === "room_memberships") {
          return {
            select: vi.fn().mockResolvedValue({
              data: [{ room_id: "plaza-lobby-1" }, { room_id: "plaza-lobby-1" }],
              error: null,
            }),
          } as unknown as FromReturn;
        }

        return {} as unknown as FromReturn;
      });

      const rooms = await fetchAvailableRooms("social-plaza");
      expect(rooms).toHaveLength(1);
      expect(rooms[0].id).toBe("plaza-lobby-1");
      expect(rooms[0].activePlayersCount).toBe(2);
    });
  });

  describe("joinWorldRoom", () => {
    it("returns simulated local room for guest mode without RPC call", async () => {
      const result = await joinWorldRoom("plaza-lobby-1", undefined, true);
      expect(result.ok).toBe(true);
      expect(result.room?.id).toBe("plaza-lobby-1");
      expect(supabase!.rpc).not.toHaveBeenCalled();
    });

    it("invokes join_world_room RPC for remote user", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: {
          ok: true,
          message: "Berhasil bergabung ke room.",
          room: {
            id: "plaza-lobby-1",
            world_id: "social-plaza",
            name: "Plaza Utama",
            visibility: "public",
            capacity: 20,
            channel: "room:plaza-lobby-1",
          },
        },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const result = await joinWorldRoom("plaza-lobby-1", "INVITE12", false);
      expect(supabase!.rpc).toHaveBeenCalledWith("join_world_room", {
        p_room_id: "plaza-lobby-1",
        p_invite_code: "INVITE12",
      });
      expect(result.ok).toBe(true);
      expect(result.room?.channel).toBe("room:plaza-lobby-1");
    });
  });

  describe("leaveWorldRoom and sendRoomHeartbeat", () => {
    it("calls leave_world_room RPC", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: { ok: true },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      await leaveWorldRoom("plaza-lobby-1", false);
      expect(supabase!.rpc).toHaveBeenCalledWith("leave_world_room", {
        p_room_id: "plaza-lobby-1",
      });
    });

    it("calls heartbeat_world_room RPC", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: { ok: true },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      await sendRoomHeartbeat("plaza-lobby-1", false);
      expect(supabase!.rpc).toHaveBeenCalledWith("heartbeat_world_room", {
        p_room_id: "plaza-lobby-1",
      });
    });
  });

  describe("createWorldRoom", () => {
    it("invokes create_world_room RPC with params", async () => {
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({
        data: {
          ok: true,
          message: "Room berhasil dibuat.",
          room: {
            id: "room-custom-12",
            name: "Latihan Bareng",
            visibility: "private",
            capacity: 8,
            invite_code: "CODE99",
            channel: "room:room-custom-12",
          },
        },
        error: null,
      } as unknown as ReturnType<NonNullable<typeof supabase>["rpc"]>);

      const result = await createWorldRoom({
        name: "Latihan Bareng",
        visibility: "private",
        capacity: 8,
        isGuest: false,
      });

      expect(supabase!.rpc).toHaveBeenCalledWith("create_world_room", {
        p_name: "Latihan Bareng",
        p_world_id: "social-plaza",
        p_visibility: "private",
        p_capacity: 8,
      });
      expect(result.ok).toBe(true);
      expect(result.room?.invite_code).toBe("CODE99");
    });
  });
});
