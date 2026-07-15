import { npcs } from "../data/demoData";
import type { AvatarConfig, NpcCharacter } from "../types";

export interface PlayerPosition {
  x: number;
  z: number;
}

export interface BoxCollider {
  x: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
}

/** Batas ruang gerak: dinding dan pagar mengelilingi area ini. */
export const ROOM_BOUND = 3.55;

/** Jarak maksimum agar interaction prompt muncul. */
export const INTERACTION_RADIUS = 1.6;

export const PLAYER_SPEED = 3.1;

export const PLAYER_SPAWN: PlayerPosition = { x: 0, z: 0.4 };

const PLAYER_RADIUS = 0.32;

/** Collider furniture penting — disinkronkan dengan penempatan mesh di MiniHomeScene. */
export const FURNITURE_COLLIDERS: BoxCollider[] = [
  { x: -3.2, z: -3.0, halfWidth: 0.95, halfDepth: 0.45 }, // sofa ruang tamu
  { x: -1.9, z: -2.0, halfWidth: 0.5, halfDepth: 0.35 }, // meja kecil
  { x: -3.75, z: -0.7, halfWidth: 0.3, halfDepth: 0.75 }, // rak buku
  { x: -1.15, z: -3.45, halfWidth: 0.22, halfDepth: 0.22 }, // lampu
  { x: 2.9, z: -3.15, halfWidth: 0.8, halfDepth: 0.4 }, // meja belajar
  { x: 3.45, z: -2.35, halfWidth: 0.28, halfDepth: 0.28 }, // kursi belajar
  { x: 3.7, z: -1.5, halfWidth: 0.25, halfDepth: 0.25 }, // tanaman kecil
  { x: 3.25, z: 3.05, halfWidth: 0.68, halfDepth: 0.3 }, // bangku taman
  { x: 1.35, z: 3.15, halfWidth: 0.32, halfDepth: 0.32 }, // pohon
  ...npcs.map((npc) => ({ x: npc.position[0], z: npc.position[2], halfWidth: 0.34, halfDepth: 0.34 })),
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function collides(x: number, z: number): boolean {
  return FURNITURE_COLLIDERS.some(
    (box) =>
      Math.abs(x - box.x) < box.halfWidth + PLAYER_RADIUS &&
      Math.abs(z - box.z) < box.halfDepth + PLAYER_RADIUS,
  );
}

/**
 * Geser player dengan boundary + collision AABB sederhana.
 * Sumbu X dan Z dicoba terpisah supaya karakter bisa menyusuri tepi furniture.
 */
export function resolveMovement(current: PlayerPosition, deltaX: number, deltaZ: number): PlayerPosition {
  const next = { ...current };

  const candidateX = clamp(current.x + deltaX, -ROOM_BOUND, ROOM_BOUND);
  if (!collides(candidateX, next.z)) next.x = candidateX;

  const candidateZ = clamp(current.z + deltaZ, -ROOM_BOUND, ROOM_BOUND);
  if (!collides(next.x, candidateZ)) next.z = candidateZ;

  return next;
}

export function findNearestNpc(player: PlayerPosition): NpcCharacter | null {
  let nearest: NpcCharacter | null = null;
  let nearestDistance = Infinity;

  for (const npc of npcs) {
    const dist = Math.hypot(player.x - npc.position[0], player.z - npc.position[2]);
    if (dist < nearestDistance) {
      nearest = npc;
      nearestDistance = dist;
    }
  }

  return nearestDistance <= INTERACTION_RADIUS ? nearest : null;
}

export function isWebglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Penampilan tiap NPC di dalam room. */
export const NPC_AVATARS: Record<string, AvatarConfig> = {
  bintang: {
    skinToneId: "skin-medium",
    hairId: "hair-short-black",
    topId: "top-hoodie-lavender",
    bottomId: "bottom-dark-pants",
    shoesId: "shoes-white",
    accessoryId: "accessory-mini-home-cap",
  },
  lala: {
    skinToneId: "skin-light",
    hairId: "hair-bob-brown",
    topId: "top-basic-tee",
    bottomId: "bottom-casual-skirt",
    shoesId: "shoes-white",
    accessoryId: null,
  },
  benny: {
    skinToneId: "skin-tan",
    hairId: "hair-curly-dark",
    topId: "top-varsity",
    bottomId: "bottom-blue-jeans",
    shoesId: "shoes-black",
    accessoryId: "accessory-round-glasses",
  },
};
