import {
  MessageSquare,
  Minus,
  Send,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../../lib/chatRepository";

interface RoomChatOverlayProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => { ok: boolean; error?: string };
  isOpen: boolean;
  onToggle: () => void;
  currentUserId: string;
}

const QUICK_STARTERS = [
  "Hello everyone! 👋",
  "How is your day going? 😊",
  "Nice to meet you!",
  "Would you like to practice English together?",
];

export function RoomChatOverlay({
  messages,
  onSendMessage,
  isOpen,
  onToggle,
  currentUserId,
}: RoomChatOverlayProps) {
  const [inputText, setInputText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ke bawah saat ada pesan baru
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    const res = onSendMessage(inputText);
    if (!res.ok) {
      setErrorMessage(res.error || "Gagal mengirim pesan.");
      return;
    }

    setInputText("");
  }

  function handleQuickSend(starter: string) {
    setErrorMessage(null);
    const res = onSendMessage(starter);
    if (!res.ok) {
      setErrorMessage(res.error || "Gagal mengirim pesan.");
    }
  }

  return (
    <>
      {/* Floating Toggle Button (Ketika chat ditutup) */}
      {!isOpen && (
        <button
          type="button"
          onClick={onToggle}
          className="fixed bottom-6 left-6 z-30 flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2.5 text-xs font-bold text-white shadow-layer transition hover:bg-primary-700 active:scale-95"
        >
          <MessageSquare size={16} />
          <span>Obrolan Plaza</span>
          {messages.length > 0 && (
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
              {messages.length}
            </span>
          )}
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="fixed bottom-4 left-4 z-40 flex w-[calc(100vw-2rem)] max-w-sm flex-col rounded-2xl border border-neutral-200 bg-white shadow-2xl overflow-hidden transition-all duration-200 sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-bold text-neutral-900">
                Obrolan Social Plaza
              </h3>
              <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600">
                Publik
              </span>
            </div>

            <button
              type="button"
              onClick={onToggle}
              className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
              title="Tutup Obrolan"
            >
              <Minus size={16} />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex h-64 flex-col gap-2.5 overflow-y-auto p-3 text-xs">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-neutral-400">
                <MessageSquare size={24} className="stroke-1" />
                <p>Belum ada obrolan.</p>
                <p className="text-[11px]">Sapa teman lain untuk memulai latihan!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;

                if (msg.type === "system") {
                  return (
                    <div key={msg.id} className="my-1 flex justify-center">
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-medium text-neutral-600 border border-neutral-200 text-center">
                        {msg.message}
                      </span>
                    </div>
                  );
                }

                if (msg.type === "practice") {
                  return (
                    <div
                      key={msg.id}
                      className="my-1 rounded-xl border border-primary-200 bg-primary-50/80 p-2.5 text-neutral-900"
                    >
                      <div className="flex items-center gap-1 text-[10px] font-bold text-primary-700">
                        <Sparkles size={12} />
                        <span>Latihan Percakapan Duo: {msg.senderName}</span>
                      </div>
                      <p className="mt-1 font-medium">{msg.message}</p>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    {!isMe && (
                      <span className="mb-0.5 text-[10px] font-bold text-neutral-600">
                        {msg.senderName}
                      </span>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${
                        isMe
                          ? msg.status === "failed"
                            ? "bg-danger-600 text-white rounded-br-xs"
                            : "bg-primary-600 text-white rounded-br-xs"
                          : "bg-neutral-100 text-neutral-900 rounded-bl-xs"
                      }`}
                    >
                      {msg.message}
                    </div>
                    {isMe && msg.status === "pending" && (
                      <span className="mt-0.5 text-[10px] text-neutral-400">Mengirim...</span>
                    )}
                    {isMe && msg.status === "failed" && (
                      <span className="mt-0.5 text-[10px] font-semibold text-danger-600">
                        Gagal terkirim
                      </span>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starters */}
          <div className="flex gap-1.5 overflow-x-auto border-t border-neutral-100 bg-neutral-50/60 px-3 py-2 scrollbar-none">
            {QUICK_STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => handleQuickSend(starter)}
                className="shrink-0 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 hover:border-primary-400 hover:text-primary-600 active:scale-95 transition"
              >
                {starter}
              </button>
            ))}
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-amber-100 px-3 py-1 text-[11px] text-amber-800 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 border-t border-neutral-200 bg-white p-2.5"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ketik pesan (Bahasa Inggris / Indonesia)..."
              maxLength={280}
              className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:border-primary-500 focus:outline-none"
            />
            <span className="text-[10px] text-neutral-400">
              {inputText.length}/280
            </span>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-white transition hover:bg-primary-700 disabled:opacity-40"
              title="Kirim Pesan"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
