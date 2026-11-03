import { isSupabaseConfigured, supabase } from "../supabaseClient";

export interface WorldRoomSummary {
  id: string;
  worldId: string;
  name: string;
  visibility: "public" | "private" | "friends_only";
  capacity: number;
  activePlayersCount: number;
  inviteCode?: string;
  status: "active" | "closed" | "archived";
}

export interface JoinRoomResult {
  ok: boolean;
  message: string;
  room?: {
    id: string;
    worldId: string;
    name: string;
    visibility: string;
    capacity: number;
    channel: string;
    inviteCode?: string;
  };
}

export async function fetchAvailableRooms(worldId = "social-plaza"): Promise<WorldRoomSummary[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [
      {
        id: "plaza-lobby-1",
        worldId,
        name: "Plaza Utama (Lobby 1)",
        visibility: "public",
        capacity: 20,
        activePlayersCount: 1,
        status: "active",
      },
      {
        id: "plaza-lobby-2",
        worldId,
        name: "Plaza Bahasa (Lobby 2)",
        visibility: "public",
        capacity: 20,
        activePlayersCount: 0,
        status: "active",
      },
    ];
  }

  const [roomsRes, membersRes] = await Promise.all([
    supabase
      .from("world_rooms")
      .select("*")
      .eq("world_id", worldId)
      .eq("status", "active")
      .order("created_at", { ascending: true }),
    supabase.from("room_memberships").select("room_id"),
  ]);

  if (roomsRes.error) {
    throw new Error(`Gagal memuat daftar room: ${roomsRes.error.message}`);
  }

  const countMap = new Map<string, number>();
  for (const m of membersRes.data ?? []) {
    const rid = m.room_id as string;
    countMap.set(rid, (countMap.get(rid) ?? 0) + 1);
  }

  return (roomsRes.data ?? []).map((row) => ({
    id: row.id,
    worldId: row.world_id,
    name: row.name,
    visibility: row.visibility,
    capacity: row.capacity,
    activePlayersCount: countMap.get(row.id) ?? 0,
    inviteCode: row.invite_code,
    status: row.status,
  }));
}

export async function joinWorldRoom(
  roomId: string,
  inviteCode?: string,
  isGuest?: boolean,
): Promise<JoinRoomResult> {
  if (!isSupabaseConfigured || !supabase || isGuest) {
    return {
      ok: true,
      message: "Terhubung ke room (mode simulasi/tamu).",
      room: {
        id: roomId,
        worldId: "social-plaza",
        name: "Plaza Simulasi",
        visibility: "public",
        capacity: 20,
        channel: `room:${roomId}`,
      },
    };
  }

  const { data, error } = await supabase.rpc("join_world_room", {
    p_room_id: roomId,
    p_invite_code: inviteCode || null,
  });

  if (error) {
    throw new Error(`Gagal bergabung ke room: ${error.message}`);
  }

  return data as JoinRoomResult;
}

export async function leaveWorldRoom(roomId: string, isGuest?: boolean): Promise<void> {
  if (!isSupabaseConfigured || !supabase || isGuest) return;

  const { error } = await supabase.rpc("leave_world_room", {
    p_room_id: roomId,
  });

  if (error) {
    // Non-blocking error logging
    console.warn("Gagal meninggalkan room:", error.message);
  }
}

export async function sendRoomHeartbeat(roomId: string, isGuest?: boolean): Promise<void> {
  if (!isSupabaseConfigured || !supabase || isGuest) return;

  await supabase.rpc("heartbeat_world_room", {
    p_room_id: roomId,
  });
}

export async function createWorldRoom(params: {
  name: string;
  worldId?: string;
  visibility?: "public" | "private" | "friends_only";
  capacity?: number;
  isGuest?: boolean;
}): Promise<JoinRoomResult> {
  const { name, worldId = "social-plaza", visibility = "public", capacity = 15, isGuest } = params;

  if (!isSupabaseConfigured || !supabase || isGuest) {
    const customId = `room-${Math.random().toString(36).slice(2, 8)}`;
    return {
      ok: true,
      message: "Room kustom dibuat (mode simulasi).",
      room: {
        id: customId,
        worldId,
        name,
        visibility,
        capacity,
        channel: `room:${customId}`,
        inviteCode: "DEMO12",
      },
    };
  }

  const { data, error } = await supabase.rpc("create_world_room", {
    p_name: name,
    p_world_id: worldId,
    p_visibility: visibility,
    p_capacity: capacity,
  });

  if (error) {
    throw new Error(`Gagal membuat room: ${error.message}`);
  }

  return data as JoinRoomResult;
}
