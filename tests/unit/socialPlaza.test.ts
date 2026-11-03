import { describe, expect, it } from "vitest";
import type { RemotePlayerState } from "../../src/hooks/useMultiplayerRoom";
import {
  PLAZA_BOUND,
  PLAZA_COLLIDERS,
  PLAZA_INTERACTION_RADIUS,
  PLAZA_SPAWN,
  PLAZA_TOPICS,
  TOPIC_BOARD_POSITION,
  findNearestRemotePlayer,
  isNearTopicBoard,
  resolvePlazaMovement,
} from "../../src/lib/plazaWorld";

describe("Social Plaza World Mechanics", () => {
  it("initializes spawn point within boundaries and free from colliders", () => {
    expect(Math.abs(PLAZA_SPAWN.x)).toBeLessThan(PLAZA_BOUND);
    expect(Math.abs(PLAZA_SPAWN.z)).toBeLessThan(PLAZA_BOUND);

    // Verifikasi spawn point tidak bertabrakan dengan collider manapun
    const moved = resolvePlazaMovement(PLAZA_SPAWN, 0, 0);
    expect(moved.x).toBe(PLAZA_SPAWN.x);
    expect(moved.z).toBe(PLAZA_SPAWN.z);
  });

  it("clamps movement within outer plaza boundaries", () => {
    const nearEdge = { x: 12.9, z: 0 };
    const overEdge = resolvePlazaMovement(nearEdge, 5.0, 0);
    expect(overEdge.x).toBe(PLAZA_BOUND);

    const overWest = resolvePlazaMovement({ x: -12.9, z: 0 }, -5.0, 0);
    expect(overWest.x).toBe(-PLAZA_BOUND);

    const overNorth = resolvePlazaMovement({ x: 0, z: -12.9 }, 0, -5.0);
    expect(overNorth.z).toBe(-PLAZA_BOUND);

    const overSouth = resolvePlazaMovement({ x: 0, z: 12.9 }, 0, 5.0);
    expect(overSouth.z).toBe(PLAZA_BOUND);
  });

  it("blocks movement colliding with the central fountain", () => {
    // Air mancur berada di (0, 0) dengan halfWidth 1.85
    // Pemain mendekati dari selatan (0, 3.0) mencoba berjalan ke (0, 0)
    const start = { x: 0, z: 2.8 };
    const stepNorth = resolvePlazaMovement(start, 0, -1.5);

    // Langkah harus tertahan di depan collider air mancur
    expect(stepNorth.z).toBeGreaterThan(1.85);
  });

  it("allows sliding along obstacles when moving diagonally", () => {
    // Berjalan menyusuri sisi timur air mancur: X bebas, Z terhalang
    const start = { x: 3.5, z: 0.5 };
    const step = resolvePlazaMovement(start, -0.2, 1.0);

    // Sumbu Z tetap bergerak bebas meski ada rintangan di sisi kiri X
    expect(step.z).toBeCloseTo(1.5, 2);
  });

  it("detects when player is near the topic billboard", () => {
    // Tepat di depan papan topik
    const nearBoard = {
      x: TOPIC_BOARD_POSITION.x,
      z: TOPIC_BOARD_POSITION.z + 1.0,
    };
    expect(isNearTopicBoard(nearBoard)).toBe(true);

    // Di area spawn (jauh dari papan topik)
    expect(isNearTopicBoard(PLAZA_SPAWN)).toBe(false);
  });

  it("finds the nearest remote player within interaction radius", () => {
    const myPos = { x: 0, z: 0 };
    const remoteMap = new Map<string, RemotePlayerState>();

    // Kasus 1: Belum ada pemain remote
    expect(findNearestRemotePlayer(myPos, remoteMap)).toBeNull();

    // Kasus 2: Pemain remote terlalu jauh (> 2.4)
    remoteMap.set("p-far", {
      presence: {
        playerId: "p-far",
        name: "Far Player",
        username: "far_player",
        level: 2,
        avatar: {
          skinToneId: "skin-medium",
          hairId: "hair-short-black",
          topId: "top-hoodie-lavender",
          bottomId: "bottom-dark-pants",
          shoesId: "shoes-white",
          accessoryId: null,
        },
        joinedAt: Date.now(),
      },
      currentPosition: {
        playerId: "p-far",
        roomId: "room-1",
        x: 6.0,
        z: 6.0,
        rotation: 0,
        animState: "idle",
        seq: 1,
        timestamp: Date.now(),
        version: 1,
      },
      lastSeen: Date.now(),
    });
    expect(findNearestRemotePlayer(myPos, remoteMap)).toBeNull();

    // Kasus 3: Pemain remote dalam radius dekat (1.2)
    remoteMap.set("p-near", {
      presence: {
        playerId: "p-near",
        name: "Near Player",
        username: "near_player",
        level: 3,
        avatar: {
          skinToneId: "skin-light",
          hairId: "hair-bob-brown",
          topId: "top-basic-tee",
          bottomId: "bottom-casual-skirt",
          shoesId: "shoes-white",
          accessoryId: null,
        },
        joinedAt: Date.now(),
      },
      currentPosition: {
        playerId: "p-near",
        roomId: "room-1",
        x: 0.8,
        z: 0.8,
        rotation: 0,
        animState: "idle",
        seq: 2,
        timestamp: Date.now(),
        version: 1,
      },
      lastSeen: Date.now(),
    });

    const nearest = findNearestRemotePlayer(myPos, remoteMap);
    expect(nearest).not.toBeNull();
    expect(nearest?.presence.playerId).toBe("p-near");
  });

  it("verifies plaza conversation topics have starter phrases in EN and ID", () => {
    expect(PLAZA_TOPICS.length).toBeGreaterThan(0);
    for (const topic of PLAZA_TOPICS) {
      expect(topic.id).toBeTruthy();
      expect(topic.title).toBeTruthy();
      expect(topic.starterEn).toBeTruthy();
      expect(topic.starterId).toBeTruthy();
      expect(topic.category).toBeTruthy();
    }
  });

  it("has valid colliders configured for all plaza areas", () => {
    expect(PLAZA_COLLIDERS.length).toBeGreaterThanOrEqual(10);
    for (const c of PLAZA_COLLIDERS) {
      expect(c.halfWidth).toBeGreaterThan(0);
      expect(c.halfDepth).toBeGreaterThan(0);
      expect(Math.abs(c.x)).toBeLessThanOrEqual(PLAZA_BOUND);
      expect(Math.abs(c.z)).toBeLessThanOrEqual(PLAZA_BOUND);
    }
  });
});
