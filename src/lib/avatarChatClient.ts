import { isSupabaseConfigured, supabase } from "./supabaseClient";

export interface AvatarChatMessage {
  role: "user" | "model";
  content: string;
}

export interface AvatarChatResult {
  ok: boolean;
  reply: string;
}

const NOT_READY_REPLY = "Fitur ngobrol AI belum aktif di prototype ini. Backend proxy-nya sudah disiapkan, tinggal menunggu Gemini API key dipasang.";

// Calls the `avatar-chat` Supabase Edge Function, which proxies to Gemini.
// The function only exists as scaffolding until GEMINI_API_KEY is deployed as
// a Supabase secret (see supabase/functions/avatar-chat/index.ts) — until
// then this always resolves to the honest "belum aktif" fallback instead of
// silently failing or pretending the chat is live.
export async function sendAvatarChatMessage(history: AvatarChatMessage[]): Promise<AvatarChatResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, reply: NOT_READY_REPLY };
  }

  try {
    const { data, error } = await supabase.functions.invoke<{ reply?: string; error?: string }>("avatar-chat", {
      body: { messages: history },
    });

    if (error || !data?.reply) {
      return { ok: false, reply: NOT_READY_REPLY };
    }

    return { ok: true, reply: data.reply };
  } catch {
    return { ok: false, reply: NOT_READY_REPLY };
  }
}
