import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Coins,
  Compass,
  Flame,
  GraduationCap,
  Heart,
  ListChecks,
  MessageCircle,
  Pencil,
  Shield,
  Sparkles,
  Store,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AvatarFigure } from "../components/ui/AvatarFigure";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import { useDemoAuth } from "../hooks/useDemoAuth";
import { useDemoStorage } from "../hooks/useDemoStorage";
import { fetchFriends, type FriendProfile } from "../lib/friendsRepository";
import { formatCoins, getNextLevelTarget } from "../lib/game";
import { fetchPublishedCourses } from "../lib/learningRepository";
import { fetchAvailableRooms, type WorldRoomSummary } from "../lib/realtime/roomService";
import type { Course } from "../types";

export function HomePage() {
  const { state, activeMission, learningPath, missionSummaries, setActiveMission } = useDemoStorage();
  const { isAdmin, isGuest } = useDemoAuth();
  const navigate = useNavigate();

  const { user } = state;
  const { mission } = activeMission;
  const nextLevelTarget = getNextLevelTarget(user.level);

  const [realFriends, setRealFriends] = useState<FriendProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [activeRooms, setActiveRooms] = useState<WorldRoomSummary[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const chapters = learningPath.filter((item) => item.lessonUnitId !== null);
  const completedChapters = chapters.filter((item) => item.status === "completed").length;
  const completedMissionsCount = missionSummaries.filter((m) => m.status === "completed").length;
  const currentChapter =
    chapters.find((item) => item.status !== "completed" && item.status !== "locked" && item.status !== "coming-soon") ??
    chapters[0] ??
    null;

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      setLoadingFriends(true);
      try {
        const [friendsData, roomsData, coursesData] = await Promise.all([
          !isGuest && user.id ? fetchFriends(false) : Promise.resolve([]),
          fetchAvailableRooms("social-plaza"),
          fetchPublishedCourses(),
        ]);
        if (!cancelled) {
          setRealFriends(friendsData);
          setActiveRooms(roomsData);
          setCourses(coursesData);
        }
      } catch {
        // Fallback aman jika jaringan sedang lambat
      } finally {
        if (!cancelled) setLoadingFriends(false);
      }
    }

    loadDashboardData();
    return () => {
      cancelled = true;
    };
  }, [isGuest, user.id]);

  function startMission() {
    setActiveMission(mission.id);
    navigate("/app/world");
  }

  const activeCourse = courses[0] ?? {
    id: "english-starter",
    title: "English Starter (A1-A2)",
    description: "Fondasi percakapan bahasa Inggris interaktif untuk pemula.",
  };

  const onlineFriendsCount = realFriends.filter((f) => f.isOnline).length;
  const totalRoomPlayers = activeRooms.reduce((acc, r) => acc + (r.activePlayersCount ?? 0), 0);

  return (
    <section className="page-shell space-y-8">
      {/* 1. HERO DASHBOARD PESERTA */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#23153c] via-[#341f60] to-[#5a35b5] p-6 text-white shadow-layer sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative shrink-0 self-start sm:self-center">
              <div className="rounded-2xl border-2 border-white/25 bg-white/10 p-2 backdrop-blur">
                <AvatarFigure avatar={state.avatar} size="medium" label={`Avatar ${user.name}`} />
              </div>
              <Link
                to="/app/avatar"
                className="absolute -bottom-2 -right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#23153c] shadow-md transition hover:scale-105"
                title="Kustomisasi Avatar 3D"
                aria-label="Kustomisasi Avatar 3D"
              >
                <Pencil size={14} />
              </Link>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-100">
                  Level {user.level} Learner
                </span>
                {isAdmin ? (
                  <Link
                    to="/admin"
                    className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-200 transition hover:bg-amber-400/30"
                  >
                    <Shield size={12} /> Admin CMS
                  </Link>
                ) : null}
                <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                  {isGuest ? "Mode Tamu Lokal" : "Akun Cloud Aktif"}
                </span>
              </div>

              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Halo, {user.name}!
              </h1>
              <p className="mt-1 max-w-xl text-sm text-white/80">
                Paket Aktif: <strong className="text-white">{activeCourse.title}</strong> — Pelajari teori di paket belajar, lalu praktikkan langsung lewat animasi 3D di Mini Home & Social Plaza.
              </p>

              <div className="mt-4 max-w-md">
                <div className="flex items-center justify-between text-xs font-semibold text-white/90">
                  <span>Progres Level {user.level}</span>
                  <span>{user.xp} / {nextLevelTarget} XP</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-300 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((user.xp / nextLevelTarget) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stat Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => navigate("/app/store")}
              className="flex flex-col justify-between rounded-xl border border-white/15 bg-white/10 p-3.5 text-left backdrop-blur transition hover:bg-white/20"
            >
              <span className="flex items-center justify-between text-xs font-medium text-white/75">
                Koin Kamu
                <Coins size={16} className="text-amber-300" />
              </span>
              <span className="mt-2 text-lg font-black">{formatCoins(user.coins)}</span>
              <span className="mt-0.5 text-[11px] text-amber-200">Buka Toko Avatar →</span>
            </button>

            <div className="flex flex-col justify-between rounded-xl border border-white/15 bg-white/10 p-3.5 backdrop-blur">
              <span className="flex items-center justify-between text-xs font-medium text-white/75">
                Energi Belajar
                <Heart size={16} className="text-rose-300" />
              </span>
              <span className="mt-2 text-lg font-black">{user.hearts} / 5</span>
              <span className="mt-0.5 text-[11px] text-white/70">Siap latihan</span>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-white/15 bg-white/10 p-3.5 backdrop-blur">
              <span className="flex items-center justify-between text-xs font-medium text-white/75">
                Runtutan Hari
                <Flame size={16} className="text-orange-300" />
              </span>
              <span className="mt-2 text-lg font-black">{user.streakDays} Hari</span>
              <span className="mt-0.5 text-[11px] text-orange-200">Pertahankan!</span>
            </div>

            <button
              type="button"
              onClick={() => navigate("/app/learn")}
              className="flex flex-col justify-between rounded-xl border border-white/15 bg-white/10 p-3.5 text-left backdrop-blur transition hover:bg-white/20"
            >
              <span className="flex items-center justify-between text-xs font-medium text-white/75">
                Bab & Misi
                <GraduationCap size={16} className="text-sky-300" />
              </span>
              <span className="mt-2 text-lg font-black">
                {completedChapters}/{chapters.length} Bab
              </span>
              <span className="mt-0.5 text-[11px] text-sky-200">
                {completedMissionsCount}/{missionSummaries.length} Misi 3D →
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. ALUR BELAJAR TERPADU: PAKET BELAJAR <-> ANIMASI 3D */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <Card className="border-2 border-primary-100 bg-gradient-to-br from-white via-white to-primary-50/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-100 text-primary-600">
                  <BookOpen size={18} />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-neutral-950">Alur Belajar Terpadu Hari Ini</h2>
                  <p className="text-xs text-neutral-500">
                    Kuasai kosakata di Paket Belajar, lalu praktikkan langsung bersama karakter 3D
                  </p>
                </div>
              </div>
              <Badge tone="info">{activeCourse.title}</Badge>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {/* Tahap 1: Paket Belajar (Teori & Kuis) */}
              <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-600">
                      <GraduationCap size={15} /> Tahap 1 · Paket Teori & Kuis
                    </span>
                    <Badge tone={currentChapter?.status === "completed" ? "success" : "neutral"}>
                      {completedChapters}/{chapters.length} Selesai
                    </Badge>
                  </div>
                  <h3 className="mt-2.5 text-lg font-bold text-neutral-950">
                    {currentChapter ? `Bab: ${currentChapter.title}` : "Latihan Kosakata & Susun Kalimat"}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Pelajari struktur kalimat dan ekspresi kunci melalui soal pilihan ganda & susun kata sebelum terjun ke percakapan 3D.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-neutral-600">+15 XP per bab lulus</span>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      navigate(
                        currentChapter?.lessonUnitId
                          ? `/app/lessons/${currentChapter.lessonUnitId}`
                          : "/app/lessons",
                      )
                    }
                  >
                    Mulai Bab Teori
                  </Button>
                </div>
              </div>

              {/* Tahap 2: Praktik Animasi 3D (Mini Home NPC) */}
              <div className="flex flex-col justify-between rounded-xl border-2 border-primary-200 bg-primary-50/50 p-4 shadow-sm">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-700">
                      <Sparkles size={15} /> Tahap 2 · Praktik Animasi 3D
                    </span>
                    <Badge tone="info">NPC {mission.npcName}</Badge>
                  </div>
                  <h3 className="mt-2.5 text-lg font-bold text-neutral-950">{mission.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{mission.description}</p>
                  <div className="mt-3">
                    <ProgressBar
                      value={activeMission.completedObjectives}
                      max={activeMission.totalObjectives}
                      label={`${activeMission.completedObjectives} dari ${activeMission.totalObjectives} objective percakapan`}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-primary-100 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-neutral-800">
                    +{mission.rewardXp} XP · <Coins size={14} className="text-coin" /> +{mission.rewardCoins}
                  </span>
                  <Button onClick={startMission}>
                    {activeMission.status === "completed" ? "Praktik Ulang 3D" : "Praktik di Dunia 3D"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* 3. PORTAL DUNIA 3D & ANIMASI (MINI HOME VS SOCIAL PLAZA) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="flex flex-col justify-between border border-neutral-200 transition hover:border-primary-300">
              <div>
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-100 text-primary-600">
                    <Compass size={20} />
                  </span>
                  <Badge tone="neutral">Single-Player 3D</Badge>
                </div>
                <h2 className="mt-4 text-lg font-bold text-neutral-950">Mini Home 3D</h2>
                <p className="mt-1.5 text-sm text-neutral-500">
                  Gerakkan animasi avatarmu di ruang tamu, area belajar, dan taman. Dekati karakter NPC (Bintang, Lala, Benny) untuk latihan speaking terarah.
                </p>
              </div>
              <div className="mt-5 flex items-center justify-between pt-3 border-t border-neutral-100">
                <span className="text-xs font-medium text-neutral-500">3 Zona Interaktif</span>
                <Link to="/app/world" className="button button-secondary text-xs">
                  Masuk Mini Home <ArrowRight size={14} />
                </Link>
              </div>
            </Card>

            <Card className="flex flex-col justify-between border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 transition hover:border-emerald-300">
              <div>
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Users size={20} />
                  </span>
                  <Badge tone="success">
                    {activeRooms.length > 0 ? `${activeRooms.length} Room Aktif` : "Multiplayer 3D"}
                  </Badge>
                </div>
                <h2 className="mt-4 text-lg font-bold text-neutral-950">Social Plaza 3D</h2>
                <p className="mt-1.5 text-sm text-neutral-600">
                  Dunia 3D outdoor multiplayer! Bertemu avatar pembelajar lain secara real-time, mengobrol di room chat, dan latihan percakapan berpasangan (Duo Practice).
                </p>
              </div>
              <div className="mt-5 flex items-center justify-between pt-3 border-t border-emerald-100">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {totalRoomPlayers > 0 ? `${totalRoomPlayers} pemain di lobby` : "Lobby terbuka"}
                </span>
                <Link to="/app/plaza" className="button button-primary text-xs">
                  Buka Social Plaza <ArrowRight size={14} />
                </Link>
              </div>
            </Card>
          </div>

          {/* Pintasan Kustomisasi & Tantangan Harian */}
          <Card className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
                <CalendarCheck size={22} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-neutral-950">Tantangan Speaking & Kustomisasi Avatar</h2>
                  <Badge tone="warning">+30 XP & Koin</Badge>
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  Koin dari hasil menyelesaikan bab & misi 3D bisa langsung dipakai membeli outfit baru di Toko untuk memperbarui animasi avatarmu di dunia 3D.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link to="/app/avatar-chat" className="button button-secondary text-xs">
                <MessageCircle size={15} /> AI Chat
              </Link>
              <Link to="/app/store" className="button button-secondary text-xs">
                <Store size={15} /> Toko Avatar
              </Link>
            </div>
          </Card>
        </div>

        {/* 4. SIDEBAR KANAN: TEMAN BELAJAR REAL-TIME (TANPA HARDCODE) & AKTIVITAS */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-950">Teman Belajar</h2>
                <p className="text-xs text-neutral-500">
                  {isGuest
                    ? "Login akun untuk terhubung dengan teman"
                    : realFriends.length > 0
                      ? `${onlineFriendsCount} online dari ${realFriends.length} teman`
                      : "Terhubung langsung dengan database pertemanan"}
                </p>
              </div>
              <Link to="/app/friends" className="text-sm font-semibold text-primary-600 hover:underline">
                Kelola
              </Link>
            </div>

            {loadingFriends ? (
              <p className="mt-4 text-sm text-neutral-500">Memuat daftar teman...</p>
            ) : realFriends.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-3">
                {realFriends.slice(0, 6).map((friend) => (
                  <li
                    key={friend.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-neutral-50/70 p-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                        {friend.name.slice(0, 2).toUpperCase()}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                            friend.isOnline ? "bg-emerald-500" : "bg-neutral-300"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-950">{friend.name}</p>
                        <p className="truncate text-xs text-neutral-500">
                          {friend.isOnline ? "Online di Social Plaza" : `@${friend.username}`}
                        </p>
                      </div>
                    </div>
                    <Badge tone={friend.isOnline ? "success" : "neutral"}>
                      {friend.isOnline ? "Online" : `Lv.${friend.level}`}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-center">
                <Users size={26} className="mx-auto text-neutral-400" />
                <p className="mt-2 text-sm font-semibold text-neutral-800">
                  Belum Ada Teman di Daftar
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {isGuest
                    ? "Kamu sedang menggunakan Mode Tamu. Daftar atau masuk akun untuk menambah teman belajar sungguhan."
                    : "Cari sesama pembelajar berdasarkan username atau temui mereka langsung di Social Plaza 3D."}
                </p>
                <div className="mt-3 flex justify-center gap-2">
                  <Link to="/app/friends" className="button button-secondary text-xs">
                    <UserPlus size={14} /> Cari Teman
                  </Link>
                  <Link to="/app/plaza" className="button button-primary text-xs">
                    Ke Plaza 3D
                  </Link>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks size={18} className="text-primary-500" aria-hidden />
                <h2 className="text-lg font-bold text-neutral-950">Aktivitas Terbaru</h2>
              </div>
              <Badge tone="neutral">{state.recentActivity.length} catatan</Badge>
            </div>
            {state.recentActivity.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-2.5 text-sm text-neutral-600">
                {state.recentActivity.map((activity, index) => (
                  <li
                    key={`${activity}-${index}`}
                    className="flex items-start gap-2.5 rounded-lg bg-neutral-50 px-3 py-2 text-xs leading-5"
                  >
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-primary-500" />
                    <span>{activity}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-neutral-500">
                Belum ada aktivitas. Mulai paket belajar atau misi pertamamu hari ini!
              </p>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}
