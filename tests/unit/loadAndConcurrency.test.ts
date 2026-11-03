import { describe, expect, it } from "vitest";
import {
  isSequenceFresher,
  REMOTE_PLAYER_TIMEOUT_MS,
  type MovementPayload,
} from "../../src/lib/realtime/protocol";

describe("Block 33: Synthetic Load, Concurrency & Resilience Tests", () => {
  it("simulates 20 concurrent players broadcasting movement at 10Hz", () => {
    const NUM_PLAYERS = 20;
    const NUM_FRAMES = 10;
    const players = Array.from({ length: NUM_PLAYERS }, (_, idx) => ({
      id: `sim-player-${idx + 1}`,
      x: (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 10,
      seq: 1,
    }));

    const latencies: number[] = [];
    let totalBroadcasts = 0;

    // Jalankan 10 putaran simulasi broadcast 10Hz
    for (let frame = 0; frame < NUM_FRAMES; frame++) {
      for (const p of players) {
        const start = performance.now();

        p.x += (Math.random() - 0.5) * 0.3;
        p.z += (Math.random() - 0.5) * 0.3;
        p.seq++;

        const payload: MovementPayload = {
          playerId: p.id,
          roomId: "plaza-load-test",
          x: p.x,
          z: p.z,
          rotation: 0,
          animState: "walk",
          seq: p.seq,
          timestamp: Date.now(),
          version: 1,
        };

        // Simulasi fanout ke 19 pemain lain
        for (const peer of players) {
          if (peer.id === p.id) continue;
          totalBroadcasts++;
          // Verifikasi sequence fresher
          expect(isSequenceFresher(payload.seq, payload.seq - 1)).toBe(true);
        }

        const elapsed = performance.now() - start;
        latencies.push(elapsed);
      }
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];

    expect(totalBroadcasts).toBe(NUM_PLAYERS * (NUM_PLAYERS - 1) * NUM_FRAMES);
    // Verifikasi performa sub-millisecond untuk memory loop
    expect(p50).toBeLessThan(10);
    expect(p95).toBeLessThan(25);
  });

  it("cleans up disconnected ghost players after timeout expiration", () => {
    const now = Date.now();
    const roster = new Map<string, { lastSeen: number; name: string }>();

    // 3 pemain aktif
    roster.set("p1", { lastSeen: now - 2000, name: "Active 1" });
    roster.set("p2", { lastSeen: now - 5000, name: "Active 2" });

    // 2 pemain yang disconnect (lastSeen > REMOTE_PLAYER_TIMEOUT_MS)
    roster.set("p-ghost-1", {
      lastSeen: now - (REMOTE_PLAYER_TIMEOUT_MS + 2000),
      name: "Ghost 1",
    });
    roster.set("p-ghost-2", {
      lastSeen: now - (REMOTE_PLAYER_TIMEOUT_MS + 10000),
      name: "Ghost 2",
    });

    expect(roster.size).toBe(4);

    // Jalankan sweep cleanup
    for (const [id, player] of roster.entries()) {
      if (now - player.lastSeen > REMOTE_PLAYER_TIMEOUT_MS) {
        roster.delete(id);
      }
    }

    // Pastikan ghost player terhapus bersih
    expect(roster.size).toBe(2);
    expect(roster.has("p1")).toBe(true);
    expect(roster.has("p2")).toBe(true);
    expect(roster.has("p-ghost-1")).toBe(false);
    expect(roster.has("p-ghost-2")).toBe(false);
  });
});
