import { CheckCircle2, Circle, Coins, DoorOpen, Keyboard, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ConversationPanel } from "../components/world/ConversationPanel";
import { VirtualJoystick } from "../components/world/VirtualJoystick";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useCharacterControls } from "../hooks/useCharacterControls";
import { useDemoStorage } from "../hooks/useDemoStorage";
import { isWebglAvailable } from "../lib/world";
import type { NpcCharacter } from "../types";

const MiniHomeScene = lazy(() => import("../components/world/MiniHomeScene"));

class SceneErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { hasError: boolean }> {
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

function WorldLoading() {
  return (
    <div className="world-status" role="status">
      <Loader2 size={28} className="animate-spin text-primary-500" aria-hidden />
      <p>Menyiapkan Mini Home...</p>
    </div>
  );
}

export function WorldPage() {
  const navigate = useNavigate();
  const { state, activeMission } = useDemoStorage();
  const [webglOk] = useState(() => isWebglAvailable());
  const [sceneError, setSceneError] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);
  const [nearestNpc, setNearestNpc] = useState<NpcCharacter | null>(null);
  const nearestNpcRef = useRef<NpcCharacter | null>(null);
  const [conversationNpc, setConversationNpc] = useState<NpcCharacter | null>(null);
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");

  const isConversing = conversationNpc !== null;

  const handleNearestNpc = useCallback((npc: NpcCharacter | null) => {
    nearestNpcRef.current = npc;
    setNearestNpc(npc);
  }, []);

  const interact = useCallback(() => {
    if (nearestNpcRef.current) setConversationNpc(nearestNpcRef.current);
  }, []);

  const { getDirection, setJoystick } = useCharacterControls({
    enabled: !isConversing && webglOk && !sceneError,
    onInteract: interact,
  });

  // Pause render loop ketika tab tidak aktif
  useEffect(() => {
    function onVisibilityChange() {
      setFrameloop(document.visibilityState === "visible" ? "always" : "never");
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Escape menutup percakapan
  useEffect(() => {
    if (!isConversing) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setConversationNpc(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isConversing]);

  function retryScene() {
    setSceneError(false);
    setSceneKey((key) => key + 1);
  }

  const mission = activeMission.mission;
  const completedIds = state.missionProgress[mission.id]?.completedObjectiveIds ?? [];

  return (
    <section className="world-page">
      <div className="world-stage">
        <div className="world-viewport">
          {!webglOk ? (
            <div className="world-status">
              <p className="font-semibold">Mini Home membutuhkan WebGL.</p>
              <p className="text-sm text-neutral-500">Gunakan browser modern untuk mencoba room.</p>
            </div>
          ) : sceneError ? (
            <div className="world-status" role="alert">
              <p className="font-semibold">Mini Home gagal dimuat.</p>
              <p className="text-sm text-neutral-500">Periksa dukungan WebGL atau muat ulang halaman.</p>
              <Button variant="secondary" onClick={retryScene}>
                <RefreshCw size={16} aria-hidden />
                Coba Lagi
              </Button>
            </div>
          ) : (
            <SceneErrorBoundary key={sceneKey} onError={() => setSceneError(true)}>
              <Suspense fallback={<WorldLoading />}>
                <MiniHomeScene
                  avatar={state.avatar}
                  movementEnabled={!isConversing}
                  getDirection={getDirection}
                  nearestNpcId={nearestNpc?.id ?? null}
                  onNearestNpc={handleNearestNpc}
                  frameloop={frameloop}
                />
              </Suspense>
            </SceneErrorBoundary>
          )}

          {/* HUD atas */}
          <div className="world-hud-top">
            <div className="world-hud-left">
              <span className="world-room-name">Mini Home</span>
              <Badge tone="prototype">Prototype Interaksi</Badge>
            </div>
            <button className="button button-secondary world-exit" type="button" onClick={() => navigate("/app/home")}>
              <DoorOpen size={16} aria-hidden />
              Keluar Room
            </button>
          </div>

          {/* Mission chip (mobile) */}
          <div className="world-mission-chip lg:hidden">
            <strong>{mission.title}</strong>
            <span>
              {completedIds.length} dari {mission.objectives.length} objective
            </span>
          </div>

          {/* Interaction prompt desktop */}
          {nearestNpc && !isConversing ? (
            <p className="world-prompt" role="status">
              <Keyboard size={16} aria-hidden />
              Tekan E untuk menyapa {nearestNpc.name}
            </p>
          ) : null}

          {/* Control hint desktop */}
          <p className="world-hint">WASD / panah untuk bergerak · E untuk interaksi</p>

          {/* Kontrol mobile */}
          {webglOk && !sceneError && !isConversing ? (
            <>
              <div className="world-joystick">
                <VirtualJoystick onChange={setJoystick} />
              </div>
              {nearestNpc ? (
                <button className="world-interact" type="button" onClick={() => setConversationNpc(nearestNpc)}>
                  <MessageCircle size={20} aria-hidden />
                  Sapa {nearestNpc.name}
                </button>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Panel kanan: percakapan atau info misi */}
        {isConversing && conversationNpc ? (
          <ConversationPanel npc={conversationNpc} onClose={() => setConversationNpc(null)} />
        ) : (
          <aside className="world-side-panel" aria-label="Misi aktif">
            <Badge tone="prototype">Misi Aktif</Badge>
            <h2 className="mt-3 text-xl font-bold text-neutral-950">{mission.title}</h2>
            <p className="mt-1 text-sm text-neutral-500">{mission.description}</p>
            <p className="mt-3 text-sm font-semibold text-neutral-700">
              Temui {mission.npcName} — cari nameplate namanya di dalam room.
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {mission.objectives.map((objective) => {
                const isDone = completedIds.includes(objective.id);
                return (
                  <li key={objective.id} className="flex items-center gap-2 text-sm">
                    {isDone ? (
                      <CheckCircle2 size={16} className="shrink-0 text-success-500" aria-hidden />
                    ) : (
                      <Circle size={16} className="shrink-0 text-neutral-300" aria-hidden />
                    )}
                    <span className={isDone ? "text-neutral-500 line-through" : "text-neutral-700"}>{objective.label}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
              +{mission.rewardXp} XP
              <Coins size={16} className="text-coin" aria-hidden />
              +{mission.rewardCoins} koin
            </p>
            <p className="mt-4 text-xs text-neutral-500">Karakter lain dalam versi demo merupakan simulasi.</p>
          </aside>
        )}
      </div>
    </section>
  );
}
