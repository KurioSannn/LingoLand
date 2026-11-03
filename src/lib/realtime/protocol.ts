import type { AvatarConfig } from "../../types";

export const PROTOCOL_VERSION = 1;

/** Throttle pembaruan posisi per pemain: 10 update per detik (100ms) */
export const MOVEMENT_RATE_LIMIT_MS = 100;

/** Jarak lompatan maksimum yang diizinkan per paket movement (teleport clamp) */
export const MAX_TELEPORT_DISTANCE = 4.0;

/** Batas koordinat absolut dunia 3D untuk mencegah injeksi koordinat ekstrem */
export const MAX_WORLD_COORDINATE = 50.0;

/** Interval detak jantung (heartbeat) room */
export const HEARTBEAT_INTERVAL_MS = 15000;

/** Timeout pembersihan pemain remote jika tidak ada paket gerakan */
export const REMOTE_PLAYER_TIMEOUT_MS = 8000;

export interface MovementPayload {
  playerId: string;
  roomId: string;
  x: number;
  z: number;
  rotation: number;
  animState: "idle" | "walk";
  seq: number;
  timestamp: number;
  version: number;
}

export interface PlayerPresence {
  playerId: string;
  name: string;
  username: string;
  avatar: AvatarConfig;
  level: number;
  customStatus?: string;
  joinedAt: number;
}

export function isValidMovementPayload(
  payload: unknown,
  expectedRoomId?: string,
): payload is MovementPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Partial<MovementPayload>;

  if (
    typeof p.playerId !== "string" ||
    p.playerId.trim().length === 0 ||
    typeof p.roomId !== "string" ||
    p.roomId.trim().length === 0
  ) {
    return false;
  }

  if (expectedRoomId && p.roomId !== expectedRoomId) {
    return false;
  }

  return (
    typeof p.x === "number" &&
    Number.isFinite(p.x) &&
    Math.abs(p.x) <= MAX_WORLD_COORDINATE &&
    typeof p.z === "number" &&
    Number.isFinite(p.z) &&
    Math.abs(p.z) <= MAX_WORLD_COORDINATE &&
    typeof p.rotation === "number" &&
    Number.isFinite(p.rotation) &&
    (p.animState === "idle" || p.animState === "walk") &&
    typeof p.seq === "number" &&
    Number.isFinite(p.seq) &&
    p.seq >= 1 &&
    typeof p.timestamp === "number" &&
    Number.isFinite(p.timestamp) &&
    p.version === PROTOCOL_VERSION
  );
}

/**
 * Batasi perpindahan posisi agar pemain tidak bisa berpindah seketika melampaui
 * batas wajar kecepatan lari (teleport clamp / anti-speedhack).
 */
export function clampMovement(
  current: { x: number; z: number },
  target: { x: number; z: number },
  maxDistance = MAX_TELEPORT_DISTANCE,
): { x: number; z: number } {
  const dx = target.x - current.x;
  const dz = target.z - current.z;
  const distance = Math.hypot(dx, dz);

  if (distance <= maxDistance) {
    return target;
  }

  const ratio = maxDistance / distance;
  return {
    x: current.x + dx * ratio,
    z: current.z + dz * ratio,
  };
}

/**
 * Evaluasi nomor urut paket (sequence number).
 * Abaikan paket yang datang terlambat (stale / out-of-order packet).
 */
export function isSequenceFresher(newSeq: number, lastSeq: number): boolean {
  if (lastSeq === 0) return true;
  return newSeq > lastSeq;
}
