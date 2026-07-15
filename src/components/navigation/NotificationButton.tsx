import { Bell } from "lucide-react";
import { useDismissable } from "../../hooks/useDismissable";

export function NotificationButton() {
  const { isOpen, setIsOpen, containerRef } = useDismissable<HTMLDivElement>();

  return (
    <div className="menu-container" ref={containerRef}>
      <button
        className="icon-button"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Notifikasi"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title="Notifikasi"
      >
        <Bell size={19} />
      </button>
      {isOpen ? (
        <div className="menu-panel" role="dialog" aria-label="Notifikasi">
          <p className="menu-heading">Notifikasi</p>
          <p className="menu-empty">Belum ada notifikasi. Selesaikan misi untuk melihat update progress di sini.</p>
        </div>
      ) : null}
    </div>
  );
}
