import { isSupabaseConfigured, supabase } from "./supabaseClient";

export type ModerationReason =
  | "spam"
  | "harassment"
  | "inappropriate"
  | "hate_speech"
  | "other";

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  message: string;
  timestamp: number;
  type: "room" | "system" | "practice";
}

export interface PracticeInvite {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  targetId: string;
  topicId: string;
  topicTitle: string;
  starterEn: string;
  starterId: string;
  timestamp: number;
}

export interface PracticeSession {
  id: string;
  partnerId: string;
  partnerName: string;
  topicId: string;
  topicTitle: string;
  starterEn: string;
  starterId: string;
  prompts: string[];
  currentPromptIndex: number;
}

const LOCAL_MUTES_KEY = "lingoland_muted_user_ids";

/**
 * Validasi dan sanitasi pesan teks:
 * - Batas panjang 1-280 karakter
 * - Sanitasi karakter berbahaya / XSS
 */
export function validateChatMessage(text: string): {
  ok: boolean;
  sanitized: string;
  error?: string;
} {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { ok: false, sanitized: "", error: "Pesan tidak boleh kosong." };
  }
  if (trimmed.length > 280) {
    return {
      ok: false,
      sanitized: "",
      error: `Pesan terlalu panjang (maksimal 280 karakter, saat ini ${trimmed.length}).`,
    };
  }

  // Sanitasi XSS sederhana untuk HTML injection
  const sanitized = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  return { ok: true, sanitized };
}

/**
 * Mengirim laporan pelanggaran pemain ke server database.
 */
export async function submitModerationReport(
  reportedId: string,
  reason: ModerationReason,
  notes?: string,
  roomId?: string,
  isGuest?: boolean,
): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase || isGuest) {
    return {
      ok: true,
      message: "Laporan diterima (mode simulasi). Terima kasih telah menjaga keamanan komunitas.",
    };
  }

  const { data, error } = await supabase.rpc("submit_moderation_report", {
    p_reported_id: reportedId,
    p_reason: reason,
    p_notes: notes ?? null,
    p_room_id: roomId ?? null,
  });

  if (error) {
    throw new Error(`Gagal mengirim laporan: ${error.message}`);
  }

  const res = data as { ok: boolean; message: string };
  return res;
}

/**
 * Mendapatkan daftar user ID yang di-mute dari cache lokal & database.
 */
export async function fetchMutedUserIds(isGuest?: boolean): Promise<string[]> {
  const localRaw = localStorage.getItem(LOCAL_MUTES_KEY);
  const localList: string[] = localRaw ? (JSON.parse(localRaw) as string[]) : [];

  if (!isSupabaseConfigured || !supabase || isGuest) {
    return localList;
  }

  try {
    const { data, error } = await supabase.rpc("get_muted_user_ids");
    if (!error && data) {
      const dbList = (data as Array<{ muted_id: string }>).map((r) => r.muted_id);
      const merged = Array.from(new Set([...localList, ...dbList]));
      localStorage.setItem(LOCAL_MUTES_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch {
    // Fallback to local cache
  }

  return localList;
}

/**
 * Me-mute pemain (menyimpan ke local storage dan sinkronisasi RPC server).
 */
export async function muteUser(
  targetUserId: string,
  isGuest?: boolean,
): Promise<{ ok: boolean; message: string }> {
  const current = await fetchMutedUserIds(isGuest);
  if (!current.includes(targetUserId)) {
    const updated = [...current, targetUserId];
    localStorage.setItem(LOCAL_MUTES_KEY, JSON.stringify(updated));
  }

  if (!isSupabaseConfigured || !supabase || isGuest) {
    return { ok: true, message: "Pemain berhasil di-mute." };
  }

  try {
    const { data } = await supabase.rpc("mute_user", {
      p_target_user_id: targetUserId,
    });
    return (data as { ok: boolean; message: string }) || {
      ok: true,
      message: "Pemain berhasil di-mute.",
    };
  } catch {
    return { ok: true, message: "Pemain berhasil di-mute secara lokal." };
  }
}

/**
 * Membuka mute pemain.
 */
export async function unmuteUser(
  targetUserId: string,
  isGuest?: boolean,
): Promise<{ ok: boolean; message: string }> {
  const current = await fetchMutedUserIds(isGuest);
  const updated = current.filter((id) => id !== targetUserId);
  localStorage.setItem(LOCAL_MUTES_KEY, JSON.stringify(updated));

  if (!isSupabaseConfigured || !supabase || isGuest) {
    return { ok: true, message: "Mute pemain dibuka." };
  }

  try {
    const { data } = await supabase.rpc("unmute_user", {
      p_target_user_id: targetUserId,
    });
    return (data as { ok: boolean; message: string }) || {
      ok: true,
      message: "Mute pemain dibuka.",
    };
  } catch {
    return { ok: true, message: "Mute pemain dibuka." };
  }
}
