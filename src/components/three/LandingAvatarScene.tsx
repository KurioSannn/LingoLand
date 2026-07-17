import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { defaultAvatar } from "../../data/demoData";
import type { AvatarConfig } from "../../types";
import { LowPolyAvatar } from "./LowPolyAvatar";

export function LandingAvatarScene({
  avatar = defaultAvatar,
  className = "landing-avatar-3d",
  label = "Karakter 3D Lingoland",
  groundColor = "#F4C84A",
  walking = false,
}: {
  avatar?: AvatarConfig;
  className?: string;
  label?: string;
  groundColor?: string;
  walking?: boolean;
}) {
  return (
    <div className={className} role="img" aria-label={label}>
      <Canvas
        orthographic
        camera={{ position: [0, 1.05, 8], zoom: 105 }}
        dpr={[1, 1.5]}
        shadows
        fallback={<p>Karakter 3D membutuhkan WebGL.</p>}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.95} />
          <directionalLight position={[2.8, 4.2, 3.2]} intensity={1.45} castShadow />
          <spotLight position={[-2.8, 3.6, 2.2]} intensity={0.45} angle={0.55} penumbra={0.8} />
          <group rotation={[0, -0.18, 0]} position={[0, -2.5, 0]}>
            <LowPolyAvatar avatar={avatar} scale={2.65} active={!walking} walking={walking} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
              <circleGeometry args={[2.2, 40]} />
              <meshStandardMaterial color={groundColor} roughness={0.72} />
            </mesh>
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}
