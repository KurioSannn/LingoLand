import { CheckCircle2, Coins, Flame, Heart, LogOut, Pencil, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AvatarFigure } from "../components/ui/AvatarFigure";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Toast } from "../components/ui/Toast";
import { avatarOptions, missions } from "../data/demoData";
import { formatCoins, getNextLevelTarget } from "../lib/game";
import { useDemoAuth } from "../hooks/useDemoAuth";
import { useDemoStorage } from "../hooks/useDemoStorage";

export function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useDemoAuth();
  const { state, resetProgress } = useDemoStorage();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const { user } = state;
  const nextLevelTarget = getNextLevelTarget(user.level);
  const completedMissions = missions.filter((mission) => state.completedMissionIds.includes(mission.id));
  const ownedItems = avatarOptions.filter((option) => option.category !== "skin" && state.inventory.includes(option.id));

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function confirmReset() {
    resetProgress();
    setIsResetModalOpen(false);
    setToastMessage("Progress demo berhasil di-reset.");
  }

  return (
    <section className="page-shell">
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <AvatarFigure avatar={state.avatar} size="large" label={`Avatar ${user.name}`} />
            <div>
              <h1 className="text-3xl font-bold text-neutral-950">{user.name}</h1>
              <p className="text-neutral-500">@{user.username}</p>
              <p className="mt-1 text-sm text-neutral-500">{user.email}</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-neutral-700">Level {user.level}</p>
            <div className="mt-2">
              <ProgressBar value={user.xp} max={nextLevelTarget} label={`${user.xp} dari ${nextLevelTarget} XP`} />
            </div>
          </div>

          <ul className="mt-6 grid grid-cols-2 gap-3 text-sm font-semibold text-neutral-700 sm:grid-cols-4">
            <li className="inline-flex items-center gap-2 rounded-md bg-neutral-50 p-3">
              <Coins size={16} className="text-coin" aria-hidden />
              {formatCoins(user.coins)}
            </li>
            <li className="inline-flex items-center gap-2 rounded-md bg-neutral-50 p-3">
              <Heart size={16} className="text-heart" aria-hidden />
              {user.hearts} heart
            </li>
            <li className="inline-flex items-center gap-2 rounded-md bg-neutral-50 p-3">
              <Flame size={16} className="text-warning-500" aria-hidden />
              {user.streakDays} hari
            </li>
            <li className="inline-flex items-center gap-2 rounded-md bg-neutral-50 p-3">
              <CheckCircle2 size={16} className="text-success-500" aria-hidden />
              {completedMissions.length} misi
            </li>
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/app/avatar" className="button button-primary">
              <Pencil size={16} aria-hidden />
              Edit Avatar
            </Link>
            <Button variant="secondary" onClick={() => setIsResetModalOpen(true)}>
              <RotateCcw size={16} aria-hidden />
              Reset Progress Demo
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut size={16} aria-hidden />
              Keluar
            </Button>
          </div>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card>
            <h2 className="text-lg font-bold text-neutral-950">Misi Selesai</h2>
            {completedMissions.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-3">
                {completedMissions.map((mission) => (
                  <li key={mission.id} className="flex items-center gap-2 text-sm text-neutral-700">
                    <CheckCircle2 size={16} className="shrink-0 text-success-500" aria-hidden />
                    {mission.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-neutral-500">Belum ada misi yang selesai. Mulai dari Perkenalan Diri di Mini Home.</p>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-neutral-950">Item Dimiliki</h2>
            {ownedItems.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {ownedItems.map((item) => (
                  <li key={item.id}>
                    <Badge tone="neutral">{item.label}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-neutral-500">Belum ada item tambahan. Kunjungi Toko untuk membuka item baru.</p>
            )}
          </Card>
        </div>
      </div>

      <Modal isOpen={isResetModalOpen} title="Reset semua progress demo?" onClose={() => setIsResetModalOpen(false)}>
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          XP, koin, avatar, inventory, dan status misi akan kembali ke kondisi awal.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button variant="danger" onClick={confirmReset}>Reset Progress</Button>
          <Button variant="secondary" onClick={() => setIsResetModalOpen(false)}>Batal</Button>
        </div>
      </Modal>

      {toastMessage ? <Toast message={toastMessage} onDismiss={() => setToastMessage("")} /> : null}
    </section>
  );
}
