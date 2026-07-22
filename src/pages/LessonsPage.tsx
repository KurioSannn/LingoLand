import { CheckCircle2, Hourglass, Lock, Play, Unlock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { useDemoStorage } from "../hooks/useDemoStorage";
import type { LearningPathItemSummary } from "../state/selectors";

const pathMeta = {
  completed: {
    icon: CheckCircle2,
    tone: "success" as const,
    label: "Selesai",
    node: "border-success-500 bg-success-500 text-white",
    card: "border-success-500",
  },
  active: {
    icon: Play,
    tone: "prototype" as const,
    label: "Aktif",
    node: "border-primary-500 bg-primary-500 text-white ring-4 ring-primary-100",
    card: "border-primary-500",
  },
  unlocked: {
    icon: Unlock,
    tone: "info" as const,
    label: "Terbuka",
    node: "border-primary-300 bg-white text-primary-500",
    card: "border-primary-200 hover:border-primary-400",
  },
  locked: {
    icon: Lock,
    tone: "warning" as const,
    label: "Terkunci",
    node: "border-neutral-200 bg-neutral-100 text-neutral-400",
    card: "border-neutral-200",
  },
  "coming-soon": {
    icon: Hourglass,
    tone: "neutral" as const,
    label: "Segera Hadir",
    node: "border-dashed border-neutral-200 bg-neutral-50 text-neutral-400",
    card: "border-dashed border-neutral-200",
  },
};

function pathItemHint(item: LearningPathItemSummary): string {
  if (item.status === "coming-soon") return "Fitur ini belum tersedia di MVP.";
  if (item.status === "locked") return "Selesaikan bab sebelumnya untuk membuka ini.";
  if (!item.lessonUnitId) return "Langkah dasar sudah termasuk dalam onboarding kamu.";
  if (item.status === "completed") return "Sudah selesai. Klik untuk latihan ulang.";
  return "Klik untuk mulai bab ini.";
}

// This page is a self-contained exercise track (multiple choice / word-order
// drills), separate from Mission/World speaking practice at /app/learn and
// /app/world. It does not gate, and is not gated by, mission or NPC progress —
// only the topic ties a lesson unit to its matching mission.
export function LessonsPage() {
  const navigate = useNavigate();
  const { learningPath } = useDemoStorage();

  // Every step is numbered as a chapter except the onboarding baseline — new
  // chapters (including "coming soon" ones) keep the numbering continuous so
  // the course visibly grows over time instead of resetting.
  let chapterCounter = 0;
  const items = learningPath.map((item) => {
    const isChapter = item.id !== "basic";
    if (isChapter) chapterCounter += 1;
    return { item, chapterNumber: isChapter ? chapterCounter : null };
  });

  const realChapters = learningPath.filter((item) => item.lessonUnitId !== null);
  const completedChapters = realChapters.filter((item) => item.status === "completed").length;

  function openPathItem(item: LearningPathItemSummary) {
    if (!item.lessonUnitId) return;
    if (item.status === "locked" || item.status === "coming-soon") return;
    navigate(`/app/lessons/${item.lessonUnitId}`);
  }

  return (
    <section className="page-shell">
      <header>
        <Badge tone="prototype">Learning Path</Badge>
        <h1 className="mt-4 text-3xl font-bold text-neutral-950">Latihan Soal Bahasa Inggris</h1>
        <p className="mt-2 max-w-2xl text-neutral-500">
          Soal pilihan ganda dan susun kata untuk mengasah kosakata, terpisah dari percakapan NPC di Mini Home. Selesaikan bab demi bab, dari dasar sampai topik yang lebih lanjut.
        </p>
        <div className="mt-5 max-w-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-700">
            <span>Progress kamu</span>
            <span>{completedChapters} dari {realChapters.length} bab selesai</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${realChapters.length > 0 ? Math.round((completedChapters / realChapters.length) * 100) : 0}%` }}
            />
          </div>
        </div>
      </header>

      <ol className="mt-8 flex max-w-2xl flex-col">
        {items.map(({ item, chapterNumber }, index) => {
          const meta = pathMeta[item.status];
          const ItemIcon = meta.icon;
          const isClickable = item.lessonUnitId !== null && item.status !== "locked" && item.status !== "coming-soon";
          const isLast = index === items.length - 1;

          return (
            <li key={item.id} className="relative flex gap-4 pb-5 last:pb-0">
              {!isLast ? (
                <span
                  aria-hidden
                  className={`absolute left-6 top-14 h-[calc(100%-3.5rem)] w-0.5 -translate-x-1/2 ${
                    item.status === "completed" ? "bg-success-500" : "bg-neutral-200"
                  }`}
                />
              ) : null}

              <button
                type="button"
                onClick={() => openPathItem(item)}
                disabled={!isClickable}
                aria-label={`${chapterNumber ? `Bab ${chapterNumber}: ` : ""}${item.title}. ${meta.label}. ${pathItemHint(item)}`}
                className={`relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 transition-colors ${meta.node} ${
                  isClickable ? "cursor-pointer hover:brightness-95" : "cursor-not-allowed"
                }`}
              >
                <ItemIcon size={20} aria-hidden />
              </button>

              <button
                type="button"
                onClick={() => openPathItem(item)}
                disabled={!isClickable}
                title={pathItemHint(item)}
                className={`card flex flex-1 flex-col gap-1 border-2 p-4 text-left transition-colors ${meta.card} ${
                  isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-90"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                    {chapterNumber ? `Bab ${chapterNumber}` : "Onboarding"}
                  </p>
                  <Badge tone={meta.tone}>
                    <ItemIcon size={14} className="mr-1" aria-hidden />
                    {meta.label}
                  </Badge>
                </div>
                <p className="text-base font-bold text-neutral-950">{item.title}</p>
                <p className="text-sm text-neutral-500">{pathItemHint(item)}</p>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
