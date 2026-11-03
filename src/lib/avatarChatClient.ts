import { isSupabaseConfigured, supabase } from "./supabaseClient";

export interface AvatarChatMessage {
  role: "user" | "model";
  content: string;
}

export interface AvatarChatResult {
  ok: boolean;
  reply: string;
}

const NOT_CONFIGURED_REPLY = "Layanan percakapan AI belum terhubung. Silakan pastikan koneksi cloud sudah aktif.";
const TRANSIENT_ERROR_REPLY = "Avatar lagi susah dihubungi (server AI sibuk atau koneksi bermasalah). Coba kirim pesan itu lagi sebentar lagi.";

// Calls the `avatar-chat` Supabase Edge Function, which proxies to Gemini.
// Two distinct honest fallbacks instead of one generic failure message: the
// feature genuinely isn't wired up yet (no Supabase / never deployed) vs. it
// IS wired up but this particular request failed (Gemini overloaded, rate
// limited, network hiccup) — the latter is worth retrying, the former isn't.
export async function sendAvatarChatMessage(history: AvatarChatMessage[]): Promise<AvatarChatResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, reply: NOT_CONFIGURED_REPLY };
  }

  try {
    const { data, error } = await supabase.functions.invoke<{ reply?: string; error?: string }>("avatar-chat", {
      body: { messages: history },
    });

    if (error || !data?.reply) {
      return { ok: false, reply: TRANSIENT_ERROR_REPLY };
    }

    return { ok: true, reply: data.reply };
  } catch {
    return { ok: false, reply: TRANSIENT_ERROR_REPLY };
  }
}
