import {
  BookOpen,
  Check,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import type { PracticeInvite, PracticeSession } from "../../lib/chatRepository";
import { Button } from "../ui/Button";

interface DuoPracticeBannerProps {
  activePractice: PracticeSession | null;
  pendingInvite: PracticeInvite | null;
  onAcceptInvite: (invite: PracticeInvite) => void;
  onDeclineInvite: (invite: PracticeInvite) => void;
  onSendPracticePrompt: (prompt: string) => void;
  onEndPractice: () => void;
}

export function DuoPracticeBanner({
  activePractice,
  pendingInvite,
  onAcceptInvite,
  onDeclineInvite,
  onSendPracticePrompt,
  onEndPractice,
}: DuoPracticeBannerProps) {
  if (!activePractice && !pendingInvite) return null;

  // Banner Undangan Masuk
  if (pendingInvite) {
    return (
      <div className="fixed top-16 left-1/2 z-40 -translate-x-1/2 w-[92%] max-w-lg rounded-2xl border border-primary-300 bg-white/95 p-4 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-top-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-neutral-900">
                Undangan Latihan Percakapan Duo!
              </h4>
              <p className="text-[11px] text-neutral-600">
                <strong>{pendingInvite.senderName}</strong> mengajakmu berlatih topik:
              </p>
              <p className="mt-0.5 text-xs font-semibold text-primary-700">
                &ldquo;{pendingInvite.topicTitle}&rdquo;
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              className="px-3 py-1.5 text-xs flex items-center gap-1"
              onClick={() => onAcceptInvite(pendingInvite)}
            >
              <Check size={14} />
              <span>Terima</span>
            </Button>
            <Button
              variant="secondary"
              className="px-3 py-1.5 text-xs flex items-center gap-1"
              onClick={() => onDeclineInvite(pendingInvite)}
            >
              <X size={14} />
              <span>Tolak</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Banner Sesi Latihan Duo Aktif
  if (activePractice) {
    return (
      <div className="fixed top-16 left-1/2 z-40 -translate-x-1/2 w-[94%] max-w-xl rounded-2xl border border-primary-400 bg-white/95 p-3.5 shadow-2xl backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm shrink-0">
              <BookOpen size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-800">
                  Sesi Latihan Aktif
                </span>
                <span className="text-xs font-semibold text-neutral-700 truncate">
                  Partner: {activePractice.partnerName}
                </span>
              </div>
              <p className="mt-1 text-xs font-bold text-neutral-900 truncate">
                Topik: {activePractice.topicTitle}
              </p>
              <p className="text-[11px] text-neutral-600 italic truncate">
                &ldquo;{activePractice.starterEn}&rdquo;
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button
              variant="primary"
              className="px-3 py-1.5 text-xs flex items-center gap-1.5"
              onClick={() => onSendPracticePrompt(activePractice.starterEn)}
              title="Kirim kalimat pembuka latihan ke chat partner"
            >
              <Send size={13} />
              <span>Kirim Prompt</span>
            </Button>
            <Button
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              onClick={onEndPractice}
            >
              Selesai
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
