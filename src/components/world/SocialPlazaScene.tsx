import { Html } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group } from "three";
import type { RemotePlayerState } from "../../hooks/useMultiplayerRoom";
import type { PlayerPresence } from "../../lib/realtime/protocol";
import {
  PLAZA_SPAWN,
  PLAZA_SPEED,
  TOPIC_BOARD_POSITION,
  findNearestRemotePlayer,
  isNearTopicBoard,
  resolvePlazaMovement,
} from "../../lib/plazaWorld";
import type { PlayerPosition } from "../../lib/world";
import type { AvatarConfig } from "../../types";
import { LowPolyAvatar } from "../three/LowPolyAvatar";
import { PlazaEnvironment } from "./PlazaEnvironment";
import { RemotePlayer } from "./RemotePlayer";

export interface SocialPlazaSceneProps {
  avatar: AvatarConfig;
  playerProfile: PlayerPresence;
  movementEnabled: boolean;
  getDirection: () => { x: number; z: number };
  remotePlayers: Map<string, RemotePlayerState>;
  onBroadcastMovement: (pos: {
    x: number;
    z: number;
    rotation: number;
    animState: "idle" | "walk";
  }) => void;
  nearestPlayerId: string | null;
  onNearestPlayerChange: (player: RemotePlayerState | null) => void;
  onSelectPlayer: (player: RemotePlayerState) => void;
  onNearTopicBoardChange: (near: boolean) => void;
  onOpenTopicBoard: () => void;
  frameloop: "always" | "never";
}

function LocalPlayerRig({
  avatar,
  playerProfile,
  movementEnabled,
  getDirection,
  remotePlayers,
  onBroadcastMovement,
  onNearestPlayerChange,
  onNearTopicBoardChange,
}: Pick<
  SocialPlazaSceneProps,
  | "avatar"
  | "playerProfile"
  | "movementEnabled"
  | "getDirection"
  | "remotePlayers"
  | "onBroadcastMovement"
  | "onNearestPlayerChange"
  | "onNearTopicBoardChange"
>) {
  const rigRef = useRef<Group>(null);
  const positionRef = useRef<PlayerPosition>({ ...PLAZA_SPAWN });
  const angleRef = useRef(Math.PI); // Awal menghadap ke utara (menuju pusat plaza)
  const nearestIdRef = useRef<string | null>(null);
  const nearTopicRef = useRef(false);
  const [isWalking, setIsWalking] = useState(false);

  useFrame(({ camera }, delta) => {
    const rig = rigRef.current;
    if (!rig) return;

    const direction = movementEnabled ? getDirection() : { x: 0, z: 0 };
    const moving = Math.hypot(direction.x, direction.z) > 0.01;

    if (moving) {
      const step = Math.min(delta, 0.05) * PLAZA_SPEED;
      positionRef.current = resolvePlazaMovement(
        positionRef.current,
        direction.x * step,
        direction.z * step,
      );

      const targetAngle = Math.atan2(direction.x, direction.z);
      let diff = targetAngle - angleRef.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      angleRef.current += diff * 0.22;
    }

    if (moving !== isWalking) {
      setIsWalking(moving);
    }

    rig.position.x = positionRef.current.x;
    rig.position.z = positionRef.current.z;
    rig.rotation.y = angleRef.current;

    // Broadcast pergerakan ke room channel (akan di-throttle 10Hz di hook)
    onBroadcastMovement({
      x: positionRef.current.x,
      z: positionRef.current.z,
      rotation: angleRef.current,
      animState: moving ? "walk" : "idle",
    });

    // Deteksi pemain terdekat
    const nearest = findNearestRemotePlayer(positionRef.current, remotePlayers);
    const nearestId = nearest?.presence.playerId ?? null;
    if (nearestId !== nearestIdRef.current) {
      nearestIdRef.current = nearestId;
      onNearestPlayerChange(nearest);
    }

    // Deteksi papan topik
    const nearTopic = isNearTopicBoard(positionRef.current);
    if (nearTopic !== nearTopicRef.current) {
      nearTopicRef.current = nearTopic;
      onNearTopicBoardChange(nearTopic);
    }

    // Follow camera halus
    camera.position.x += (positionRef.current.x - camera.position.x) * 0.08;
    camera.position.z += (positionRef.current.z + 6.6 - camera.position.z) * 0.08;
    camera.position.y += (6.8 - camera.position.y) * 0.08;
    camera.lookAt(positionRef.current.x, 1.1, positionRef.current.z);
  });

  const displayName = playerProfile.name || playerProfile.username || "Kamu";

  return (
    <group ref={rigRef} position={[PLAZA_SPAWN.x, 0, PLAZA_SPAWN.z]}>
      <LowPolyAvatar avatar={avatar} walking={isWalking} />
      <Html position={[0, 2.4, 0]} center zIndexRange={[12, 0]}>
        <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-neutral-950/85 px-2.5 py-1 text-xs font-bold text-white shadow-layer">
          <span className="max-w-[120px] truncate">{displayName} (Kamu)</span>
          <span className="rounded bg-white/20 px-1 py-0.5 text-[10px] font-semibold">
            Lv.{playerProfile.level ?? 1}
          </span>
        </div>
      </Html>
    </group>
  );
}

export function SocialPlazaScene({
  avatar,
  playerProfile,
  movementEnabled,
  getDirection,
  remotePlayers,
  onBroadcastMovement,
  nearestPlayerId,
  onNearestPlayerChange,
  onSelectPlayer,
  onNearTopicBoardChange,
  onOpenTopicBoard,
  frameloop,
}: SocialPlazaSceneProps) {
  const remoteList = Array.from(remotePlayers.entries());

  return (
    <Canvas
      className="world-canvas-inner"
      camera={{ position: [PLAZA_SPAWN.x, 7.5, PLAZA_SPAWN.z + 6.5], fov: 48 }}
      shadows
      dpr={[1, 1.75]}
      frameloop={frameloop}
    >
      {/* Pencahayaan outdoor alami */}
      <ambientLight intensity={0.65} />
      <hemisphereLight intensity={0.5} color="#D8F3DC" groundColor="#74C69D" />
      <directionalLight
        position={[8, 14, 10]}
        intensity={1.15}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
      />

      {/* Seluruh aset 3D lingkungan plaza */}
      <PlazaEnvironment />

      {/* Penanda floating HTML di atas Papan Topik */}
      <group position={[TOPIC_BOARD_POSITION.x, 2.9, TOPIC_BOARD_POSITION.z]}>
        <Html center zIndexRange={[12, 0]}>
          <button
            type="button"
            onClick={onOpenTopicBoard}
            className="group flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-primary-700 shadow-layer transition-transform hover:scale-105 active:scale-95"
          >
            <span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
            <span>Papan Topik Harian</span>
          </button>
        </Html>
      </group>

      {/* Render semua remote player di room */}
      {remoteList.map(([id, player]) => (
        <RemotePlayer
          key={id}
          player={player}
          isNearest={nearestPlayerId === id}
          onClick={() => onSelectPlayer(player)}
        />
      ))}

      {/* Local player rig */}
      <LocalPlayerRig
        avatar={avatar}
        playerProfile={playerProfile}
        movementEnabled={movementEnabled}
        getDirection={getDirection}
        remotePlayers={remotePlayers}
        onBroadcastMovement={onBroadcastMovement}
        onNearestPlayerChange={onNearestPlayerChange}
        onNearTopicBoardChange={onNearTopicBoardChange}
      />
    </Canvas>
  );
}

export default SocialPlazaScene;
