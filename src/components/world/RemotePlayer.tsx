import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group } from "three";
import type { RemotePlayerState } from "../../hooks/useMultiplayerRoom";
import { LowPolyAvatar } from "../three/LowPolyAvatar";

interface RemotePlayerProps {
  player: RemotePlayerState;
  isNearest: boolean;
  onClick?: () => void;
}

export function RemotePlayer({ player, isNearest, onClick }: RemotePlayerProps) {
  const groupRef = useRef<Group>(null);
  const positionRef = useRef({
    x: player.currentPosition?.x ?? 0,
    z: player.currentPosition?.z ?? 0,
  });
  const angleRef = useRef(player.currentPosition?.rotation ?? 0);
  const [isWalking, setIsWalking] = useState(false);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const targetX = player.currentPosition?.x ?? positionRef.current.x;
    const targetZ = player.currentPosition?.z ?? positionRef.current.z;
    const targetAngle = player.currentPosition?.rotation ?? angleRef.current;

    // Hitung jarak pergeseran per frame untuk deteksi animasi jalan halus
    const dx = targetX - positionRef.current.x;
    const dz = targetZ - positionRef.current.z;
    const dist = Math.hypot(dx, dz);

    // Linear interpolation (lerp) posisi
    positionRef.current.x += dx * 0.24;
    positionRef.current.z += dz * 0.24;

    // Interpolasi sudut rotasi dengan penanganan wrap-around
    let diff = targetAngle - angleRef.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    angleRef.current += diff * 0.24;

    group.position.x = positionRef.current.x;
    group.position.z = positionRef.current.z;
    group.rotation.y = angleRef.current;

    const walkingState = player.currentPosition?.animState === "walk" || dist > 0.02;
    if (walkingState !== isWalking) {
      setIsWalking(walkingState);
    }
  });

  const displayName = player.presence.name || player.presence.username || "Pemain";
  const userLevel = player.presence.level ?? 1;

  return (
    <group
      ref={groupRef}
      position={[positionRef.current.x, 0, positionRef.current.z]}
      onClick={onClick}
    >
      <LowPolyAvatar
        avatar={player.presence.avatar}
        walking={isWalking}
        active={isNearest}
      />

      {/* Cincin penanda interaksi jika dekat dengan pemain lokal */}
      {isNearest ? (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.7, 32]} />
          <meshBasicMaterial color="#00B4D8" transparent opacity={0.85} />
        </mesh>
      ) : null}

      {/* Nameplate mengapung di atas kepala */}
      <Html position={[0, 2.4, 0]} center zIndexRange={[12, 0]}>
        <div
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold shadow-layer transition-transform ${
            isNearest
              ? "scale-105 bg-primary-600 text-white ring-2 ring-primary-300"
              : "bg-white/95 text-neutral-900"
          }`}
        >
          <span className="max-w-[120px] truncate">{displayName}</span>
          <span className="rounded bg-black/15 px-1 py-0.5 text-[10px] font-semibold">
            Lv.{userLevel}
          </span>
        </div>
      </Html>
    </group>
  );
}
