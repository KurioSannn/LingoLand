import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh } from "three";
import { avatarOptions } from "../../data/demoData";
import type { AvatarConfig } from "../../types";

function colorFor(id: string | null): string {
  return avatarOptions.find((option) => option.id === id)?.color ?? "#7868F8";
}

export function LowPolyAvatar({
  avatar,
  position = [0, 0, 0],
  scale = 1,
  name,
  active = false,
  walking = false,
}: {
  avatar: AvatarConfig;
  position?: [number, number, number];
  scale?: number;
  name?: string;
  active?: boolean;
  walking?: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const leftArmRef = useRef<Mesh>(null);
  const rightArmRef = useRef<Mesh>(null);
  const leftLegRef = useRef<Mesh>(null);
  const rightLegRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const time = clock.elapsedTime;

    // Idle: napas pelan. Walking: bob lebih cepat + ayunan tangan/kaki.
    const bobSpeed = walking ? 9 : 2;
    const bobHeight = walking ? 0.045 : 0.025;
    groupRef.current.position.y = position[1] + Math.abs(Math.sin(time * bobSpeed)) * bobHeight;

    if (active && !walking) {
      groupRef.current.rotation.y = Math.sin(time) * 0.18;
    }

    const swing = walking ? Math.sin(time * 9) * 0.55 : 0;
    if (leftArmRef.current) leftArmRef.current.rotation.x = swing;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -swing;
    if (leftLegRef.current) leftLegRef.current.rotation.x = -swing * 0.8;
    if (rightLegRef.current) rightLegRef.current.rotation.x = swing * 0.8;
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color={colorFor(avatar.skinToneId)} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.76, -0.03]} castShadow>
        <boxGeometry args={[0.5, 0.22, 0.42]} />
        <meshStandardMaterial color={colorFor(avatar.hairId)} roughness={0.9} />
      </mesh>
      {avatar.accessoryId === "accessory-mini-home-cap" ? (
        <mesh position={[0, 1.96, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.28, 0.16, 16]} />
          <meshStandardMaterial color={colorFor(avatar.accessoryId)} roughness={0.8} />
        </mesh>
      ) : null}
      {avatar.accessoryId === "accessory-round-glasses" ? (
        <group position={[0, 1.58, 0.25]}>
          <mesh position={[-0.1, 0, 0]}>
            <torusGeometry args={[0.07, 0.01, 8, 18]} />
            <meshStandardMaterial color="#27262D" />
          </mesh>
          <mesh position={[0.1, 0, 0]}>
            <torusGeometry args={[0.07, 0.01, 8, 18]} />
            <meshStandardMaterial color="#27262D" />
          </mesh>
        </group>
      ) : null}
      <mesh position={[0, 1.02, 0]} castShadow>
        <boxGeometry args={[0.58, 0.78, 0.34]} />
        <meshStandardMaterial color={colorFor(avatar.topId)} roughness={0.85} />
      </mesh>
      <mesh ref={leftArmRef} position={[-0.38, 1.18, 0]} castShadow>
        <boxGeometry args={[0.14, 0.62, 0.18]} />
        <meshStandardMaterial color={colorFor(avatar.topId)} roughness={0.85} />
      </mesh>
      <mesh ref={rightArmRef} position={[0.38, 1.18, 0]} castShadow>
        <boxGeometry args={[0.14, 0.62, 0.18]} />
        <meshStandardMaterial color={colorFor(avatar.topId)} roughness={0.85} />
      </mesh>
      <mesh ref={leftLegRef} position={[-0.18, 0.43, 0]} castShadow>
        <boxGeometry args={[0.18, 0.65, 0.2]} />
        <meshStandardMaterial color={colorFor(avatar.bottomId)} roughness={0.85} />
      </mesh>
      <mesh ref={rightLegRef} position={[0.18, 0.43, 0]} castShadow>
        <boxGeometry args={[0.18, 0.65, 0.2]} />
        <meshStandardMaterial color={colorFor(avatar.bottomId)} roughness={0.85} />
      </mesh>
      <mesh position={[-0.18, 0.08, 0.08]} castShadow>
        <boxGeometry args={[0.24, 0.12, 0.32]} />
        <meshStandardMaterial color={colorFor(avatar.shoesId)} roughness={0.75} />
      </mesh>
      <mesh position={[0.18, 0.08, 0.08]} castShadow>
        <boxGeometry args={[0.24, 0.12, 0.32]} />
        <meshStandardMaterial color={colorFor(avatar.shoesId)} roughness={0.75} />
      </mesh>
      {name ? (
        <group position={[0, 2.18, 0]}>
          <mesh>
            <boxGeometry args={[1.05, 0.18, 0.04]} />
            <meshBasicMaterial color={active ? "#F4C84A" : "#FFFFFF"} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}
