import { LogOut, RotateCcw, Shield, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDismissable } from "../../hooks/useDismissable";

interface ProfileMenuProps {
  userName: string;
  isAdmin?: boolean;
  onResetRequest: () => void;
  onLogout: () => void;
}

export function ProfileMenu({ userName, isAdmin, onResetRequest, onLogout }: ProfileMenuProps) {
  const navigate = useNavigate();
  const { isOpen, setIsOpen, containerRef } = useDismissable<HTMLDivElement>();

  function select(action: () => void) {
    setIsOpen(false);
    action();
  }

  return (
    <div className="menu-container" ref={containerRef}>
      <button
        className="avatar-button"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={`Menu profil ${userName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="Menu profil"
      >
        <User size={19} />
      </button>
      {isOpen ? (
        <div className="menu-panel" role="menu" aria-label="Menu profil">
          <p className="menu-heading">{userName}</p>
          <button className="menu-item" type="button" role="menuitem" onClick={() => select(() => navigate("/app/profile"))}>
            <User size={16} />
            Profil Saya
          </button>
          {isAdmin ? (
            <button className="menu-item text-primary-600 font-semibold" type="button" role="menuitem" onClick={() => select(() => navigate("/admin"))}>
              <Shield size={16} />
              Panel Admin (CMS)
            </button>
          ) : null}
          <button className="menu-item" type="button" role="menuitem" onClick={() => select(onResetRequest)}>
            <RotateCcw size={16} />
            Reset Progres Belajar
          </button>
          <button className="menu-item menu-item-danger" type="button" role="menuitem" onClick={() => select(onLogout)}>
            <LogOut size={16} />
            Keluar
          </button>
        </div>
      ) : null}
    </div>
  );
}
