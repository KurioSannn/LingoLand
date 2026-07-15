import { Html } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group } from "three";
import { npcs } from "../../data/demoData";
import {
  NPC_AVATARS,
  PLAYER_SPAWN,
  PLAYER_SPEED,
  findNearestNpc,
  resolveMovement,
} from "../../lib/world";
import type { PlayerPosition } from "../../lib/world";
import type { AvatarConfig, NpcCharacter } from "../../types";
import { LowPolyAvatar } from "../three/LowPolyAvatar";

interface MiniHomeSceneProps {
  avatar: AvatarConfig;
  movementEnabled: boolean;
  getDirection: () => { x: number; z: number };
  nearestNpcId: string | null;
  onNearestNpc: (npc: NpcCharacter | null) => void;
  frameloop: "always" | "never";
}

const WALL_COLOR = "#E8E4FF";
const WOOD_COLOR = "#D9A76C";

function Walls() {
  return (
    <group>
      {/* Dinding utara + jendela */}
      <mesh position={[0, 0.8, -3.92]} castShadow>
        <boxGeometry args={[7.9, 1.6, 0.14]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
      <mesh position={[-0.6, 0.95, -3.84]}>
        <boxGeometry args={[1.5, 0.85, 0.05]} />
        <meshStandardMaterial color="#BFE0F5" />
      </mesh>
      {/* Dinding samping hanya area indoor */}
      <mesh position={[-3.92, 0.8, -1.2]} castShadow>
        <boxGeometry args={[0.14, 1.6, 5.6]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
      <mesh position={[3.92, 0.8, -1.2]} castShadow>
        <boxGeometry args={[0.14, 1.6, 5.6]} />
        <meshStandardMaterial color="#F1EDFF" />
      </mesh>
    </group>
  );
}

function Fence() {
  const posts = [];
  for (let x = -3.9; x <= 3.9; x += 0.78) {
    posts.push(x);
  }
  const sideZ = [1.9, 2.55, 3.2, 3.85];
  return (
    <group>
      {posts.map((x) => (
        <mesh key={`s-${x.toFixed(2)}`} position={[x, 0.32, 3.92]} castShadow>
          <boxGeometry args={[0.1, 0.64, 0.1]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      ))}
      <mesh position={[0, 0.5, 3.92]}>
        <boxGeometry args={[7.9, 0.09, 0.06]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 0.24, 3.92]}>
        <boxGeometry args={[7.9, 0.09, 0.06]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      {sideZ.map((z) => (
        <group key={`side-${z}`}>
          <mesh position={[-3.92, 0.32, z]} castShadow>
            <boxGeometry args={[0.1, 0.64, 0.1]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[3.92, 0.32, z]} castShadow>
            <boxGeometry args={[0.1, 0.64, 0.1]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function LivingArea() {
  return (
    <group>
      {/* Karpet */}
      <mesh position={[-2.5, 0.02, -2.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.15, 24]} />
        <meshStandardMaterial color="#F3F1FF" />
      </mesh>
      {/* Sofa */}
      <group position={[-3.2, 0, -3.0]}>
        <mesh position={[0, 0.28, 0]} castShadow>
          <boxGeometry args={[1.8, 0.42, 0.8]} />
          <meshStandardMaterial color="#8FB8A8" />
        </mesh>
        <mesh position={[0, 0.66, -0.32]} castShadow>
          <boxGeometry args={[1.8, 0.62, 0.18]} />
          <meshStandardMaterial color="#7BA392" />
        </mesh>
        <mesh position={[-0.86, 0.52, 0]} castShadow>
          <boxGeometry args={[0.16, 0.5, 0.8]} />
          <meshStandardMaterial color="#7BA392" />
        </mesh>
        <mesh position={[0.86, 0.52, 0]} castShadow>
          <boxGeometry args={[0.16, 0.5, 0.8]} />
          <meshStandardMaterial color="#7BA392" />
        </mesh>
      </group>
      {/* Meja kecil */}
      <mesh position={[-1.9, 0.24, -2.0]} castShadow>
        <boxGeometry args={[1.0, 0.1, 0.6]} />
        <meshStandardMaterial color={WOOD_COLOR} />
      </mesh>
      <mesh position={[-1.9, 0.1, -2.0]}>
        <boxGeometry args={[0.12, 0.2, 0.12]} />
        <meshStandardMaterial color="#B98C5E" />
      </mesh>
      {/* Rak buku */}
      <group position={[-3.72, 0, -0.7]}>
        <mesh position={[0, 0.72, 0]} castShadow>
          <boxGeometry args={[0.5, 1.44, 1.4]} />
          <meshStandardMaterial color="#B98C5E" />
        </mesh>
        <mesh position={[0.22, 1.05, -0.35]}>
          <boxGeometry args={[0.1, 0.32, 0.5]} />
          <meshStandardMaterial color="#7868F8" />
        </mesh>
        <mesh position={[0.22, 1.05, 0.35]}>
          <boxGeometry args={[0.1, 0.32, 0.4]} />
          <meshStandardMaterial color="#EC5C6C" />
        </mesh>
        <mesh position={[0.22, 0.5, 0]}>
          <boxGeometry args={[0.1, 0.32, 0.7]} />
          <meshStandardMaterial color="#35B86B" />
        </mesh>
      </group>
      {/* Lampu berdiri */}
      <group position={[-1.15, 0, -3.45]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.06, 1.1, 8]} />
          <meshStandardMaterial color="#4B4952" />
        </mesh>
        <mesh position={[0, 1.2, 0]} castShadow>
          <coneGeometry args={[0.26, 0.32, 12, 1, true]} />
          <meshStandardMaterial color="#F4C84A" />
        </mesh>
      </group>
    </group>
  );
}

function StudyArea() {
  return (
    <group>
      {/* Meja belajar */}
      <group position={[2.9, 0, -3.15]}>
        <mesh position={[0, 0.76, 0]} castShadow>
          <boxGeometry args={[1.6, 0.1, 0.75]} />
          <meshStandardMaterial color={WOOD_COLOR} />
        </mesh>
        <mesh position={[-0.72, 0.38, 0]}>
          <boxGeometry args={[0.1, 0.76, 0.68]} />
          <meshStandardMaterial color="#B98C5E" />
        </mesh>
        <mesh position={[0.72, 0.38, 0]}>
          <boxGeometry args={[0.1, 0.76, 0.68]} />
          <meshStandardMaterial color="#B98C5E" />
        </mesh>
        {/* Laptop */}
        <mesh position={[-0.2, 0.84, 0.05]}>
          <boxGeometry args={[0.42, 0.04, 0.3]} />
          <meshStandardMaterial color="#4B4952" />
        </mesh>
        <mesh position={[-0.2, 0.99, -0.09]} rotation={[-0.35, 0, 0]}>
          <boxGeometry args={[0.42, 0.28, 0.03]} />
          <meshStandardMaterial color="#27262D" />
        </mesh>
        {/* Buku */}
        <mesh position={[0.4, 0.84, 0.1]} rotation={[0, 0.4, 0]}>
          <boxGeometry args={[0.3, 0.06, 0.22]} />
          <meshStandardMaterial color="#3D78D8" />
        </mesh>
      </group>
      {/* Papan tempel di dinding */}
      <mesh position={[2.8, 1.15, -3.82]}>
        <boxGeometry args={[1.3, 0.75, 0.06]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[2.5, 1.25, -3.78]}>
        <boxGeometry args={[0.24, 0.24, 0.02]} />
        <meshStandardMaterial color="#F4C84A" />
      </mesh>
      <mesh position={[3.05, 1.1, -3.78]}>
        <boxGeometry args={[0.24, 0.24, 0.02]} />
        <meshStandardMaterial color="#8FE3B1" />
      </mesh>
      {/* Kursi */}
      <group position={[3.45, 0, -2.35]}>
        <mesh position={[0, 0.32, 0]} castShadow>
          <boxGeometry args={[0.5, 0.09, 0.5]} />
          <meshStandardMaterial color="#7868F8" />
        </mesh>
        <mesh position={[0, 0.62, 0.22]} castShadow>
          <boxGeometry args={[0.5, 0.55, 0.08]} />
          <meshStandardMaterial color="#6757E8" />
        </mesh>
        <mesh position={[0, 0.14, 0]}>
          <boxGeometry args={[0.1, 0.28, 0.1]} />
          <meshStandardMaterial color="#4B4952" />
        </mesh>
      </group>
      {/* Tanaman kecil */}
      <group position={[3.7, 0, -1.5]}>
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.2, 0.36, 10]} />
          <meshStandardMaterial color="#D9A76C" />
        </mesh>
        <mesh position={[0, 0.52, 0]} castShadow>
          <sphereGeometry args={[0.26, 10, 10]} />
          <meshStandardMaterial color="#5CA45F" />
        </mesh>
      </group>
    </group>
  );
}

function GardenArea() {
  return (
    <group>
      {/* Jalur setapak */}
      <mesh position={[0, 0.025, 2.65]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.1, 2.4]} />
        <meshStandardMaterial color="#EAD9B8" />
      </mesh>
      {/* Bangku taman */}
      <group position={[3.25, 0, 3.05]}>
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[1.3, 0.08, 0.5]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0, 0.62, -0.2]} castShadow>
          <boxGeometry args={[1.3, 0.5, 0.08]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[-0.55, 0.15, 0]}>
          <boxGeometry args={[0.1, 0.3, 0.44]} />
          <meshStandardMaterial color="#E7E5EC" />
        </mesh>
        <mesh position={[0.55, 0.15, 0]}>
          <boxGeometry args={[0.1, 0.3, 0.44]} />
          <meshStandardMaterial color="#E7E5EC" />
        </mesh>
      </group>
      {/* Pohon */}
      <group position={[1.35, 0, 3.15]}>
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.26, 1.2, 8]} />
          <meshStandardMaterial color="#7B4932" />
        </mesh>
        <mesh position={[0, 1.5, 0]} castShadow>
          <sphereGeometry args={[0.62, 12, 12]} />
          <meshStandardMaterial color="#5CA45F" />
        </mesh>
        <mesh position={[0.42, 1.2, 0.2]} castShadow>
          <sphereGeometry args={[0.4, 10, 10]} />
          <meshStandardMaterial color="#6DBE70" />
        </mesh>
      </group>
      {/* Bunga-bunga kecil */}
      {[
        [-2.6, 2.4, "#EC5C6C"],
        [-3.1, 3.2, "#F4C84A"],
        [-1.8, 3.3, "#7868F8"],
        [-1.2, 2.6, "#EC5C6C"],
      ].map(([x, z, color]) => (
        <group key={`${x}-${z}`} position={[Number(x), 0, Number(z)]}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.24, 6]} />
            <meshStandardMaterial color="#4E9B51" />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color={String(color)} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Floors() {
  return (
    <group>
      <mesh receiveShadow position={[0, 0, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.9, 5.4]} />
        <meshStandardMaterial color="#FFF9F0" />
      </mesh>
      <mesh receiveShadow position={[0, 0, 2.65]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.9, 2.5]} />
        <meshStandardMaterial color="#CFE8C0" />
      </mesh>
    </group>
  );
}

function PlayerRig({
  avatar,
  movementEnabled,
  getDirection,
  onNearestNpc,
}: Pick<MiniHomeSceneProps, "avatar" | "movementEnabled" | "getDirection" | "onNearestNpc">) {
  const rigRef = useRef<Group>(null);
  const positionRef = useRef<PlayerPosition>({ ...PLAYER_SPAWN });
  const angleRef = useRef(Math.PI);
  const nearestIdRef = useRef<string | null>(null);
  const [isWalking, setIsWalking] = useState(false);

  useFrame(({ camera }, delta) => {
    const rig = rigRef.current;
    if (!rig) return;

    const direction = movementEnabled ? getDirection() : { x: 0, z: 0 };
    const moving = Math.hypot(direction.x, direction.z) > 0.01;

    if (moving) {
      const step = Math.min(delta, 0.05) * PLAYER_SPEED;
      positionRef.current = resolveMovement(positionRef.current, direction.x * step, direction.z * step);

      const targetAngle = Math.atan2(direction.x, direction.z);
      let diff = targetAngle - angleRef.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      angleRef.current += diff * 0.18;
    }

    if (moving !== isWalking) setIsWalking(moving);

    rig.position.x = positionRef.current.x;
    rig.position.z = positionRef.current.z;
    rig.rotation.y = angleRef.current;

    const nearest = findNearestNpc(positionRef.current);
    if ((nearest?.id ?? null) !== nearestIdRef.current) {
      nearestIdRef.current = nearest?.id ?? null;
      onNearestNpc(nearest);
    }

    // Follow camera dengan damping halus
    camera.position.x += (positionRef.current.x - camera.position.x) * 0.06;
    camera.position.z += (positionRef.current.z + 5.4 - camera.position.z) * 0.06;
    camera.position.y += (5.6 - camera.position.y) * 0.06;
    camera.lookAt(positionRef.current.x, 0.9, positionRef.current.z);
  });

  return (
    <group ref={rigRef} position={[PLAYER_SPAWN.x, 0, PLAYER_SPAWN.z]}>
      <LowPolyAvatar avatar={avatar} walking={isWalking} />
      <Html position={[0, 2.35, 0]} center zIndexRange={[10, 0]}>
        <span className="npc-label npc-label-player">Raka Demo</span>
      </Html>
    </group>
  );
}

function NpcGroup({ nearestNpcId }: { nearestNpcId: string | null }) {
  return (
    <>
      {npcs.map((npc) => {
        const isNear = nearestNpcId === npc.id;
        return (
          <group key={npc.id} position={npc.position}>
            <LowPolyAvatar avatar={NPC_AVATARS[npc.id]} active={isNear} />
            {isNear ? (
              <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.5, 0.62, 28]} />
                <meshBasicMaterial color="#7868F8" transparent opacity={0.75} />
              </mesh>
            ) : null}
            <Html position={[0, 2.35, 0]} center zIndexRange={[10, 0]}>
              <span className={`npc-label ${isNear ? "npc-label-active" : ""}`.trim()}>{npc.name}</span>
            </Html>
          </group>
        );
      })}
    </>
  );
}

export function MiniHomeScene({ avatar, movementEnabled, getDirection, nearestNpcId, onNearestNpc, frameloop }: MiniHomeSceneProps) {
  return (
    <Canvas
      className="world-canvas-inner"
      camera={{ position: [0, 5.6, 5.8], fov: 46 }}
      shadows
      dpr={[1, 1.75]}
      frameloop={frameloop}
    >
      <ambientLight intensity={0.7} />
      <hemisphereLight intensity={0.45} color="#FFFFFF" groundColor="#DFF2D7" />
      <directionalLight position={[4, 8, 5]} intensity={1.05} castShadow shadow-mapSize={[1024, 1024]} />
      <Floors />
      <Walls />
      <Fence />
      <LivingArea />
      <StudyArea />
      <GardenArea />
      <NpcGroup nearestNpcId={nearestNpcId} />
      <PlayerRig avatar={avatar} movementEnabled={movementEnabled} getDirection={getDirection} onNearestNpc={onNearestNpc} />
    </Canvas>
  );
}

export default MiniHomeScene;
