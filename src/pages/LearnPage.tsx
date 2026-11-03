import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Coins,
  Compass,
  GraduationCap,
  Layers,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MissionCard } from "../components/missions/MissionCard";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { missions } from "../data/demoData";
import { useDemoStorage } from "../hooks/useDemoStorage";
import { fetchCurriculumUnits, fetchPublishedCourses } from "../lib/learningRepository";
import type { Course, LessonUnit, MissionStatus } from "../types";

type MissionFilter = "all" | "available" | "completed" | "locked";

const filters: Array<{ id: MissionFilter; label: string }> = [
  { id: "all", label: "Semua Misi 3D" },
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
  const { state, missionSummaries, learningPath, setActiveMission } = useDemoStorage();
  const [activeFilter, setActiveFilter] = useState<MissionFilter>("all");
  const [detailMissionId, setDetailMissionId] = useState<string | null>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("english-starter");
  const [remoteUnits, setRemoteUnits] = useState<LessonUnit[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadCurriculum() {
      const [coursesData, unitsData] = await Promise.all([
        fetchPublishedCourses(),
        fetchCurriculumUnits(),
      ]);
      if (!cancelled) {
        setCourses(coursesData);
        if (coursesData.length > 0) {
          setSelectedCourseId(coursesData[0].id);
        }
        setRemoteUnits(unitsData);
      }
    }
    loadCurriculum();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleSummaries = useMemo(
    () => missionSummaries.filter((summary) => matchesFilter(summary.status, activeFilter)),
    [missionSummaries, activeFilter],
  );

  const chapters = learningPath.filter((item) => item.lessonUnitId !== null);
  const completedChapters = chapters.filter((item) => item.status === "completed").length;
  const chapterProgressPct = chapters.length > 0 ? Math.round((completedChapters / chapters.length) * 100) : 0;

  const detailMission = missions.find((mission) => mission.id === detailMissionId) ?? null;
  const activeCourse = courses.find((c) => c.id === selectedCourseId) ?? courses[0] ?? {
    id: "english-starter",
    slug: "english-starter",
    title: "English Starter (A1-A2)",
    language: "en",
    description: "Fondasi percakapan bahasa Inggris interaktif untuk pemula.",
    status: "published" as const,
    sortOrder: 1,
  };

  function startMission(missionId: string) {
    setActiveMission(missionId);
    setDetailMissionId(null);
    navigate("/app/world");
  }

  return (
    <section className="page-shell space-y-8">
      {/* Header & Penjelasan Sistem Paket Belajar */}
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Badge tone="info">Kurikulum Terintegrasi 3D</Badge>
          <h1 className="mt-3 text-3xl font-bold text-neutral-950">Paket Belajar & Misi Speaking 3D</h1>
          <p className="mt-2 max-w-2xl text-neutral-500">
            Pilih paket belajar, kuasai teori & kosakata lewat kuis bab, lalu praktikkan langsung bersama animasi karakter NPC 3D di Mini Home maupun pemain lain di Social Plaza.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/lessons" className="button button-secondary text-xs">
            <BookOpen size={15} /> Semua Bab Teori
          </Link>
          <Link to="/app/world" className="button button-primary text-xs">
            <Compass size={15} /> Masuk Dunia 3D
          </Link>
        </div>
      </header>

      {/* 1. PEMILIH PAKET BELAJAR (DINAMIS DARI DATABASE COURSES) */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-950">
            <Layers size={18} className="text-primary-600" />
            Pilih Paket Belajar
          </h2>
          <span className="text-xs font-medium text-neutral-500">
            {courses.length} paket tersedia di kurikulum
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(courses.length > 0 ? courses : [activeCourse]).map((course) => {
            const isSelected = course.id === activeCourse.id;
            return (
              <button
                key={course.id}
                type="button"
                onClick={() => setSelectedCourseId(course.id)}
                className={`flex flex-col justify-between rounded-xl border-2 p-5 text-left transition ${
                  isSelected
                    ? "border-primary-500 bg-primary-50/50 shadow-sm"
                    : "border-neutral-200 bg-white hover:border-primary-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={isSelected ? "info" : "neutral"}>
                      {isSelected ? "Paket Aktif" : course.language.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-bold text-primary-600">
                      {chapterProgressPct}% Selesai
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-neutral-950">{course.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{course.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-200/70 flex items-center justify-between text-xs font-semibold text-neutral-700">
                  <span>{remoteUnits.length || chapters.length} Bab Teori</span>
                  <span>{missionSummaries.length} Misi Animasi 3D</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. BANNER UTAMA PAKET AKTIF & KONEKSI KE ANIMASI 3D */}
      <Card className="bg-gradient-to-br from-[#2b194d] via-[#41257a] to-[#5e38b8] text-white">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <GraduationCap size={28} aria-hidden />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary-100">
                Paket Aktif · {activeCourse.title}
              </p>
              <h2 className="mt-1 text-2xl font-black">
                Bagaimana Paket Belajar Terhubung dengan Animasi 3D?
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-white/85">
                Setiap bab di paket belajar ini memiliki pasangan <strong>Misi Percakapan 3D</strong>. Setelah kamu lulus kuis kosakata di suatu bab, kamu langsung menggerakkan animasi avatarmu di <strong>Mini Home 3D</strong> untuk mempraktikkan kalimat tersebut bersama karakter NPC!
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end shrink-0">
            <div className="w-full sm:w-60">
              <div className="flex items-center justify-between text-xs font-semibold text-white/90">
                <span>Progres Bab Paket</span>
                <span>
                  {completedChapters} dari {chapters.length} bab selesai
                </span>
              </div>
              <div className="mt-1.5 h-2.5 rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-emerald-300 transition-all"
                  style={{ width: `${chapterProgressPct}%` }}
                />
              </div>
            </div>
            <Button variant="secondary" className="w-full sm:w-auto" onClick={() => navigate("/app/lessons")}>
              Buka Bab & Latihan Soal <ArrowRight size={15} />
            </Button>
          </div>
        </div>

        {/* 3 Tahap Koneksi Belajar -> Animasi 3D */}
        <div className="mt-6 grid gap-3 border-t border-white/15 pt-5 sm:grid-cols-3">
          <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
              1. Teori & Kuis Bab
            </p>
            <p className="mt-1 text-xs leading-5 text-white/85">
              Kerjakan soal pilihan ganda & susun kata dari bank soal untuk menguasai kosakata topik (misal: Perkenalan, Hobi, Akhir Pekan).
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              2. Animasi NPC di Mini Home 3D
            </p>
            <p className="mt-1 text-xs leading-5 text-white/85">
              Masuk ke dunia 3D, jalankan avatarmu menghampiri NPC (Bintang, Lala, Benny) dan ucapkan kalimat sesuai objective misi untuk panen XP & Koin.
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-wider text-sky-300">
              3. Avatar 3D & Social Plaza
            </p>
            <p className="mt-1 text-xs leading-5 text-white/85">
              Gunakan koin untuk membeli outfit avatar 3D-mu, lalu praktikkan percakapan bahasa Inggris langsung bersama teman di Social Plaza 3D.
            </p>
          </div>
        </div>
      </Card>

      {/* 3. DAFTAR BAB TEORI DALAM PAKET INI (TERHUBUNG KE DATABASE CURRICULUM_UNITS) */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold text-neutral-950">Daftar Modul Teori ({activeCourse.title})</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Setiap modul teori di bawah ini terhubung langsung ke bank soal database dan misi praktik 3D.
            </p>
          </div>
          <Link to="/app/lessons" className="text-sm font-semibold text-primary-600 hover:underline">
            Lihat Jalur Belajar Lengkap →
          </Link>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {remoteUnits.map((unit, idx) => {
            const isCompleted = state.completedLessonIds.includes(unit.id);
            const linkedMission = missions.find((m) => m.id === unit.relatedMissionId);
            return (
              <Card key={unit.id} className="flex flex-col justify-between border border-neutral-200">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={isCompleted ? "success" : "info"}>
                      Bab {idx + 1} · {isCompleted ? "Lulus" : "Tersedia"}
                    </Badge>
                    <span className="text-xs font-semibold text-neutral-500">
                      {unit.exercises.length} Soal
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-neutral-950">{unit.title}</h3>
                  <p className="mt-1 text-sm text-neutral-500">{unit.description}</p>

                  {linkedMission ? (
                    <div className="mt-3 rounded-lg bg-primary-50 px-3 py-2 text-xs text-primary-700">
                      <span className="font-bold">Terhubung ke Animasi 3D:</span> Misi "{linkedMission.title}" bersama NPC <strong>{linkedMission.npcName}</strong> ({linkedMission.difficulty})
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex gap-2 pt-3 border-t border-neutral-100">
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs"
                    onClick={() => navigate(`/app/lessons/${unit.id}`)}
                  >
                    {isCompleted ? "Ulangi Kuis" : "Mulai Kuis"}
                  </Button>
                  {linkedMission ? (
                    <Button
                      className="flex-1 text-xs"
                      onClick={() => startMission(linkedMission.id)}
                    >
                      <Sparkles size={13} /> Praktik 3D
                    </Button>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 4. DAFTAR MISI SPEAKING 3D (PRAKTIK BERSAMA ANIMASI NPC) */}
      <div>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold text-neutral-950">Misi Praktik Speaking 3D (Mini Home)</h2>
            <p className="mt-1 text-neutral-500">
              Pilih misi percakapan untuk dijalankan bersama animasi karakter NPC di dalam ruangan 3D.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter misi">
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
      </div>

      {/* Modal Detail Misi 3D */}
      <Modal isOpen={detailMission !== null} title={detailMission?.title ?? ""} onClose={() => setDetailMissionId(null)}>
        {detailMission ? (
          <div className="mt-3 flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-700">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <User size={16} aria-hidden />
                NPC {detailMission.npcName}
              </span>
              <span>·</span>
              <span>Lokasi 3D: Mini Home</span>
              <span>·</span>
              <Badge tone="info">{detailMission.difficulty}</Badge>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">Objective Percakapan</h3>
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
              <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">Contoh Kalimat yang Bisa Digunakan</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {detailMission.suggestedSentences.map((sentence) => (
                  <li key={sentence} className="flex items-center gap-2 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                    <CheckCircle2 size={14} className="shrink-0 text-primary-500" />
                    {sentence}
                  </li>
                ))}
              </ul>
            </div>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
              Reward Kelulusan: +{detailMission.rewardXp} XP &
              <Coins size={16} className="text-coin" aria-hidden />
              +{detailMission.rewardCoins} koin
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={() => startMission(detailMission.id)}>
                <Sparkles size={16} /> Mulai di Mini Home 3D
              </Button>
              <Button variant="secondary" onClick={() => navigate("/app/plaza")}>
                <Users size={16} /> Latihan di Plaza
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
