import { CheckCircle2, Clock, Coins, Lock, User } from "lucide-react";
import type { MissionSummary } from "../../state/selectors";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ProgressBar } from "../ui/ProgressBar";
import { Card } from "../ui/Card";

interface MissionCardProps {
  summary: MissionSummary;
  onOpenDetail: (missionId: string) => void;
}

const statusMeta = {
  available: { tone: "info" as const, icon: Clock, label: "Tersedia" },
  active: { tone: "prototype" as const, icon: Clock, label: "Aktif" },
  completed: { tone: "success" as const, icon: CheckCircle2, label: "Selesai" },
  locked: { tone: "warning" as const, icon: Lock, label: "Terkunci" },
  incomplete: { tone: "info" as const, icon: Clock, label: "Tersedia" },
};

const ctaLabel = {
  available: "Lihat Misi",
  active: "Lanjutkan",
  completed: "Latihan Ulang",
  incomplete: "Lihat Misi",
} as const;

export function MissionCard({ summary, onOpenDetail }: MissionCardProps) {
  const { mission, status, completedObjectives, totalObjectives } = summary;
  const meta = statusMeta[status];
  const StatusIcon = meta.icon;
  const isLocked = status === "locked";

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Badge tone={meta.tone}>
          <StatusIcon size={14} className="mr-1" aria-hidden />
          {meta.label}
        </Badge>
        <span className="text-xs font-semibold text-neutral-500">{mission.difficulty}</span>
      </div>

      <div>
        <h3 className="text-lg font-bold text-neutral-950">{mission.title}</h3>
        <p className="mt-1 text-sm leading-6 text-neutral-500">{mission.description}</p>
      </div>

      <p className="inline-flex items-center gap-1.5 text-sm text-neutral-700">
        <User size={16} aria-hidden />
        Bersama {mission.npcName}
      </p>

      <ProgressBar value={completedObjectives} max={totalObjectives} label={`${completedObjectives} dari ${totalObjectives} objective`} />

      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
        +{mission.rewardXp} XP
        <Coins size={16} className="text-coin" aria-hidden />
        +{mission.rewardCoins} koin
      </p>

      {isLocked ? (
        <Button disabled title="Selesaikan misi Perkenalan Diri terlebih dahulu">
          Selesaikan misi sebelumnya
        </Button>
      ) : (
        <Button variant={status === "completed" ? "secondary" : "primary"} onClick={() => onOpenDetail(mission.id)}>
          {ctaLabel[status]}
        </Button>
      )}
    </Card>
  );
}
