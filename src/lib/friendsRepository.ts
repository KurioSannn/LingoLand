import { friends as demoFriends } from "../data/demoData";
import type { AvatarConfig } from "../types";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

export interface FriendProfile {
  id: string;
  name: string;
  username: string;
  level: number;
  customStatus: string;
  presencePrivacy: "public" | "friends_only" | "hidden";
  avatar: AvatarConfig;
  isOnline?: boolean;
}

export interface FriendRequestItem {
  id: number;
  senderId: string;
  receiverId: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  createdAt: string;
  otherUser: {
    id: string;
    name: string;
    username: string;
    level: number;
  };
}

const fallbackAvatar: AvatarConfig = {
  skinToneId: "skin-medium",
  hairId: "hair-short-black",
  topId: "top-hoodie-lavender",
  bottomId: "bottom-dark-pants",
  shoesId: "shoes-white",
  accessoryId: null,
};

export async function fetchFriends(isGuest?: boolean): Promise<FriendProfile[]> {
  if (!isSupabaseConfigured || !supabase || isGuest) {
    return demoFriends.map((df) => ({
      id: df.id,
      name: df.name,
      username: df.name.toLowerCase().replace(/\s+/g, "_"),
      level: 2,
      customStatus: df.activity,
      presencePrivacy: "friends_only",
      avatar: fallbackAvatar,
      isOnline: df.online,
    }));
  }

  const { data, error } = await supabase.rpc("get_friends_list");
  if (error || !data) {
    throw new Error(`Gagal memuat daftar teman: ${error?.message || "Tidak ada respon"}`);
  }

  const list = data as Array<{
    id: string;
    name: string;
    username: string;
    level: number;
    custom_status?: string;
    presence_privacy: "public" | "friends_only" | "hidden";
    avatar?: AvatarConfig;
  }>;

  return list.map((item) => ({
    id: item.id,
    name: item.name,
    username: item.username,
    level: item.level,
    customStatus: item.custom_status || "",
    presencePrivacy: item.presence_privacy,
    avatar: item.avatar || fallbackAvatar,
    isOnline: false,
  }));
}

export async function fetchFriendRequests(isGuest?: boolean): Promise<{
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
}> {
  if (!isSupabaseConfigured || !supabase || isGuest) {
    return { incoming: [], outgoing: [] };
  }

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return { incoming: [], outgoing: [] };

  const [incomingRes, outgoingRes] = await Promise.all([
    supabase
      .from("friend_requests")
      .select("id, sender_id, receiver_id, status, created_at")
      .eq("receiver_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("friend_requests")
      .select("id, sender_id, receiver_id, status, created_at")
      .eq("sender_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  if (incomingRes.error) throw new Error(incomingRes.error.message);
  if (outgoingRes.error) throw new Error(outgoingRes.error.message);

  const relatedUserIds = Array.from(
    new Set([
      ...(incomingRes.data ?? []).map((r) => r.sender_id as string),
      ...(outgoingRes.data ?? []).map((r) => r.receiver_id as string),
    ]),
  );

  const profilesMap = new Map<string, { id: string; name: string; username: string; level: number }>();

  if (relatedUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, username, level")
      .in("user_id", relatedUserIds);

    for (const p of profiles ?? []) {
      profilesMap.set(p.user_id as string, {
        id: p.user_id as string,
        name: p.name as string,
        username: p.username as string,
        level: p.level as number,
      });
    }
  }

  const incoming: FriendRequestItem[] = (incomingRes.data ?? []).map((row) => ({
    id: row.id as number,
    senderId: row.sender_id as string,
    receiverId: row.receiver_id as string,
    status: row.status as FriendRequestItem["status"],
    createdAt: row.created_at as string,
    otherUser: profilesMap.get(row.sender_id as string) || {
      id: row.sender_id as string,
      name: "Pengguna",
      username: "user",
      level: 1,
    },
  }));

  const outgoing: FriendRequestItem[] = (outgoingRes.data ?? []).map((row) => ({
    id: row.id as number,
    senderId: row.sender_id as string,
    receiverId: row.receiver_id as string,
    status: row.status as FriendRequestItem["status"],
    createdAt: row.created_at as string,
    otherUser: profilesMap.get(row.receiver_id as string) || {
      id: row.receiver_id as string,
      name: "Pengguna",
      username: "user",
      level: 1,
    },
  }));

  return { incoming, outgoing };
}

export async function sendFriendRequest(
  targetUsername: string,
  isGuest?: boolean,
): Promise<{ ok: boolean; message: string; mutual?: boolean }> {
  if (!isSupabaseConfigured || !supabase || isGuest) {
    return {
      ok: false,
      message: "Akun tamu tidak dapat mengirim pertemanan. Silakan daftar atau masuk untuk berteman dengan pemain lain.",
    };
  }

  const { data, error } = await supabase.rpc("send_friend_request", {
    p_receiver_username: targetUsername.trim(),
  });

  if (error) {
    throw new Error(`Gagal mengirim permintaan pertemanan: ${error.message}`);
  }

  const res = data as { ok: boolean; message: string; mutual?: boolean };
  return res;
}

export async function respondFriendRequest(
  requestId: number,
  action: "accept" | "reject",
  isGuest?: boolean,
): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase || isGuest) {
    return { ok: true, message: `Permintaan ${action === "accept" ? "diterima" : "ditolak"}` };
  }

  const { data, error } = await supabase.rpc("respond_friend_request", {
    p_request_id: requestId,
    p_action: action,
  });

  if (error) {
    throw new Error(`Gagal memproses permintaan pertemanan: ${error.message}`);
  }

  const res = data as { ok: boolean; message: string };
  return res;
}

export async function removeFriend(friendId: string, isGuest?: boolean): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase || isGuest) {
    return { ok: true, message: "Pertemanan dihapus." };
  }

  const { data, error } = await supabase.rpc("remove_friend", {
    p_target_user_id: friendId,
  });

  if (error) {
    throw new Error(`Gagal menghapus teman: ${error.message}`);
  }

  const res = data as { ok: boolean; message: string };
  return res;
}

export async function blockUser(userId: string, isGuest?: boolean): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase || isGuest) {
    return { ok: true, message: "Pengguna diblokir." };
  }

  const { data, error } = await supabase.rpc("block_user", {
    p_target_user_id: userId,
  });

  if (error) {
    throw new Error(`Gagal memblokir pengguna: ${error.message}`);
  }

  const res = data as { ok: boolean; message: string };
  return res;
}

export async function unblockUser(userId: string, isGuest?: boolean): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase || isGuest) {
    return { ok: true, message: "Pemblokiran dibuka." };
  }

  const { data, error } = await supabase.rpc("unblock_user", {
    p_target_user_id: userId,
  });

  if (error) {
    throw new Error(`Gagal membuka blokir pengguna: ${error.message}`);
  }

  const res = data as { ok: boolean; message: string };
  return res;
}

export async function updatePresencePrivacy(
  privacy: "public" | "friends_only" | "hidden",
  customStatus?: string,
): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: true, message: "Pengaturan privasi diperbarui." };
  }

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, message: "Pengguna belum login." };
  }

  const updates: Record<string, unknown> = {
    presence_privacy: privacy,
    updated_at: new Date().toISOString(),
  };

  if (customStatus !== undefined) {
    updates.custom_status = customStatus.trim();
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", authData.user.id);

  if (error) {
    throw new Error(`Gagal memperbarui privasi kehadiran: ${error.message}`);
  }

  return { ok: true, message: "Pengaturan privasi berhasil disimpan!" };
}
