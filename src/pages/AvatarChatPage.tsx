import { ArrowLeft, Send, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AvatarPreview } from "../components/three/AvatarPreview";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAvatarVoice } from "../hooks/useAvatarVoice";
import { useDemoStorage } from "../hooks/useDemoStorage";
import { sendAvatarChatMessage } from "../lib/avatarChatClient";
import type { AvatarChatMessage } from "../lib/avatarChatClient";

interface DisplayMessage {
  id: string;
  sender: "player" | "avatar";
  content: string;
}

export function AvatarChatPage() {
  const navigate = useNavigate();
  const { state } = useDemoStorage();
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: "intro",
      sender: "avatar",
      content: "Hi! I am your Lingoland avatar. Ask me anything to practice English whenever this is switched on.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const voice = useAvatarVoice();

  async function handleSend() {
    const trimmed = input.trim();
    if (trimmed.length < 2 || trimmed.length > 200 || isSending) return;

    const playerMessage: DisplayMessage = { id: crypto.randomUUID(), sender: "player", content: trimmed };
    const history: AvatarChatMessage[] = [...messages, playerMessage]
      .filter((message) => message.id !== "intro")
      .map((message) => ({ role: message.sender === "player" ? "user" : "model", content: message.content }));

    setMessages((current) => [...current, playerMessage]);
    setInput("");
    setIsSending(true);
    voice.stop();

    const result = await sendAvatarChatMessage(history);
    setMessages((current) => [...current, { id: crypto.randomUUID(), sender: "avatar", content: result.reply }]);
    setIsSending(false);
    voice.speak(result.reply);
  }

  return (
    <section className="page-shell">
      <button type="button" className="button button-ghost mb-6 px-0" onClick={() => navigate("/app/profile")}>
        <ArrowLeft size={16} aria-hidden />
        Profil
      </button>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.3fr]">
        <Card className="flex flex-col items-center gap-4 text-center">
          <div className="flex w-full items-center justify-between">
            <Badge tone="prototype">Segera Hadir</Badge>
            <button
              type="button"
              className="icon-button"
              onClick={voice.toggleEnabled}
              disabled={!voice.isSupported}
              aria-label={voice.isEnabled ? "Matikan suara avatar" : "Nyalakan suara avatar"}
              title={voice.isEnabled ? "Matikan suara avatar" : "Nyalakan suara avatar"}
            >
              {voice.isEnabled ? <Volume2 size={18} aria-hidden /> : <VolumeX size={18} aria-hidden />}
            </button>
          </div>
          <AvatarPreview avatar={state.avatar} talking={voice.isSpeaking} />
          <div>
            <h1 className="text-xl font-bold text-neutral-950">Ngobrol dengan Avatar Kamu</h1>
            <p className="mt-2 text-sm text-neutral-500">
              Latihan ngobrol bebas dalam bahasa Inggris, terpisah dari misi NPC di Mini Home.
            </p>
          </div>
          {!voice.isSupported ? (
            <p className="form-help error w-full text-left">Text-to-speech belum didukung browser ini. Balasan tetap muncul dalam bentuk teks.</p>
          ) : null}
          <div className="w-full rounded-md bg-primary-50 p-4 text-left text-sm text-primary-600">
            Fitur ini ditenagai oleh Gemini AI lewat Supabase Edge Function. Backend proxy-nya sudah disiapkan di{" "}
            <code className="rounded bg-white px-1 py-0.5 text-xs">supabase/functions/avatar-chat</code>, tinggal menunggu Gemini API key dipasang supaya beneran aktif.
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-950">Percakapan</h2>
            <p className="mt-1 text-sm text-neutral-500">Karakter lain dalam versi demo merupakan simulasi.</p>
          </div>

          <div className="flex min-h-[320px] flex-1 flex-col gap-3 overflow-y-auto rounded-md bg-neutral-50 p-4" aria-live="polite">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-md px-4 py-2.5 text-sm ${
                  message.sender === "player"
                    ? "self-end bg-primary-500 text-white"
                    : "self-start bg-white text-neutral-950"
                }`}
              >
                {message.content}
              </div>
            ))}
            {isSending ? (
              <div className="self-start rounded-md bg-white px-4 py-2.5 text-sm text-neutral-500">Avatar sedang mengetik...</div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="avatar-chat-input" className="sr-only">Tulis pesan dalam bahasa Inggris</label>
            <textarea
              id="avatar-chat-input"
              className="input min-h-11 flex-1 resize-none py-2.5"
              value={input}
              maxLength={200}
              rows={1}
              placeholder="Tulis pesan dalam bahasa Inggris..."
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button onClick={handleSend} disabled={input.trim().length < 2 || isSending} isLoading={isSending}>
              <Send size={18} aria-hidden />
              Kirim
            </Button>
          </div>
          <p className="text-xs text-neutral-500">
            <Sparkles size={12} className="mr-1 inline text-primary-500" aria-hidden />
            Ini bukan latihan misi berhak reward — untuk XP dan koin, selesaikan misi di Belajar atau Learning Path.
          </p>
        </Card>
      </div>
    </section>
  );
}
