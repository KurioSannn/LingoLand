import { BookOpen, Coins, Heart, Home, Sparkles, Store, User, Users } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDemoAuth } from "../../hooks/useDemoAuth";
import { formatCoins } from "../../lib/game";
import { NotificationButton } from "../navigation/NotificationButton";
import { ProfileMenu } from "../navigation/ProfileMenu";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Toast } from "../ui/Toast";

const navItems = [
  { to: "/app/home", label: "Beranda", icon: Home },
  { to: "/app/learn", label: "Belajar", icon: BookOpen },
  { to: "/app/world", label: "Dunia", icon: Sparkles },
  { to: "/app/friends", label: "Teman", icon: Users },
  { to: "/app/store", label: "Toko", icon: Store },
];

export function AppLayout() {
  const { currentUser, logout: endSession, resetProgress } = useDemoAuth();
  const navigate = useNavigate();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  function logout() {
    endSession();
    navigate("/login", { replace: true });
  }

  function confirmReset() {
    resetProgress();
    setIsResetModalOpen(false);
    setToastMessage("Progress demo berhasil di-reset.");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink to="/" className="brand" aria-label="Kembali ke landing Lingoland">
          <img src="/logo.png" alt="" className="brand-mark" />
          <span className="brand-name">Lingoland</span>
        </NavLink>

        <nav className="desktop-nav" aria-label="Navigasi utama">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}>
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <span className="balance" aria-label={`${formatCoins(currentUser.coins)} koin`} title="Koin demo">
            <Coins size={18} className="text-coin" aria-hidden />
            {formatCoins(currentUser.coins)}
          </span>
          <span className="balance balance-heart" aria-label={`${currentUser.hearts} heart`} title="Heart">
            <Heart size={18} className="text-heart" aria-hidden />
            {currentUser.hearts}
          </span>
          <NotificationButton />
          <ProfileMenu userName={currentUser.name} onResetRequest={() => setIsResetModalOpen(true)} onLogout={logout} />
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Navigasi mobile">
        {navItems.filter((item) => item.label !== "Toko").map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `bottom-nav-link ${isActive ? "bottom-nav-link-active" : ""}`}>
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <NavLink to="/app/profile" className={({ isActive }) => `bottom-nav-link ${isActive ? "bottom-nav-link-active" : ""}`}>
          <User size={20} />
          <span>Profil</span>
        </NavLink>
      </nav>

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
    </div>
  );
}
