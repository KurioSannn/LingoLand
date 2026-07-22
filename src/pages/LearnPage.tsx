import { Clock, Coins, GraduationCap, User } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MissionCard } from "../components/missions/MissionCard";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { missions } from "../data/demoData";
import { useDemoStorage } from "../hooks/useDemoStorage";
import type { MissionStatus } from "../types";

type MissionFilter = "all" | "available" | "completed" | "locked";

const filters: Array<{ id: MissionFilter; label: string }> = [
  { id: "all", label: "Semua" },
  { id: "available", label: "Tersedia" },
  { id: "completed", label: "Selesai" },
  { id: "locked", label: "Terkunci" },
];

function matchesFilter(status: MissionStatus, filter: MissionFilter): boolean {
  if (filter === "all") return true;
  if (filter === "available") return status === "available" || status === "active" || status === "incomplete";
  return status === filter;
}

export function LearnPage() {
  const navigate = useNavigate();
  const { missionSummaries, learningPath, setActiveMission } = useDemoStorage();
  const [activeFilter, setActiveFilter] = useState<MissionFilter>("all");
  const [detailMissionId, setDetailMissionId] = useState<string | null>(null);

  const visibleSummaries = useMemo(
    () => missionSummaries.filter((summary) => matchesFilter(summary.status, activeFilter)),
    [missionSummaries, activeFilter],
  );

  const chapters = learningPath.filter((item) => item.lessonUnitId !== null);
  const completedChapters = chapters.filter((item) => item.status === "completed").length;
  const chapterProgressPct = chapters.length > 0 ? Math.round((completedChapters / chapters.length) * 100) : 0;

  const detailMission = missions.find((mission) => mission.id === detailMissionId) ?? null;

  function startMission(missionId: string) {
    setActiveMission(missionId);
    setDetailMissionId(null);
    navigate("/app/world");
  }

  return (
    <section className="page-shell">
      <header>
        <h1 className="text-3xl font-bold text-neutral-950">Belajar</h1>
        <p className="mt-2 text-neutral-500">Kuasai kosakata di Learning Path, lalu praktikkan langsung lewat misi ngobrol bersama NPC.</p>
      </header>

      <Card className="mt-6 flex flex-col gap-6 bg-primary-500 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-white/15">
            <GraduationCap size={28} aria-hidden />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary-100">Learning Path · 3 Bab</p>
            <h2 className="mt-1 text-2xl font-bold">Latihan Soal Bahasa Inggris</h2>
            <p className="mt-2 max-w-md text-sm text-primary-50">
              Soal pilihan ganda dan susun kata ala kursus bahasa, bab demi bab — sebelum kamu praktik langsung lewat misi ngobrol bersama NPC.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="w-full sm:w-56">
            <div className="flex items-center justify-between text-xs font-semibold text-primary-100">
              <span>Progress</span>
              <span>{completedChapters} dari {chapters.length} bab selesai</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${chapterProgressPct}%` }} />
            </div>
          </div>
          <Button variant="secondary" className="w-full sm:w-auto" onClick={() => navigate("/app/lessons")}>
            Buka Learning Path
          </Button>
        </div>
      </Card>

      <h2 className="mt-12 text-2xl font-bold text-neutral-950">Misi Speaking</h2>
      <p className="mt-2 text-neutral-500">Latihan singkat dengan objective yang jelas.</p>

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
