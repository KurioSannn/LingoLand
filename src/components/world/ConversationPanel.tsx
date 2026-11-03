import { Coins, Mic, Send, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { missions } from "../../data/demoData";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { claimMissionReward, verifyMissionObjective } from "../../lib/economyRepository";
import { evaluateMissionInput, npcReply } from "../../lib/game";
import { useDemo } from "../../state/DemoContext";
import type { ConversationMessage, NpcCharacter } from "../../types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export function ConversationPanel({ npc, onClose }: { npc: NpcCharacter; onClose: () => void }) {
  const { state, dispatch } = useDemo();
  const mission = missions.find((item) => item.id === npc.missionId) ?? missions[0];
  const progress = useMemo(
    () => state.missionProgress[mission.id]?.completedObjectiveIds ?? [],
    [mission.id, state.missionProgress],
  );
  const hasClaimedReward = state.claimedRewards.includes(mission.id);
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: "start",
      sender: "npc",
      content: `Hi, I am ${npc.name}. ${npc.personality}`,
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const { micStatus, startSpeechRecognition } = useSpeechRecognition(setInput);
  const [completion, setCompletion] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [lastReward, setLastReward] = useState<{ xp: number; coins: number; repeat: boolean } | null>(null);

  const completeCount = progress.length;
  const isCompleted = completeCount >= mission.objectives.length;

  const nextObjective = useMemo(() => {
    return mission.objectives.find((objective) => !progress.includes(objective.id));
  }, [mission.objectives, progress]);

  async function sendSentence(sentence: string) {
    const trimmed = sentence.trim();
    if (trimmed.length < 2 || trimmed.length > 200 || isSending) return;

    setClaimError(null);
    setIsSending(true);

    const isGuest =
      Boolean(state.isGuest) ||
      !state.isAuthenticated ||
      state.user.id === "demo-user" ||
      state.user.id === "guest-user";

    const optimisticProgress = evaluateMissionInput(mission, trimmed, progress);
    const optimisticDone = optimisticProgress.length >= mission.objectives.length;
    const reply = npcReply(npc.name, mission.id, optimisticProgress.length, optimisticDone);

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), sender: "player", content: trimmed, createdAt: Date.now() },
      { id: crypto.randomUUID(), sender: "npc", content: reply, createdAt: Date.now() },
    ]);
    setInput("");

    try {
      const verifyRes = await verifyMissionObjective({
        missionId: mission.id,
        userInput: trimmed,
        currentCompletedIds: progress,
        isGuest,
      });

      const verifiedIds = verifyRes.ok ? verifyRes.completedObjectiveIds : progress;
      const done = verifyRes.ok && verifyRes.allCompleted;

      dispatch({
        type: "UPDATE_MISSION_PROGRESS",
        missionId: mission.id,
        completedObjectiveIds: verifiedIds,
      });

      if (!verifyRes.ok && verifyRes.message) {
        setClaimError(verifyRes.message);
        return;
      }

      if (done && !completion) {
        const claimRes = await claimMissionReward({
          missionId: mission.id,
          fallbackReward: { xp: mission.rewardXp, coins: mission.rewardCoins, title: mission.title },
          isGuest,
        });

        if (!claimRes.ok && !claimRes.alreadyClaimed) {
          setClaimError(
            claimRes.message ||
              "Objektif misi selesai, namun klaim hadiah belum berhasil disimpan oleh server. Coba lagi.",
          );
          return;
        }

        const isRepeat = Boolean(hasClaimedReward || claimRes.alreadyClaimed);
        const gainedXp = isRepeat ? 0 : (claimRes.gainedXp ?? mission.rewardXp);
        const gainedCoins = isRepeat ? 0 : (claimRes.gainedCoins ?? mission.rewardCoins);

        dispatch({
          type: "CLAIM_REWARD",
          missionId: mission.id,
          xp: gainedXp,
          coins: gainedCoins,
          missionTitle: mission.title,
        });

        if (claimRes.coins !== undefined && claimRes.xp !== undefined) {
          dispatch({
            type: "SET_WALLET_BALANCES",
            coins: claimRes.coins,
            xp: claimRes.xp,
            level: claimRes.level,
          });
        }

        setLastReward({ xp: gainedXp, coins: gainedCoins, repeat: isRepeat });
        setCompletion(
          isRepeat
            ? "Latihan ulang selesai. Reward penuh sudah pernah diklaim."
            : `Misi selesai. +${gainedXp} XP dan +${gainedCoins} koin.`,
        );
        setRewardModalOpen(true);
      }
    } catch {
      setClaimError(
        "Gagal memverifikasi progres percakapan ke server. Hadiah belum disimpan, silakan coba lagi.",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <aside className="conversation-panel" aria-label={`Percakapan dengan ${npc.name}`}>
      <div className="panel-header">
        <div>
          <Badge tone="info">Latihan Percakapan</Badge>
          <h2>{npc.name}</h2>
          <p>{npc.personality}</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Tutup percakapan">
          <X size={20} />
        </button>
      </div>

      <section className="objective-box">
        <span className="eyebrow">Objective saat ini</span>
        <strong>{nextObjective?.label ?? "Semua objective selesai."}</strong>
        <p>{completeCount} dari {mission.objectives.length} selesai</p>
      </section>

      <div className="dialog-history" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={`dialog dialog-${message.sender}`}>
            {message.content}
          </div>
        ))}
        {completion ? <div className="dialog dialog-system">{completion}</div> : null}
        {claimError ? (
          <div className="dialog dialog-system text-danger-600" role="alert">
            {claimError}
          </div>
        ) : null}
      </div>

      <div className="suggestions" aria-label="Suggested sentences">
        {mission.suggestedSentences.map((sentence) => (
          <button
            key={sentence}
            type="button"
            disabled={isCompleted || isSending}
            onClick={() => sendSentence(sentence)}
          >
            {sentence}
          </button>
        ))}
      </div>

      <label className="field-label" htmlFor="conversation-input">
        Tulis jawaban dalam bahasa Inggris
      </label>
      <textarea
        id="conversation-input"
        value={input}
        maxLength={200}
        placeholder="Tulis jawaban dalam bahasa Inggris..."
        onChange={(event) => setInput(event.target.value)}
      />
      <div className="conversation-actions">
        <button className="button button-secondary" type="button" onClick={startSpeechRecognition}>
          <Mic size={18} />
          {micStatus === "listening" ? "Mendengarkan..." : "Mic"}
        </button>
        <Button
          disabled={input.trim().length < 2 || isCompleted || isSending}
          onClick={() => sendSentence(input)}
        >
          <Send size={18} />
          {isSending ? "Memeriksa..." : "Kirim"}
        </Button>
      </div>
      {micStatus === "unsupported" ? (
        <p className="form-help error">
          Speech recognition belum didukung browser ini. Gunakan input teks.
        </p>
      ) : null}
      {micStatus === "denied" ? (
        <p className="form-help error">
          Izin mikrofon ditolak. Kamu tetap dapat menjawab lewat teks.
        </p>
      ) : null}

      <Modal
        isOpen={rewardModalOpen}
        title={lastReward?.repeat ? "Latihan ulang selesai" : "Misi selesai"}
        onClose={() => setRewardModalOpen(false)}
      >
        <div className="mt-4 flex flex-col gap-4">
          <div className="reward-summary" role="status">
            <Sparkles size={24} aria-hidden />
            <div>
              <strong>{mission.title}</strong>
              <p>
                {lastReward?.repeat
                  ? "Reward penuh sudah pernah diklaim untuk misi ini."
                  : "Progress tersimpan dan reward sudah ditambahkan."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="reward-tile">
              <span>XP</span>
              <strong>+{lastReward?.xp ?? 0}</strong>
            </div>
            <div className="reward-tile">
              <span>Koin</span>
              <strong className="inline-flex items-center gap-1">
                <Coins size={18} aria-hidden />
                +{lastReward?.coins ?? 0}
              </strong>
            </div>
          </div>
          <Button onClick={() => setRewardModalOpen(false)}>Lanjutkan</Button>
        </div>
      </Modal>
    </aside>
  );
}
