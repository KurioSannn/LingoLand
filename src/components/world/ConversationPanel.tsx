import { Coins, Mic, Send, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { missions } from "../../data/demoData";
import { evaluateMissionInput, npcReply } from "../../lib/game";
import { useDemo } from "../../state/DemoContext";
import type { ConversationMessage, NpcCharacter } from "../../types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  start: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
}

export function ConversationPanel({ npc, onClose }: { npc: NpcCharacter; onClose: () => void }) {
  const { state, dispatch } = useDemo();
  const mission = missions.find((item) => item.id === npc.missionId) ?? missions[0];
  const progress = useMemo(() => state.missionProgress[mission.id]?.completedObjectiveIds ?? [], [mission.id, state.missionProgress]);
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
  const [micStatus, setMicStatus] = useState<"idle" | "listening" | "unsupported" | "denied">("idle");
  const [completion, setCompletion] = useState<string | null>(null);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [lastReward, setLastReward] = useState<{ xp: number; coins: number; repeat: boolean } | null>(null);

  const completeCount = progress.length;
  const isCompleted = completeCount >= mission.objectives.length;

  const nextObjective = useMemo(() => {
    return mission.objectives.find((objective) => !progress.includes(objective.id));
  }, [mission.objectives, progress]);

  function sendSentence(sentence: string) {
    const trimmed = sentence.trim();
    if (trimmed.length < 2 || trimmed.length > 200) return;

    const nextProgress = evaluateMissionInput(mission, trimmed, progress);
    const done = nextProgress.length >= mission.objectives.length;
    dispatch({ type: "UPDATE_MISSION_PROGRESS", missionId: mission.id, completedObjectiveIds: nextProgress });

    const reply = npcReply(npc.name, mission.id, nextProgress.length, done);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), sender: "player", content: trimmed, createdAt: Date.now() },
      { id: crypto.randomUUID(), sender: "npc", content: reply, createdAt: Date.now() },
    ]);
    setInput("");

    if (done && !completion) {
      dispatch({ type: "CLAIM_REWARD", missionId: mission.id, xp: mission.rewardXp, coins: mission.rewardCoins, missionTitle: mission.title });
      setLastReward({ xp: hasClaimedReward ? 0 : mission.rewardXp, coins: hasClaimedReward ? 0 : mission.rewardCoins, repeat: hasClaimedReward });
      setCompletion(hasClaimedReward ? "Latihan ulang selesai. Reward penuh sudah pernah diklaim." : `Misi selesai. +${mission.rewardXp} XP dan +${mission.rewardCoins} koin.`);
      setRewardModalOpen(true);
    }
  }

  function startSpeechRecognition() {
    const SpeechApi = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechApi) {
      setMicStatus("unsupported");
      return;
    }

    try {
      const recognition = new SpeechApi() as SpeechRecognitionLike;
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        setInput(event.results[0][0].transcript);
        setMicStatus("idle");
      };
      recognition.onerror = () => setMicStatus("denied");
      setMicStatus("listening");
      recognition.start();
    } catch {
      setMicStatus("denied");
    }
  }

  return (
    <aside className="conversation-panel" aria-label={`Percakapan dengan ${npc.name}`}>
      <div className="panel-header">
        <div>
          <Badge tone="prototype">Prototype Interaksi</Badge>
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
      </div>

      <div className="suggestions" aria-label="Suggested sentences">
        {mission.suggestedSentences.map((sentence) => (
          <button key={sentence} type="button" disabled={isCompleted} onClick={() => sendSentence(sentence)}>
            {sentence}
          </button>
        ))}
      </div>

      <label className="field-label" htmlFor="conversation-input">Tulis jawaban dalam bahasa Inggris</label>
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
        <Button disabled={input.trim().length < 2 || isCompleted} onClick={() => sendSentence(input)}>
          <Send size={18} />
          Kirim
        </Button>
      </div>
      {micStatus === "unsupported" ? <p className="form-help error">Speech recognition belum didukung browser ini. Gunakan input teks.</p> : null}
      {micStatus === "denied" ? <p className="form-help error">Izin mikrofon ditolak. Kamu tetap dapat menjawab lewat teks.</p> : null}

      <Modal isOpen={rewardModalOpen} title={lastReward?.repeat ? "Latihan ulang selesai" : "Misi selesai"} onClose={() => setRewardModalOpen(false)}>
        <div className="mt-4 flex flex-col gap-4">
          <div className="reward-summary" role="status">
            <Sparkles size={24} aria-hidden />
            <div>
              <strong>{mission.title}</strong>
              <p>{lastReward?.repeat ? "Reward penuh sudah pernah diklaim untuk misi ini." : "Progress tersimpan dan reward sudah ditambahkan."}</p>
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
