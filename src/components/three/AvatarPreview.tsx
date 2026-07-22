import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import { LowPolyAvatar } from "./LowPolyAvatar";
import type { AvatarConfig } from "../../types";

export function AvatarPreview({ avatar, talking = false }: { avatar: AvatarConfig; talking?: boolean }) {
  return (
    <div className="avatar-canvas" role="img" aria-label="Preview avatar 3D">
      <Canvas camera={{ position: [0, 1.55, 3.6], fov: 42 }} shadows fallback={<p>Preview avatar membutuhkan WebGL.</p>}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 4, 2]} intensity={1.2} castShadow />
          <LowPolyAvatar avatar={avatar} position={[0, 0, 0]} scale={1.15} active talking={talking} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
            <circleGeometry args={[1.5, 32]} />
            <meshStandardMaterial color="#F3F1FF" />
          </mesh>
          <OrbitControls enablePan={false} target={[0, 1.1, 0]} minDistance={2.5} maxDistance={5} maxPolarAngle={Math.PI / 2.05} />
        </Suspense>
      </Canvas>
    </div>
  );
}
