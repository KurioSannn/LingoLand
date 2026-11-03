import type { RemotePlayerState } from "../hooks/useMultiplayerRoom";
import type { BoxCollider, PlayerPosition } from "./world";

/** Batas area luar Social Plaza: pagar tanaman mengelilingi batas ini. */
export const PLAZA_BOUND = 13.0;

/** Kecepatan jalan default di Social Plaza. */
export const PLAZA_SPEED = 3.6;

/** Titik awal spawn pemain di area selatan plaza. */
export const PLAZA_SPAWN: PlayerPosition = { x: 0, z: 9.5 };

/** Radius interaksi antar pemain di plaza. */
export const PLAZA_INTERACTION_RADIUS = 2.4;

/** Koordinat papan pengumuman topik harian. */
export const TOPIC_BOARD_POSITION: PlayerPosition = { x: 4.5, z: 6.5 };
export const TOPIC_BOARD_RADIUS = 2.2;

const PLAYER_RADIUS = 0.35;

/**
 * Collider rintangan fisik di Social Plaza (air mancur, cafe, papan topik, gazebo, bangku, pohon, lampu).
 */
export const PLAZA_COLLIDERS: BoxCollider[] = [
  // 1. Air mancur pusat (Central Fountain)
  { x: 0, z: 0, halfWidth: 1.85, halfDepth: 1.85 },

  // 2. Area Kafe (Lounge & Meja)
  { x: -9.5, z: -0.5, halfWidth: 0.9, halfDepth: 3.2 }, // Barista Counter
  { x: -6.5, z: -4.0, halfWidth: 0.9, halfDepth: 0.9 }, // Meja Kafe 1
  { x: -6.5, z: -0.5, halfWidth: 0.9, halfDepth: 0.9 }, // Meja Kafe 2
  { x: -6.5, z: 3.0, halfWidth: 0.9, halfDepth: 0.9 }, // Meja Kafe 3

  // 3. Papan Topik Pembelajaran (Topic Billboard)
  { x: 4.5, z: 6.5, halfWidth: 1.3, halfDepth: 0.45 },

  // 4. Area Duo Conversation Pergolas (Gazebo)
  { x: 7.5, z: -3.5, halfWidth: 1.6, halfDepth: 1.6 }, // Pergola A
  { x: 7.5, z: 3.5, halfWidth: 1.6, halfDepth: 1.6 }, // Pergola B

  // 5. Bangku Taman (Park Benches)
  { x: -3.5, z: -5.0, halfWidth: 0.95, halfDepth: 0.45 },
  { x: 3.5, z: -5.0, halfWidth: 0.95, halfDepth: 0.45 },
  { x: -3.5, z: 5.0, halfWidth: 0.95, halfDepth: 0.45 },

  // 6. Pohon Hias
  { x: -3.8, z: -8.8, halfWidth: 0.5, halfDepth: 0.5 },
  { x: 3.8, z: -8.8, halfWidth: 0.5, halfDepth: 0.5 },
  { x: -9.0, z: 7.5, halfWidth: 0.5, halfDepth: 0.5 },
  { x: 9.0, z: 8.5, halfWidth: 0.5, halfDepth: 0.5 },

  // 7. Lentera Taman (Street Lamps)
  { x: -2.6, z: -2.6, halfWidth: 0.28, halfDepth: 0.28 },
  { x: 2.6, z: -2.6, halfWidth: 0.28, halfDepth: 0.28 },
  { x: -2.6, z: 2.6, halfWidth: 0.28, halfDepth: 0.28 },
  { x: 2.6, z: 2.6, halfWidth: 0.28, halfDepth: 0.28 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function collides(x: number, z: number): boolean {
  return PLAZA_COLLIDERS.some(
    (box) =>
      Math.abs(x - box.x) < box.halfWidth + PLAYER_RADIUS &&
      Math.abs(z - box.z) < box.halfDepth + PLAYER_RADIUS,
  );
}

/**
 * Menggerakkan pemain di area Social Plaza dengan boundary box dan rintangan fisik AABB.
 * Sumbu X dan Z diuji terpisah agar pemain dapat meluncur menyusuri tepi rintangan.
 */
export function resolvePlazaMovement(
  current: PlayerPosition,
  deltaX: number,
  deltaZ: number,
): PlayerPosition {
  const next = { ...current };

  const candidateX = clamp(current.x + deltaX, -PLAZA_BOUND, PLAZA_BOUND);
  if (!collides(candidateX, next.z)) {
    next.x = candidateX;
  }

  const candidateZ = clamp(current.z + deltaZ, -PLAZA_BOUND, PLAZA_BOUND);
  if (!collides(next.x, candidateZ)) {
    next.z = candidateZ;
  }

  return next;
}

/**
 * Mencari remote player terdekat dari pemain lokal dalam radius interaksi.
 */
export function findNearestRemotePlayer(
  myPosition: PlayerPosition,
  remotePlayers: Map<string, RemotePlayerState>,
): RemotePlayerState | null {
  let nearest: RemotePlayerState | null = null;
  let nearestDist = Infinity;

  for (const player of remotePlayers.values()) {
    const px = player.currentPosition?.x ?? 0;
    const pz = player.currentPosition?.z ?? 0;
    const dist = Math.hypot(myPosition.x - px, myPosition.z - pz);

    if (dist < nearestDist) {
      nearest = player;
      nearestDist = dist;
    }
  }

  return nearestDist <= PLAZA_INTERACTION_RADIUS ? nearest : null;
}

/**
 * Mendeteksi apakah pemain berada di dekat papan pengumuman topik harian.
 */
export function isNearTopicBoard(player: PlayerPosition): boolean {
  const dist = Math.hypot(
    player.x - TOPIC_BOARD_POSITION.x,
    player.z - TOPIC_BOARD_POSITION.z,
  );
  return dist <= TOPIC_BOARD_RADIUS;
}

/**
 * Topik obrolan harian untuk latihan percakapan santai sesama pemain.
 */
export interface ConversationTopic {
  id: string;
  title: string;
  starterEn: string;
  starterId: string;
  category: "Ice Breaker" | "Daily Life" | "Culture" | "Hobbies";
}

export const PLAZA_TOPICS: ConversationTopic[] = [
  {
    id: "topic-1",
    title: "Weekend Plans & Relaxing",
    starterEn: "What is your favorite way to spend a quiet Sunday afternoon?",
    starterId: "Bagaimana caramu menikmati sore akhir pekan yang tenang?",
    category: "Daily Life",
  },
  {
    id: "topic-2",
    title: "Favorite Local Dishes",
    starterEn: "If you could only eat one meal for the rest of your life, what would it be?",
    starterId: "Jika kamu hanya boleh makan satu menu selamanya, makanan apa yang kamu pilih?",
    category: "Culture",
  },
  {
    id: "topic-3",
    title: "Language Learning Goals",
    starterEn: "Why did you start learning English, and what is your dream travel destination?",
    starterId: "Kenapa kamu mulai belajar Bahasa Inggris, dan negara impian mana yang ingin kamu kunjungi?",
    category: "Ice Breaker",
  },
  {
    id: "topic-4",
    title: "Music & Movies",
    starterEn: "What kind of music helps you stay focused while studying or working?",
    starterId: "Genre musik apa yang paling membantumu fokus saat belajar atau bekerja?",
    category: "Hobbies",
  },
];
