import { CalendarCheck, Coins, Flame, Heart, ListChecks, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { FriendAvatar } from "../components/ui/FriendAvatar";
import { ProgressBar } from "../components/ui/ProgressBar";
import { friends } from "../data/demoData";
import { formatCoins, getNextLevelTarget } from "../lib/game";
import { useDemoStorage } from "../hooks/useDemoStorage";

export function HomePage() {
  const { state, activeMission, setActiveMission } = useDemoStorage();
  const navigate = useNavigate();
  const { user } = state;
  const { mission } = activeMission;
  const nextLevelTarget = getNextLevelTarget(user.level);

  function startMission() {
    setActiveMission(mission.id);
    navigate("/app/world");
  }

  return (
    <section className="page-shell">
      <header>
        <h1 className="text-3xl font-bold text-neutral-950">Halo, {user.name.split(" ")[0]}.</h1>
        <p className="mt-2 text-neutral-500">Lanjutkan latihan speaking-mu hari ini.</p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-neutral-950">Lanjutkan Belajar</h2>
            <Badge tone="prototype">Bersama {mission.npcName}</Badge>
          </div>
          <h3 className="mt-4 text-2xl font-bold text-neutral-950">{mission.title}</h3>
          <p className="mt-2 text-neutral-500">{mission.description}</p>
          <div className="mt-4">
            <ProgressBar
              value={activeMission.completedObjectives}
              max={activeMission.totalObjectives}
              label={`${activeMission.completedObjectives} dari ${activeMission.totalObjectives} objective`}
            />
          </div>
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
            +{mission.rewardXp} XP
            <Coins size={16} className="text-coin" aria-hidden />
            +{mission.rewardCoins} koin
          </p>
          <div className="mt-5">
            <Button onClick={startMission}>{activeMission.status === "completed" ? "Latihan Ulang" : "Lanjutkan Misi"}</Button>
          </div>
        </Card>

        <Card className="lg:col-span-4">
          <h2 className="text-lg font-bold text-neutral-950">Progress Kamu</h2>
          <p className="mt-3 text-sm font-semibold text-neutral-700">Level {user.level}</p>
          <div className="mt-2">
            <ProgressBar value={user.xp} max={nextLevelTarget} label={`${user.xp} dari ${nextLevelTarget} XP`} />
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-3 text-sm font-semibold text-neutral-700">
            <li className="inline-flex items-center gap-2">
              <Coins size={16} className="text-coin" aria-hidden />
              {formatCoins(user.coins)} koin
            </li>
            <li className="inline-flex items-center gap-2">
              <Heart size={16} className="text-heart" aria-hidden />
              {user.hearts} heart
            </li>
            <li className="col-span-2 inline-flex items-center gap-2">
              <Flame size={16} className="text-warning-500" aria-hidden />
              {user.streakDays} hari streak
            </li>
          </ul>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-8">
          <Card className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-primary-500" aria-hidden />
                <h2 className="text-lg font-bold text-neutral-950">Mini Home</h2>
              </div>
              <p className="mt-2 text-sm text-neutral-500">
                Ruang tamu, area belajar, dan taman menunggumu. Tiga karakter simulasi siap diajak bicara.
              </p>
            </div>
            <Link to="/app/world" className="button button-primary shrink-0">
              Masuk Room
            </Link>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <CalendarCheck size={18} className="text-primary-500" aria-hidden />
              <h2 className="text-lg font-bold text-neutral-950">Daily Speaking Challenge</h2>
            </div>
            <p className="mt-2 text-neutral-500">Ucapkan tiga kalimat tentang aktivitas hari ini.</p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
              +30 XP
              <Coins size={16} className="text-coin" aria-hidden />
              +10 koin
            </p>
            <p className="mt-3 text-sm text-neutral-500">Latih lewat percakapan bebas dengan karakter mana pun di Mini Home.</p>
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-950">Teman Online</h2>
              <Link to="/app/friends" className="text-sm font-semibold text-primary-600 hover:underline">
                Lihat semua
              </Link>
            </div>
            <p className="mt-1 text-xs text-neutral-500">Simulasi teman belajar.</p>
            <ul className="mt-4 flex flex-col gap-3">
              {friends.slice(0, 6).map((friend) => (
                <li key={friend.id} className="flex items-center gap-3">
                  <FriendAvatar name={friend.name} color={friend.color} online={friend.online} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-950">{friend.name}</p>
                    <p className="truncate text-sm text-neutral-500">{friend.activity}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <ListChecks size={18} className="text-primary-500" aria-hidden />
              <h2 className="text-lg font-bold text-neutral-950">Aktivitas Terbaru</h2>
            </div>
            {state.recentActivity.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-2 text-sm leading-6 text-neutral-500">
                {state.recentActivity.map((activity, index) => (
                  <li key={`${activity}-${index}`}>{activity}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-neutral-500">Belum ada aktivitas. Mulai misi pertamamu untuk melihat progress di sini.</p>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}
