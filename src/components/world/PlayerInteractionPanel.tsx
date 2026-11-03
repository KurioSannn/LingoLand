import {
  AlertTriangle,
  BookOpen,
  Check,
  Send,
  UserPlus,
  UserX,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useState } from "react";
import type { RemotePlayerState } from "../../hooks/useMultiplayerRoom";
import {
  type ModerationReason,
  submitModerationReport,
} from "../../lib/chatRepository";
import { type ConversationTopic, PLAZA_TOPICS } from "../../lib/plazaWorld";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface PlayerInteractionPanelProps {
  player: RemotePlayerState;
  isOpen: boolean;
  onClose: () => void;
  onSendFriendRequest: (username: string) => Promise<unknown>;
  onSendPracticeInvite: (targetId: string, topic: ConversationTopic) => void;
  onBlockUser: (targetId: string) => Promise<unknown>;
  onMuteUser: (targetId: string) => Promise<unknown>;
  onUnmuteUser: (targetId: string) => Promise<unknown>;
  isMuted: boolean;
  roomId: string;
  isGuest?: boolean;
}

export function PlayerInteractionPanel({
  player,
  isOpen,
  onClose,
  onSendFriendRequest,
  onSendPracticeInvite,
  onBlockUser,
  onMuteUser,
  onUnmuteUser,
  isMuted,
  roomId,
  isGuest = false,
}: PlayerInteractionPanelProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "practice" | "safety">("profile");
  const [selectedTopic, setSelectedTopic] = useState<ConversationTopic>(PLAZA_TOPICS[0]);
  const [inviteSent, setInviteSent] = useState(false);

  // Moderation Report Dialog
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ModerationReason>("spam");
  const [reportNotes, setReportNotes] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  const displayName = player.presence.name || player.presence.username || "Pemain";
  const username = player.presence.username || displayName.toLowerCase().replace(/\s+/g, "_");
  const level = player.presence.level ?? 1;

  async function handleFriendClick() {
    setActionLoading(true);
    try {
      await onSendFriendRequest(username);
    } finally {
      setActionLoading(false);
    }
  }

  function handleInvitePractice() {
    onSendPracticeInvite(player.presence.playerId, selectedTopic);
    setInviteSent(true);
    setTimeout(() => {
      setInviteSent(false);
    }, 4000);
  }

  async function handleMuteToggle() {
    setActionLoading(true);
    try {
      if (isMuted) {
        await onUnmuteUser(player.presence.playerId);
      } else {
        await onMuteUser(player.presence.playerId);
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBlock() {
    if (!confirm(`Apakah Anda yakin ingin memblokir @${username}? Anda tidak akan melihat avatar atau pesannya lagi.`)) {
      return;
    }
    setActionLoading(true);
    try {
      await onBlockUser(player.presence.playerId);
      onClose();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSendReport(e: React.FormEvent) {
    e.preventDefault();
    setReportSubmitting(true);
    try {
      const res = await submitModerationReport(
        player.presence.playerId,
        reportReason,
        reportNotes,
        roomId,
        isGuest,
      );
      setReportFeedback(res.message);
      setTimeout(() => {
        setIsReportOpen(false);
        setReportFeedback(null);
        setReportNotes("");
      }, 2000);
    } catch (err) {
      setReportFeedback(err instanceof Error ? err.message : "Gagal mengirim laporan.");
    } finally {
      setReportSubmitting(false);
    }
  }

  return (
    <>
      <Modal isOpen={isOpen} title="Interaksi Pemain" onClose={onClose}>
        <div className="mt-3 space-y-4">
          {/* Header Identitas Pemain */}
          <div className="flex items-center gap-3 rounded-xl bg-neutral-50 p-4 border border-neutral-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700 shadow-sm">
              {displayName[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-bold text-neutral-900">{displayName}</h3>
                <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-bold text-neutral-700">
                  Lv.{level}
                </span>
              </div>
              <p className="truncate text-xs text-neutral-500">@{username}</p>
              <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Online di Social Plaza
              </span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-neutral-200 text-xs font-semibold">
            <button
              type="button"
              className={`flex-1 pb-2 border-b-2 transition ${
                activeTab === "profile"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
              onClick={() => setActiveTab("profile")}
            >
              Profil & Aksi
            </button>
            <button
              type="button"
              className={`flex-1 pb-2 border-b-2 transition ${
                activeTab === "practice"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
              onClick={() => setActiveTab("practice")}
            >
              Latihan Duo
            </button>
            <button
              type="button"
              className={`flex-1 pb-2 border-b-2 transition ${
                activeTab === "safety"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
              onClick={() => setActiveTab("safety")}
            >
              Keamanan & Privasi
            </button>
          </div>

          {/* TAB 1: Profil & Teman */}
          {activeTab === "profile" && (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-neutral-600 leading-relaxed">
                Tambahkan teman untuk melihat kapan mereka online di Social Plaza dan memudahkan latihan bahasa bersama.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="primary"
                  onClick={handleFriendClick}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <UserPlus size={16} />
                  <span>Kirim Permintaan Pertemanan</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setActiveTab("practice")}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <BookOpen size={16} />
                  <span>Ajak Latihan Percakapan Duo</span>
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: Latihan Percakapan Duo */}
          {activeTab === "practice" && (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-neutral-600">
                Pilih topik latihan dan kirimkan undangan ke <strong>{displayName}</strong>:
              </p>
              <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
                {PLAZA_TOPICS.map((topic) => {
                  const isSelected = selectedTopic.id === topic.id;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      className={`text-left rounded-lg border p-2.5 transition text-xs ${
                        isSelected
                          ? "border-primary-500 bg-primary-50/70"
                          : "border-neutral-200 bg-white hover:border-neutral-300"
                      }`}
                      onClick={() => setSelectedTopic(topic)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-900">{topic.title}</span>
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                          {topic.category}
                        </span>
                      </div>
                      <p className="mt-1 text-neutral-600 italic">
                        &ldquo;{topic.starterEn}&rdquo;
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  onClick={handleInvitePractice}
                  disabled={inviteSent}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {inviteSent ? (
                    <>
                      <Check size={16} className="text-emerald-300" />
                      <span>Undangan Terkirim! Menunggu Respon...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Kirim Undangan Latihan</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: Kontrol Keamanan (Mute, Block, Report) */}
          {activeTab === "safety" && (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-neutral-600">
                Lindungi kenyamanan belajar Anda dengan kontrol moderasi mandiri:
              </p>

              <div className="flex flex-col gap-2">
                {/* Mute Button */}
                <button
                  type="button"
                  onClick={handleMuteToggle}
                  disabled={actionLoading}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-50 text-left"
                >
                  <div className="flex items-center gap-2">
                    {isMuted ? (
                      <VolumeX size={16} className="text-amber-600" />
                    ) : (
                      <Volume2 size={16} className="text-neutral-500" />
                    )}
                    <div>
                      <p>{isMuted ? "Buka Mute Pemain" : "Mute Obrolan Pemain"}</p>
                      <p className="text-[11px] font-normal text-neutral-500">
                        {isMuted
                          ? "Pesan pemain ini saat ini disembunyikan."
                          : "Sembunyikan pesan chat dari pemain ini."}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-primary-600 font-bold">
                    {isMuted ? "Unmute" : "Mute"}
                  </span>
                </button>

                {/* Report Button */}
                <button
                  type="button"
                  onClick={() => setIsReportOpen(true)}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-50 text-left"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <div>
                      <p>Laporkan Pelanggaran (Report)</p>
                      <p className="text-[11px] font-normal text-neutral-500">
                        Laporkan spam, pelecehan, atau konten tidak pantas ke tim moderator.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-amber-600 font-bold">Laporkan</span>
                </button>

                {/* Block Button */}
                <button
                  type="button"
                  onClick={handleBlock}
                  disabled={actionLoading}
                  className="flex items-center justify-between rounded-lg border border-danger-200 bg-danger-50/50 p-3 text-xs font-semibold text-danger-700 transition hover:bg-danger-100/60 text-left"
                >
                  <div className="flex items-center gap-2">
                    <UserX size={16} className="text-danger-600" />
                    <div>
                      <p>Blokir Pemain Ini</p>
                      <p className="text-[11px] font-normal text-danger-600/80">
                        Blokir interaksi, chat, dan pertemanan secara permanen.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-danger-700 font-bold">Blokir</span>
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end border-t border-neutral-200 pt-3">
            <Button variant="secondary" onClick={onClose} className="px-4 py-1.5 text-xs">
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      {/* DIALOG LAPORKAN PEMAIN */}
      <Modal
        isOpen={isReportOpen}
        title={`Laporkan @${username}`}
        onClose={() => setIsReportOpen(false)}
      >
        <form onSubmit={handleSendReport} className="mt-3 space-y-3 text-xs">
          {reportFeedback ? (
            <div className="rounded-lg bg-emerald-50 p-3 text-emerald-800 font-semibold text-center">
              {reportFeedback}
            </div>
          ) : (
            <>
              <div>
                <label className="block font-bold text-neutral-800 mb-1">
                  Alasan Laporan
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as ModerationReason)}
                  className="w-full rounded-md border border-neutral-300 p-2 text-xs text-neutral-900 focus:border-primary-500 focus:outline-none"
                >
                  <option value="spam">Spam / Pesan Berulang</option>
                  <option value="harassment">Pelecehan / Perundungan</option>
                  <option value="inappropriate">Konten Tidak Pantas / Asusila</option>
                  <option value="hate_speech">Ujaran Kebencian / SARA</option>
                  <option value="other">Alasan Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-800 mb-1">
                  Keterangan Tambahan (Opsional)
                </label>
                <textarea
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Jelaskan secara singkat kronologi pelanggaran..."
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-md border border-neutral-300 p-2 text-xs text-neutral-900 focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsReportOpen(false)}
                  disabled={reportSubmitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  isLoading={reportSubmitting}
                  disabled={reportSubmitting}
                >
                  Kirim Laporan
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </>
  );
}
