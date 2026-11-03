import {
  BookOpen,
  Coffee,
  Compass,
  DoorOpen,
  Keyboard,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Toast } from "../components/ui/Toast";
import { VirtualJoystick } from "../components/world/VirtualJoystick";
import { useCharacterControls } from "../hooks/useCharacterControls";
import { useDemoAuth } from "../hooks/useDemoAuth";
import { useDemoStorage } from "../hooks/useDemoStorage";
import {
  type RemotePlayerState,
  useMultiplayerRoom,
} from "../hooks/useMultiplayerRoom";
import { sendFriendRequest } from "../lib/friendsRepository";
import { PLAZA_TOPICS } from "../lib/plazaWorld";
import type { PlayerPresence } from "../lib/realtime/protocol";
import {
  type WorldRoomSummary,
  fetchAvailableRooms,
} from "../lib/realtime/roomService";
import { isWebglAvailable } from "../lib/world";

const SocialPlazaScene = lazy(() => import("../components/world/SocialPlazaScene"));

class SceneErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

function PlazaLoading() {
  return (
    <div className="world-status" role="status">
      <Loader2 size={32} className="animate-spin text-primary-500" aria-hidden />
      <p className="font-semibold text-neutral-800">Menghubungkan ke Social Plaza...</p>
      <p className="text-xs text-neutral-500">Menyiapkan lingkungan 3D & presence realtime</p>
    </div>
  );
}

export function SocialPlazaPage() {
  const navigate = useNavigate();
  const { roomId: routeRoomId } = useParams<{ roomId?: string }>();
  const { currentUser } = useDemoAuth();
  const { state } = useDemoStorage();

  const [webglOk] = useState(() => isWebglAvailable());
  const [sceneError, setSceneError] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");

  // Community Guidelines Agreement Gate
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(() => {
    return localStorage.getItem("lingoland_plaza_guidelines_accepted") === "true";
  });

  // Rooms & Navigation
  const activeRoomId = routeRoomId || "00000000-0000-0000-0000-000000000001";
  const [availableRooms, setAvailableRooms] = useState<WorldRoomSummary[]>([]);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [currentRoomName, setCurrentRoomName] = useState("Plaza Utama");

  // Interaction State
  const [nearestPlayer, setNearestPlayer] = useState<RemotePlayerState | null>(null);
  const nearestPlayerRef = useRef<RemotePlayerState | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<RemotePlayerState | null>(null);
  const [nearTopicBoard, setNearTopicBoard] = useState(false);
  const nearTopicBoardRef = useRef(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);

  // Toast Feedback
  const [toastMessage, setToastMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  // Player presence object
  const playerProfile: PlayerPresence = useMemo(() => {
    return {
      playerId: currentUser.id,
      name: currentUser.name,
      username: currentUser.username || currentUser.name.toLowerCase().replace(/\s+/g, "_"),
      level: currentUser.level || 1,
      avatar: state.avatar,
      joinedAt: Date.now(),
    };
  }, [currentUser, state.avatar]);

  // Hook Multiplayer Room
  const { isConnected, connectionError, remotePlayers, broadcastMovement } =
    useMultiplayerRoom({
      roomId: activeRoomId,
      playerProfile,
      enabled: guidelinesAccepted && webglOk && !sceneError,
      isGuest: currentUser.isGuest,
    });

  // Fetch list of available rooms
  useEffect(() => {
    let active = true;
    async function loadRooms() {
      try {
        const rooms = await fetchAvailableRooms("social-plaza");
        if (!active) return;
        setAvailableRooms(rooms);
        const current = rooms.find((r) => r.id === activeRoomId);
        if (current) {
          setCurrentRoomName(current.name);
        }
      } catch {
        // Fallback grace
      }
    }
    loadRooms();
    return () => {
      active = false;
    };
  }, [activeRoomId]);

  // Handle nearest player
  const handleNearestPlayerChange = useCallback((player: RemotePlayerState | null) => {
    nearestPlayerRef.current = player;
    setNearestPlayer(player);
  }, []);

  // Handle near topic board
  const handleNearTopicBoardChange = useCallback((near: boolean) => {
    nearTopicBoardRef.current = near;
    setNearTopicBoard(near);
  }, []);

  // Interaksi tombol 'E'
  const handleInteract = useCallback(() => {
    if (nearTopicBoardRef.current) {
      setIsTopicModalOpen(true);
      return;
    }
    if (nearestPlayerRef.current) {
      setSelectedPlayer(nearestPlayerRef.current);
    }
  }, []);

  const isModalOpen =
    isTopicModalOpen || selectedPlayer !== null || isRoomModalOpen || !guidelinesAccepted;

  // Kontrol keyboard / virtual joystick
  const { getDirection, setJoystick } = useCharacterControls({
    enabled: !isModalOpen && webglOk && !sceneError,
    onInteract: handleInteract,
  });

  // Tab hidden listener untuk optimasi render & baterai mobile
  useEffect(() => {
    function onVisibilityChange() {
      setFrameloop(document.visibilityState === "visible" ? "always" : "never");
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  function handleAcceptGuidelines() {
    localStorage.setItem("lingoland_plaza_guidelines_accepted", "true");
    setGuidelinesAccepted(true);
  }

  function handleSelectRoom(room: WorldRoomSummary) {
    setIsRoomModalOpen(false);
    navigate(`/app/plaza/${room.id}`);
  }

  async function handleSendFriendRequest(targetUsername: string) {
    if (currentUser.isGuest) {
      setToastMessage("Akun tamu tidak dapat mengirim pertemanan. Silakan daftar atau masuk.");
      return;
    }

    try {
      setSendingRequest(true);
      const res = await sendFriendRequest(targetUsername, currentUser.isGuest);
      setToastMessage(res.message);
      if (res.ok) {
        setSelectedPlayer(null);
      }
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Gagal mengirim permintaan.");
    } finally {
      setSendingRequest(false);
    }
  }

  function retryScene() {
    setSceneError(false);
    setSceneKey((prev) => prev + 1);
  }

  // Active players count (self + remote players)
  const totalActivePlayers = remotePlayers.size + (isConnected ? 1 : 0);

  return (
    <section className="world-page">
      <div className="world-stage">
        <div className="world-viewport">
          {!webglOk ? (
            <div className="world-status">
              <p className="font-semibold text-neutral-900">Social Plaza membutuhkan WebGL.</p>
              <p className="text-sm text-neutral-500">
                Gunakan browser modern yang mendukung akselerasi grafis 3D.
              </p>
            </div>
          ) : sceneError ? (
            <div className="world-status" role="alert">
              <p className="font-semibold text-neutral-900">Social Plaza gagal dimuat.</p>
              <p className="text-sm text-neutral-500">Periksa driver grafis atau muat ulang scene.</p>
              <Button variant="secondary" onClick={retryScene}>
                <RefreshCw size={16} aria-hidden />
                Coba Lagi
              </Button>
            </div>
          ) : !guidelinesAccepted ? (
            <div className="world-status">
              <ShieldCheck size={36} className="text-primary-500" aria-hidden />
              <p className="font-bold text-neutral-900">Selamat datang di Social Plaza!</p>
              <p className="max-w-md text-sm text-neutral-600">
                Sebelum bergabung ke ruang publik, harap baca dan setujui pedoman interaksi komunitas kami.
              </p>
              <Button variant="primary" onClick={handleAcceptGuidelines}>
                Lihat & Setujui Pedoman
              </Button>
            </div>
          ) : (
            <SceneErrorBoundary key={sceneKey} onError={() => setSceneError(true)}>
              <Suspense fallback={<PlazaLoading />}>
                <SocialPlazaScene
                  avatar={state.avatar}
                  playerProfile={playerProfile}
                  movementEnabled={!isModalOpen}
                  getDirection={getDirection}
                  remotePlayers={remotePlayers}
                  onBroadcastMovement={broadcastMovement}
                  nearestPlayerId={nearestPlayer?.presence.playerId ?? null}
                  onNearestPlayerChange={handleNearestPlayerChange}
                  onSelectPlayer={(p) => setSelectedPlayer(p)}
                  onNearTopicBoardChange={handleNearTopicBoardChange}
                  onOpenTopicBoard={() => setIsTopicModalOpen(true)}
                  frameloop={frameloop}
                />
              </Suspense>
            </SceneErrorBoundary>
          )}

          {/* Top HUD: Room & Navigation */}
          <div className="world-hud-top">
            <div className="world-hud-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className="world-room-name flex items-center gap-1.5">
                  <Sparkles size={16} className="text-primary-500" aria-hidden />
                  {currentRoomName}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white shadow-layer backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {totalActivePlayers} pemain aktif
                </span>
                {currentUser.isGuest ? (
                  <Badge tone="prototype">Mode Tamu (Simulasi)</Badge>
                ) : (
                  <Badge tone="success">Multiplayer Live</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="button button-secondary world-exit flex items-center gap-1.5 text-xs font-semibold"
                onClick={() => setIsRoomModalOpen(true)}
              >
                <Users size={15} aria-hidden />
                <span>Pilih Room</span>
              </button>
              <button
                type="button"
                className="button button-secondary world-exit flex items-center gap-1.5 text-xs font-semibold"
                onClick={() => navigate("/app/world")}
                title="Kembali ke Mini Home latihan privat"
              >
                <DoorOpen size={15} aria-hidden />
                <span>Ke Mini Home</span>
              </button>
            </div>
          </div>

          {/* Error Banner jika Realtime bermasalah */}
          {connectionError && (
            <div className="absolute inset-x-4 top-16 z-20 rounded-md bg-amber-500/95 px-3 py-2 text-center text-xs font-semibold text-white shadow-layer">
              {connectionError}
            </div>
          )}

          {/* Interaction Prompts (Desktop) */}
          {nearTopicBoard && !isModalOpen ? (
            <p className="world-prompt" role="status">
              <Keyboard size={16} aria-hidden />
              Tekan E untuk membaca Papan Topik Harian
            </p>
          ) : nearestPlayer && !isModalOpen ? (
            <p className="world-prompt" role="status">
              <Keyboard size={16} aria-hidden />
              Tekan E untuk menyapa {nearestPlayer.presence.name || nearestPlayer.presence.username}
            </p>
          ) : null}

          {/* Controls Hint (Desktop) */}
          <p className="world-hint">WASD / panah untuk berjalan · E untuk interaksi</p>

          {/* Mobile Joystick & Quick Action Button */}
          {webglOk && !sceneError && !isModalOpen && guidelinesAccepted ? (
            <>
              <div className="world-joystick">
                <VirtualJoystick onChange={setJoystick} />
              </div>

              {nearTopicBoard ? (
                <button
                  type="button"
                  className="world-interact flex items-center gap-2"
                  onClick={() => setIsTopicModalOpen(true)}
                >
                  <BookOpen size={20} aria-hidden />
                  <span>Buka Topik</span>
                </button>
              ) : nearestPlayer ? (
                <button
                  type="button"
                  className="world-interact flex items-center gap-2"
                  onClick={() => setSelectedPlayer(nearestPlayer)}
                >
                  <MessageCircle size={20} aria-hidden />
                  <span>Sapa {nearestPlayer.presence.name || "Pemain"}</span>
                </button>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Side Panel: Informasi Plaza & Daftar Pemain di Room */}
        <aside className="world-side-panel flex flex-col justify-between" aria-label="Informasi Social Plaza">
          <div>
            <div className="flex items-center justify-between">
              <Badge tone="info">Social Hub</Badge>
              <span className="text-xs font-semibold text-neutral-500">Kapasitas Maks: 20</span>
            </div>

            <h2 className="mt-3 text-xl font-bold text-neutral-950">Social Plaza</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Tempat berkumpul outdoor untuk mempraktikkan Bahasa Inggris bersama teman dan sesama pembelajar.
            </p>

            <div className="mt-4 flex flex-col gap-2 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700">
              <div className="flex items-center gap-2">
                <Compass size={15} className="text-primary-500" />
                <span><strong>Air Mancur:</strong> Titik temu utama di pusat plaza.</span>
              </div>
              <div className="flex items-center gap-2">
                <Coffee size={15} className="text-amber-600" />
                <span><strong>Area Kafe:</strong> Santai di meja berpayung outdoor.</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-emerald-600" />
                <span><strong>Papan Topik:</strong> Ide percakapan harian interaktif.</span>
              </div>
            </div>

            <h3 className="mt-5 text-sm font-bold text-neutral-900">
              Pemain di Ruangan Ini ({totalActivePlayers})
            </h3>
            <ul className="mt-2.5 flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
              {/* Local Player */}
              <li className="flex items-center justify-between rounded-md border border-primary-200 bg-primary-50/70 px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-bold text-neutral-900">{playerProfile.name} (Kamu)</span>
                </div>
                <span className="rounded bg-white px-1.5 py-0.5 font-semibold text-primary-700">
                  Lv.{playerProfile.level}
                </span>
              </li>

              {/* Remote Players */}
              {Array.from(remotePlayers.values()).map((rp) => (
                <li
                  key={rp.presence.playerId}
                  className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs transition hover:bg-neutral-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <button
                      type="button"
                      className="text-left font-semibold text-neutral-800 hover:text-primary-600"
                      onClick={() => setSelectedPlayer(rp)}
                    >
                      {rp.presence.name || rp.presence.username || "Pemain"}
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => setSelectedPlayer(rp)}
                  >
                    Profil
                  </Button>
                </li>
              ))}

              {remotePlayers.size === 0 && (
                <li className="py-4 text-center text-xs text-neutral-400">
                  Belum ada pemain lain di room ini. Ajak temanmu bergabung!
                </li>
              )}
            </ul>
          </div>

          <div className="mt-6 border-t border-neutral-200 pt-4">
            <Button
              variant="secondary"
              className="w-full text-xs"
              onClick={() => setIsTopicModalOpen(true)}
            >
              <BookOpen size={16} />
              Lihat Topik Pembelajaran Hari Ini
            </Button>
          </div>
        </aside>
      </div>

      {/* MODAL 1: Community Guidelines Modal */}
      <Modal
        isOpen={!guidelinesAccepted}
        title="Pedoman Komunitas Social Plaza"
        onClose={() => {}}
      >
        <div className="mt-3 space-y-3 text-sm text-neutral-600">
          <p>
            Social Plaza adalah ruang bersama untuk berlatih bahasa secara ramah dan aman. Dengan bergabung, Anda menyetujui:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-neutral-700">
            <li>
              <strong>Saling Menghargai:</strong> Bersikap sopan dan mendukung sesama pembelajar dari berbagai tingkat kemahiran.
            </li>
            <li>
              <strong>Bebas Pelecehan & Konten Tidak Pantas:</strong> Dilarang menggunakan bahasa kasar, SARA, spam, atau ujaran kebencian.
            </li>
            <li>
              <strong>Jaga Privasi Anda:</strong> Jangan pernah membagikan password, kontak pribadi sensitif, atau data finansial di ruang publik.
            </li>
          </ul>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <Button variant="primary" onClick={handleAcceptGuidelines}>
            Saya Setuju & Masuk Plaza
          </Button>
        </div>
      </Modal>

      {/* MODAL 2: Room Switcher Modal */}
      <Modal
        isOpen={isRoomModalOpen}
        title="Pilih Ruang Social Plaza"
        onClose={() => setIsRoomModalOpen(false)}
      >
        <div className="mt-3 space-y-3">
          <p className="text-sm text-neutral-600">
            Pilih ruangan publik aktif atau pindah ke lobby lain untuk bertemu teman belajar baru.
          </p>
          <div className="flex max-h-60 flex-col gap-2 overflow-y-auto">
            {availableRooms.map((room) => {
              const isCurrent = room.id === activeRoomId;
              return (
                <div
                  key={room.id}
                  className={`flex items-center justify-between rounded-lg border p-3 text-sm transition ${
                    isCurrent
                      ? "border-primary-500 bg-primary-50/60"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-neutral-900">{room.name}</h4>
                    <p className="text-xs text-neutral-500">
                      {room.activePlayersCount} / {room.capacity} pemain · {room.visibility}
                    </p>
                  </div>
                  {isCurrent ? (
                    <Badge tone="success">Sedang Aktif</Badge>
                  ) : (
                    <Button
                      variant="primary"
                      className="px-3 py-1 text-xs"
                      onClick={() => handleSelectRoom(room)}
                      disabled={room.activePlayersCount >= room.capacity}
                    >
                      {room.activePlayersCount >= room.capacity ? "Penuh" : "Masuk"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={() => setIsRoomModalOpen(false)}>
            Tutup
          </Button>
        </div>
      </Modal>

      {/* MODAL 3: Papan Topik Pembelajaran Harian */}
      <Modal
        isOpen={isTopicModalOpen}
        title="Papan Topik Obrolan Harian"
        onClose={() => setIsTopicModalOpen(false)}
      >
        <div className="mt-3 space-y-4">
          <p className="text-sm text-neutral-600">
            Gunakan pertanyaan pembuka berikut sebagai ide saat menyapa teman di Social Plaza:
          </p>
          <div className="grid gap-3">
            {PLAZA_TOPICS.map((topic) => (
              <div
                key={topic.id}
                className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-3.5 transition hover:border-primary-300"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary-600">{topic.category}</span>
                  <span className="text-xs font-semibold text-neutral-500">{topic.title}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-neutral-900">
                  &ldquo;{topic.starterEn}&rdquo;
                </p>
                <p className="mt-1 text-xs text-neutral-500 italic">
                  {topic.starterId}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={() => setIsTopicModalOpen(false)}>
            Tutup
          </Button>
        </div>
      </Modal>

      {/* MODAL 4: Detail Pemain & Tambah Teman */}
      <Modal
        isOpen={selectedPlayer !== null}
        title="Profil Pemain"
        onClose={() => setSelectedPlayer(null)}
      >
        {selectedPlayer && (
          <div className="mt-3 space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700">
                {(selectedPlayer.presence.name || "P")[0].toUpperCase()}
              </div>
              <div>
                <h4 className="text-base font-bold text-neutral-950">
                  {selectedPlayer.presence.name || selectedPlayer.presence.username}
                </h4>
                <p className="text-xs text-neutral-500">
                  @{selectedPlayer.presence.username} · Lv.{selectedPlayer.presence.level ?? 1}
                </p>
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Sedang berada di Social Plaza
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-neutral-600">
              <p>
                Ajak berlatih percakapan bahasa Inggris bersama di area kafe atau duo pergola.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="primary"
                onClick={() => handleSendFriendRequest(selectedPlayer.presence.username)}
                disabled={sendingRequest}
              >
                <UserPlus size={16} />
                {sendingRequest ? "Mengirim..." : "Kirim Permintaan Pertemanan"}
              </Button>
              <Button variant="secondary" onClick={() => setSelectedPlayer(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Toast Feedback */}
      {toastMessage && (
        <Toast message={toastMessage} onDismiss={() => setToastMessage("")} />
      )}
    </section>
  );
}

export default SocialPlazaPage;
