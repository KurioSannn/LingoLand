import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

/**
 * 1. Air mancur pusat (Central Fountain) dengan basin bertingkat & animasi semburan air halus.
 */
function CentralFountain() {
  const waterJetRef = useRef<Mesh>(null);
  const waterRippleRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (waterJetRef.current) {
      // Denyut halus semprotan air mancur
      waterJetRef.current.scale.y = 1 + Math.sin(t * 3.5) * 0.15;
      waterJetRef.current.position.y = 1.35 + Math.sin(t * 3.5) * 0.05;
    }
    if (waterRippleRef.current) {
      // Rotasi pelan riak air
      waterRippleRef.current.rotation.z = t * 0.2;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Kolam dasar batu bersegi 16 */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.0, 2.2, 0.44, 16]} />
        <meshStandardMaterial color="#B0ABA2" roughness={0.9} />
      </mesh>
      {/* Bibir kolam luar */}
      <mesh position={[0, 0.42, 0]}>
        <torusGeometry args={[1.98, 0.12, 8, 24]} />
        <meshStandardMaterial color="#C8C3BA" roughness={0.8} />
      </mesh>
      {/* Air kolam dasar */}
      <mesh
        ref={waterRippleRef}
        position={[0, 0.36, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[1.88, 24]} />
        <meshStandardMaterial
          color="#4EA8DE"
          roughness={0.1}
          metalness={0.1}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Pilar penyangga tengah */}
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.55, 0.7, 12]} />
        <meshStandardMaterial color="#9E988F" roughness={0.85} />
      </mesh>

      {/* Mangkuk tingkat kedua */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <cylinderGeometry args={[1.05, 0.35, 0.3, 16]} />
        <meshStandardMaterial color="#C8C3BA" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.95, 20]} />
        <meshStandardMaterial color="#56CFE1" roughness={0.1} transparent opacity={0.9} />
      </mesh>

      {/* Semburan air teratas */}
      <mesh ref={waterJetRef} position={[0, 1.35, 0]} castShadow>
        <coneGeometry args={[0.22, 0.65, 12]} />
        <meshStandardMaterial
          color="#72EFDD"
          transparent
          opacity={0.78}
          roughness={0.05}
        />
      </mesh>
    </group>
  );
}

/**
 * 2. Area Kafe Outdoor: Dek kayu, 3 meja kafe berpayung peneduh (parasol), kursi, dan counter.
 */
function CafeArea() {
  const parasolColors = ["#E76F51", "#2A9D8F", "#F4A261"];

  return (
    <group>
      {/* Lantai Dek Kayu */}
      <mesh position={[-7.5, 0.08, -0.5]} receiveShadow>
        <boxGeometry args={[4.8, 0.16, 9.4]} />
        <meshStandardMaterial color="#BD9468" roughness={0.8} />
      </mesh>

      {/* Counter Barista Kafe */}
      <group position={[-9.2, 0, -0.5]}>
        <mesh position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[1.1, 1.05, 5.5]} />
          <meshStandardMaterial color="#7D5836" roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.15, 0]} castShadow>
          <boxGeometry args={[1.25, 0.08, 5.7]} />
          <meshStandardMaterial color="#E9D8A6" roughness={0.7} />
        </mesh>
        {/* Kanopi Counter */}
        <mesh position={[0.2, 2.3, 0]} rotation={[0, 0, -0.15]} castShadow>
          <boxGeometry args={[1.8, 0.1, 5.7]} />
          <meshStandardMaterial color="#264653" roughness={0.6} />
        </mesh>
        {/* Tiang Kanopi */}
        <mesh position={[0.7, 1.6, -2.6]}>
          <cylinderGeometry args={[0.04, 0.04, 1.5, 8]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
        <mesh position={[0.7, 1.6, 2.6]}>
          <cylinderGeometry args={[0.04, 0.04, 1.5, 8]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      </group>

      {/* 3 Set Meja Kafe + Kursi + Payung */}
      {[-4.0, -0.5, 3.0].map((z, idx) => (
        <group key={`cafe-table-${z}`} position={[-6.5, 0.16, z]}>
          {/* Meja bundar */}
          <mesh position={[0, 0.65, 0]} castShadow>
            <cylinderGeometry args={[0.65, 0.65, 0.06, 16]} />
            <meshStandardMaterial color="#E9D8A6" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 0.64, 8]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
          {/* Cangkir kopi kecil */}
          <mesh position={[0.2, 0.72, 0.1]} castShadow>
            <cylinderGeometry args={[0.06, 0.05, 0.08, 8]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>

          {/* Payung peneduh (Parasol) */}
          <group position={[0, 0, 0]}>
            <mesh position={[0, 1.35, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 2.7, 8]} />
              <meshStandardMaterial color="#555555" />
            </mesh>
            <mesh position={[0, 2.45, 0]} castShadow>
              <coneGeometry args={[1.35, 0.55, 12]} />
              <meshStandardMaterial color={parasolColors[idx]} roughness={0.65} />
            </mesh>
          </group>

          {/* 2 Kursi santai berhadapan */}
          {[-0.85, 0.85].map((offZ, cIdx) => (
            <group key={`chair-${cIdx}`} position={[0, 0, offZ]}>
              <mesh position={[0, 0.38, 0]} castShadow>
                <boxGeometry args={[0.42, 0.06, 0.42]} />
                <meshStandardMaterial color="#D4A373" />
              </mesh>
              <mesh position={[0, 0.19, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 0.38, 6]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
              <mesh
                position={[0, 0.62, offZ > 0 ? 0.18 : -0.18]}
                castShadow
              >
                <boxGeometry args={[0.42, 0.45, 0.05]} />
                <meshStandardMaterial color="#D4A373" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

/**
 * 3. Papan Pengumuman Topik Harian (Topic Billboard) di sisi tenggara.
 */
function TopicBoard() {
  return (
    <group position={[4.5, 0, 6.5]} rotation={[0, -0.25, 0]}>
      {/* Tiang kayu penyangga */}
      <mesh position={[-1.1, 1.25, 0]} castShadow>
        <boxGeometry args={[0.16, 2.5, 0.16]} />
        <meshStandardMaterial color="#5C3D2E" roughness={0.85} />
      </mesh>
      <mesh position={[1.1, 1.25, 0]} castShadow>
        <boxGeometry args={[0.16, 2.5, 0.16]} />
        <meshStandardMaterial color="#5C3D2E" roughness={0.85} />
      </mesh>

      {/* Papan cork notice board */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[2.25, 1.25, 0.09]} />
        <meshStandardMaterial color="#C9A66B" roughness={0.9} />
      </mesh>

      {/* Atap peneduh papan */}
      <mesh position={[0, 2.22, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[2.55, 0.12, 0.65]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </mesh>

      {/* Kertas-kertas topik warna-warni */}
      <mesh position={[-0.6, 1.6, 0.06]}>
        <boxGeometry args={[0.45, 0.55, 0.02]} />
        <meshStandardMaterial color="#FEFAE0" />
      </mesh>
      <mesh position={[0.45, 1.55, 0.06]}>
        <boxGeometry args={[0.55, 0.45, 0.02]} />
        <meshStandardMaterial color="#FFD166" />
      </mesh>
      <mesh position={[-0.05, 1.35, 0.06]}>
        <boxGeometry args={[0.5, 0.35, 0.02]} />
        <meshStandardMaterial color="#06D6A0" />
      </mesh>
    </group>
  );
}

/**
 * 4. Duo Conversation Pergolas: 2 gazebo santai untuk latihan percakapan berdua.
 */
function DuoPergolas() {
  return (
    <group>
      {[-3.5, 3.5].map((pergolaZ) => (
        <group key={`pergola-${pergolaZ}`} position={[7.5, 0, pergolaZ]}>
          {/* Dek batu santai */}
          <mesh position={[0, 0.06, 0]} receiveShadow>
            <cylinderGeometry args={[1.7, 1.8, 0.12, 8]} />
            <meshStandardMaterial color="#D8D2C6" roughness={0.85} />
          </mesh>

          {/* 4 Tiang Pergola */}
          {[
            [-1.1, -1.1],
            [1.1, -1.1],
            [-1.1, 1.1],
            [1.1, 1.1],
          ].map(([px, pz], pIdx) => (
            <mesh key={`post-${pIdx}`} position={[px, 1.2, pz]} castShadow>
              <cylinderGeometry args={[0.07, 0.08, 2.4, 8]} />
              <meshStandardMaterial color="#6B4226" roughness={0.8} />
            </mesh>
          ))}

          {/* Rangka atap kayu kisi-kisi */}
          <group position={[0, 2.4, 0]}>
            {[-0.9, -0.45, 0, 0.45, 0.9].map((slatX) => (
              <mesh key={`slat-${slatX}`} position={[slatX, 0, 0]} castShadow>
                <boxGeometry args={[0.07, 0.1, 2.5]} />
                <meshStandardMaterial color="#8C5331" />
              </mesh>
            ))}
            {/* Tanaman rambat hijau di atap */}
            <mesh position={[0, 0.08, 0]}>
              <boxGeometry args={[2.2, 0.14, 2.2]} />
              <meshStandardMaterial color="#40916C" roughness={0.9} />
            </mesh>
          </group>

          {/* 2 Bangku saling berhadapan */}
          {[-0.75, 0.75].map((benchZ, bIdx) => (
            <group key={`pbench-${bIdx}`} position={[0, 0.12, benchZ]}>
              <mesh position={[0, 0.28, 0]} castShadow>
                <boxGeometry args={[1.35, 0.08, 0.44]} />
                <meshStandardMaterial color="#C89666" />
              </mesh>
              <mesh position={[-0.55, 0.14, 0]}>
                <boxGeometry args={[0.1, 0.28, 0.38]} />
                <meshStandardMaterial color="#4A4E69" />
              </mesh>
              <mesh position={[0.55, 0.14, 0]}>
                <boxGeometry args={[0.1, 0.28, 0.38]} />
                <meshStandardMaterial color="#4A4E69" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

/**
 * 5. Bangku Taman Klasik di sekitar jalur plaza.
 */
function ParkBenches() {
  const benchPositions: [number, number, number, number][] = [
    [-3.5, 0, -5.0, 0],
    [3.5, 0, -5.0, 0],
    [-3.5, 0, 5.0, Math.PI],
  ];

  return (
    <group>
      {benchPositions.map(([x, y, z, rot], idx) => (
        <group key={`bench-${idx}`} position={[x, y, z]} rotation={[0, rot, 0]}>
          {/* Alas duduk kayu */}
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[1.5, 0.08, 0.48]} />
            <meshStandardMaterial color="#8B5E34" roughness={0.75} />
          </mesh>
          {/* Sandaran */}
          <mesh position={[0, 0.65, -0.2]} castShadow>
            <boxGeometry args={[1.5, 0.45, 0.06]} />
            <meshStandardMaterial color="#8B5E34" roughness={0.75} />
          </mesh>
          {/* Kaki besi */}
          <mesh position={[-0.65, 0.15, 0]}>
            <boxGeometry args={[0.08, 0.3, 0.42]} />
            <meshStandardMaterial color="#222222" metalness={0.5} />
          </mesh>
          <mesh position={[0.65, 0.15, 0]}>
            <boxGeometry args={[0.08, 0.3, 0.42]} />
            <meshStandardMaterial color="#222222" metalness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * 6. Tiang Lampu Taman Klasik dengan lentera bercahaya hangat.
 */
function StreetLamps() {
  const lampPositions = [
    [-2.6, -2.6],
    [2.6, -2.6],
    [-2.6, 2.6],
    [2.6, 2.6],
  ];

  return (
    <group>
      {lampPositions.map(([lx, lz], idx) => (
        <group key={`lamp-${idx}`} position={[lx, 0, lz]}>
          {/* Tiang logam */}
          <mesh position={[0, 1.25, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.08, 2.5, 8]} />
            <meshStandardMaterial color="#2B2D42" metalness={0.7} roughness={0.4} />
          </mesh>
          {/* Rumah lentera */}
          <mesh position={[0, 2.6, 0]} castShadow>
            <octahedronGeometry args={[0.22, 0]} />
            <meshStandardMaterial
              color="#FFE380"
              emissive="#FFD166"
              emissiveIntensity={0.8}
            />
          </mesh>
          {/* Cahaya hangat lembut */}
          <pointLight
            position={[0, 2.55, 0]}
            color="#FFD166"
            intensity={0.65}
            distance={5.5}
            decay={2}
          />
        </group>
      ))}
    </group>
  );
}

/**
 * 7. Alam & Penghijauan: Pohon low-poly, kotak tanaman bunga, dan pagar tanaman pembatas (hedges).
 */
function NatureAndBoundaries() {
  const treePositions = [
    [-3.8, -8.8],
    [3.8, -8.8],
    [-9.0, 7.5],
    [9.0, 8.5],
    [-11.5, -9.5],
    [11.5, -9.5],
    [11.5, 0.5],
  ];

  return (
    <group>
      {/* Pohon-pohon rindang berdaun faceted */}
      {treePositions.map(([tx, tz], idx) => (
        <group key={`tree-${idx}`} position={[tx, 0, tz]}>
          {/* Batang pohon */}
          <mesh position={[0, 1.1, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.32, 2.2, 8]} />
            <meshStandardMaterial color="#583115" roughness={0.9} />
          </mesh>
          {/* Mahkota daun bertingkat */}
          <mesh position={[0, 2.4, 0]} castShadow>
            <dodecahedronGeometry args={[1.1, 0]} />
            <meshStandardMaterial color="#2D6A4F" roughness={0.85} />
          </mesh>
          <mesh position={[0.25, 3.1, -0.1]} castShadow>
            <dodecahedronGeometry args={[0.85, 0]} />
            <meshStandardMaterial color="#40916C" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Kotak bunga (Flower planters) */}
      {[
        [-2.0, 6.2],
        [2.0, 6.2],
        [-2.0, -6.2],
        [2.0, -6.2],
      ].map(([fx, fz], idx) => (
        <group key={`flower-${idx}`} position={[fx, 0, fz]}>
          <mesh position={[0, 0.18, 0]} castShadow>
            <boxGeometry args={[1.2, 0.36, 0.45]} />
            <meshStandardMaterial color="#D4A373" />
          </mesh>
          {/* Bunga aneka warna */}
          {[-0.35, 0, 0.35].map((bx, bIdx) => (
            <mesh key={`blossom-${bIdx}`} position={[bx, 0.42, 0]}>
              <sphereGeometry args={[0.09, 8, 8]} />
              <meshStandardMaterial
                color={bIdx === 0 ? "#F28482" : bIdx === 1 ? "#F6BD60" : "#84A59D"}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Pagar tanaman hidup pembatas plaza luar (Hedge walls) */}
      {/* Batas Utara */}
      <mesh position={[0, 0.8, -13.2]} castShadow receiveShadow>
        <boxGeometry args={[26.4, 1.6, 0.8]} />
        <meshStandardMaterial color="#2B5A34" roughness={0.9} />
      </mesh>
      {/* Batas Barat */}
      <mesh position={[-13.2, 0.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 1.6, 26.4]} />
        <meshStandardMaterial color="#2B5A34" roughness={0.9} />
      </mesh>
      {/* Batas Timur */}
      <mesh position={[13.2, 0.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 1.6, 26.4]} />
        <meshStandardMaterial color="#2B5A34" roughness={0.9} />
      </mesh>
      {/* Batas Selatan dengan celah gerbang masuk di tengah */}
      <mesh position={[-7.4, 0.8, 13.2]} castShadow receiveShadow>
        <boxGeometry args={[11.6, 1.6, 0.8]} />
        <meshStandardMaterial color="#2B5A34" roughness={0.9} />
      </mesh>
      <mesh position={[7.4, 0.8, 13.2]} castShadow receiveShadow>
        <boxGeometry args={[11.6, 1.6, 0.8]} />
        <meshStandardMaterial color="#2B5A34" roughness={0.9} />
      </mesh>
    </group>
  );
}

/**
 * 8. Lantai Dasar: Rumput hijau, ubin batu bundar pusat, dan jalur setapak radial.
 */
function PlazaGround() {
  return (
    <group>
      {/* Hamparan Rumput Hijau */}
      <mesh receiveShadow position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[27, 27]} />
        <meshStandardMaterial color="#7CB568" roughness={0.95} />
      </mesh>

      {/* Plaza Bundar Pusat (Paving Stone) */}
      <mesh receiveShadow position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.8, 32]} />
        <meshStandardMaterial color="#ECE6D8" roughness={0.8} />
      </mesh>
      {/* Cincin dekorasi ubin luar */}
      <mesh receiveShadow position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.2, 4.6, 32]} />
        <meshStandardMaterial color="#D1C7B7" roughness={0.75} />
      </mesh>

      {/* Jalur setapak paving radial ke 4 arah gerbang */}
      {/* Jalur Selatan (Spawn Promenade) */}
      <mesh receiveShadow position={[0, 0.012, 8.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 8.5]} />
        <meshStandardMaterial color="#E3DDD1" roughness={0.85} />
      </mesh>
      {/* Jalur Utara */}
      <mesh receiveShadow position={[0, 0.012, -8.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 8.5]} />
        <meshStandardMaterial color="#E3DDD1" roughness={0.85} />
      </mesh>
      {/* Jalur Timur */}
      <mesh receiveShadow position={[8.5, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8.5, 2.8]} />
        <meshStandardMaterial color="#E3DDD1" roughness={0.85} />
      </mesh>
    </group>
  );
}

/**
 * Lingkungan 3D Lengkap Social Plaza.
 */
export function PlazaEnvironment() {
  return (
    <group>
      <PlazaGround />
      <CentralFountain />
      <CafeArea />
      <TopicBoard />
      <DuoPergolas />
      <ParkBenches />
      <StreetLamps />
      <NatureAndBoundaries />
    </group>
  );
}
