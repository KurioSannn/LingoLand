import { describe, expect, it } from "vitest";
import {
  clampMovement,
  isSequenceFresher,
  isValidMovementPayload,
  MAX_TELEPORT_DISTANCE,
  PROTOCOL_VERSION,
} from "../../src/lib/realtime/protocol";

describe("roomProtocol", () => {
  describe("isValidMovementPayload", () => {
    it("accepts valid movement payload matching protocol schema", () => {
      const valid = {
        playerId: "user-123",
        roomId: "plaza-lobby-1",
        x: 1.5,
        z: -2.3,
        rotation: 0.78,
        animState: "walk",
        seq: 42,
        timestamp: Date.now(),
        version: PROTOCOL_VERSION,
      };

      expect(isValidMovementPayload(valid)).toBe(true);
    });

    it("rejects payload with invalid animState or version mismatch", () => {
      expect(
        isValidMovementPayload({
          playerId: "user-123",
          roomId: "plaza-lobby-1",
          x: 1.5,
          z: -2.3,
          rotation: 0.78,
          animState: "flying", // Invalid
          seq: 42,
          timestamp: Date.now(),
          version: PROTOCOL_VERSION,
        }),
      ).toBe(false);

      expect(
        isValidMovementPayload({
          playerId: "user-123",
          roomId: "plaza-lobby-1",
          x: 1.5,
          z: -2.3,
          rotation: 0.78,
          animState: "idle",
          seq: 42,
          timestamp: Date.now(),
          version: 999, // Version mismatch
        }),
      ).toBe(false);
    });

    it("rejects NaN or null coordinates", () => {
      expect(
        isValidMovementPayload({
          playerId: "user-123",
          roomId: "plaza-lobby-1",
          x: NaN,
          z: -2.3,
          rotation: 0,
          animState: "idle",
          seq: 1,
          timestamp: Date.now(),
          version: PROTOCOL_VERSION,
        }),
      ).toBe(false);
    });
  });

  describe("clampMovement", () => {
    it("allows movement within MAX_TELEPORT_DISTANCE without altering target", () => {
      const current = { x: 0, z: 0 };
      const target = { x: 1.0, z: 1.0 }; // Distance sqrt(2) ≈ 1.414 < 4.0

      const result = clampMovement(current, target);
      expect(result.x).toBeCloseTo(1.0);
      expect(result.z).toBeCloseTo(1.0);
    });

    it("clamps excessive teleport jumps to maximum allowed distance", () => {
      const current = { x: 0, z: 0 };
      const target = { x: 100.0, z: 0 }; // Extreme 100m teleport jump

      const result = clampMovement(current, target);
      expect(result.x).toBeCloseTo(MAX_TELEPORT_DISTANCE);
      expect(result.z).toBeCloseTo(0);
    });
  });

  describe("isSequenceFresher", () => {
    it("accepts incoming packet with higher sequence number", () => {
      expect(isSequenceFresher(10, 9)).toBe(true);
      expect(isSequenceFresher(1, 0)).toBe(true);
    });

    it("rejects stale or duplicate sequence packets", () => {
      expect(isSequenceFresher(5, 5)).toBe(false);
      expect(isSequenceFresher(4, 5)).toBe(false);
    });
  });
});
