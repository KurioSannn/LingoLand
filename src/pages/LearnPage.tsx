import { CheckCircle2, Clock, Coins, Hourglass, Lock, Play, Unlock, User } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MissionCard } from "../components/missions/MissionCard";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { learningPath, missions } from "../data/demoData";
import { useDemoStorage } from "../hooks/useDemoStorage";
import type { MissionStatus } from "../types";

type MissionFilter = "all" | "available" | "completed" | "locked";

const filters: Array<{ id: MissionFilter; label: string }> = [
  { id: "all", label: "Semua" },
  { id: "available", label: "Tersedia" },
  { id: "completed", label: "Selesai" },
  { id: "locked", label: "Terkunci" },
];

const pathMeta = {
  completed: { icon: CheckCircle2, tone: "success" as const, label: "Selesai" },
  active: { icon: Play, tone: "prototype" as const, label: "Aktif" },
  unlocked: { icon: Unlock, tone: "info" as const, label: "Terbuka" },
  locked: { icon: Lock, tone: "warning" as const, label: "Terkunci" },
  "coming-soon": { icon: Hourglass, tone: "neutral" as const, label: "Segera Hadir" },
};

function matchesFilter(status: MissionStatus, filter: MissionFilter): boolean {
  if (filter === "all") return true;
  if (filter === "available") return status === "available" || status === "active" || status === "incomplete";
  return status === filter;
}

export function LearnPage() {
  const navigate = useNavigate();
  const { missionSummaries, setActiveMission } = useDemoStorage();
  const [activeFilter, setActiveFilter] = useState<MissionFilter>("all");
  const [detailMissionId, setDetailMissionId] = useState<string | null>(null);

  const visibleSummaries = useMemo(
    () => missionSummaries.filter((summary) => matchesFilter(summary.status, activeFilter)),
    [missionSummaries, activeFilter],
  );

  const detailMission = missions.find((mission) => mission.id === detailMissionId) ?? null;

  function startMission(missionId: string) {
    setActiveMission(missionId);
    setDetailMissionId(null);
    navigate("/app/world");
  }

  return (
    <section className="page-shell">
      <header>
        <h1 className="text-3xl font-bold text-neutral-950">Pilih Misi Speaking</h1>
        <p className="mt-2 text-neutral-500">Latihan singkat dengan objective yang jelas.</p>
      </header>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter misi">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`filter-chip ${activeFilter === filter.id ? "filter-chip-active" : ""}`.trim()}
            aria-pressed={activeFilter === filter.id}
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {visibleSummaries.length > 0 ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleSummaries.map((summary) => (
            <MissionCard key={summary.mission.id} summary={summary} onOpenDetail={setDetailMissionId} />
          ))}
        </div>
      ) : (
        <Card className="mt-6 max-w-xl">
          <p className="text-neutral-500">Belum ada misi pada kategori ini.</p>
        </Card>
      )}

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-neutral-950">Learning Path</h2>
        <p className="mt-2 text-neutral-500">Jalur belajar dari dasar percakapan sampai presentasi profesional.</p>
        <ol className="mt-6 grid gap-3">
          {learningPath.map((item, index) => {
            const meta = pathMeta[item.status];
            const ItemIcon = meta.icon;
            return (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white px-4 py-3">
                <span className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-700">
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold text-neutral-950">{item.title}</span>
                </span>
                <Badge tone={meta.tone}>
                  <ItemIcon size={14} className="mr-1" aria-hidden />
                  {meta.label}
                </Badge>
              </li>
            );
          })}
        </ol>
      </div>

      <Modal isOpen={detailMission !== null} title={detailMission?.title ?? ""} onClose={() => setDetailMissionId(null)}>
        {detailMission ? (
          <div className="mt-3 flex flex-col gap-5">
            <p className="inline-flex items-center gap-1.5 text-sm text-neutral-700">
              <User size={16} aria-hidden />
              Bersama {detailMission.npcName} · {detailMission.difficulty}
            </p>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">Objective</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {detailMission.objectives.map((objective) => (
                  <li key={objective.id} className="flex items-center gap-2 text-sm text-neutral-700">
                    <Clock size={15} className="shrink-0 text-neutral-500" aria-hidden />
                    {objective.label}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">Contoh Kalimat</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {detailMission.suggestedSentences.map((sentence) => (
                  <li key={sentence} className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                    {sentence}
                  </li>
                ))}
              </ul>
            </div>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
              Reward: +{detailMission.rewardXp} XP
              <Coins size={16} className="text-coin" aria-hidden />
              +{detailMission.rewardCoins} koin
            </p>
            <Button onClick={() => startMission(detailMission.id)}>Mulai Misi</Button>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
