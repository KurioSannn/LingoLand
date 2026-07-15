import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { FriendAvatar } from "../components/ui/FriendAvatar";
import { Toast } from "../components/ui/Toast";
import { friends } from "../data/demoData";

export function FriendsPage() {
  const [toastMessage, setToastMessage] = useState("");

  return (
    <section className="page-shell">
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-neutral-950">Teman Belajar</h1>
          <p className="mt-2 text-neutral-500">Lihat aktivitas simulasi teman dalam prototype.</p>
        </div>
        <Badge tone="prototype">Simulasi</Badge>
      </header>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {friends.map((friend) => (
          <div key={friend.id} className="flex flex-col items-center rounded-xl border border-neutral-200 bg-white p-6 text-center">
            <FriendAvatar name={friend.name} color={friend.color} online={friend.online} size="large" />
            <h2 className="mt-4 text-lg font-bold text-neutral-950">{friend.name}</h2>
            <p className="mt-1 text-sm font-semibold text-neutral-500">{friend.online ? "Online (simulasi)" : "Offline"}</p>
            <p className="mt-2 min-h-10 text-sm leading-6 text-neutral-500">{friend.activity}</p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => setToastMessage("Undangan simulasi dikirim.")}
            >
              <UserPlus size={16} aria-hidden />
              Undang Latihan
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm text-neutral-500">
        Karakter lain dalam versi demo merupakan simulasi. Multiplayer real-time belum tersedia pada MVP ini.
      </p>

      {toastMessage ? <Toast message={toastMessage} onDismiss={() => setToastMessage("")} /> : null}
    </section>
  );
}
