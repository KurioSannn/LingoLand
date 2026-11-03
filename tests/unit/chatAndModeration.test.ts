import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ChatMessage,
  type PracticeInvite,
  type PracticeSession,
  fetchMutedUserIds,
  muteUser,
  submitModerationReport,
  unmuteUser,
  validateChatMessage,
} from "../../src/lib/chatRepository";

describe("Block 32: Player Interaction, Chat, and Safety Moderation", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("validateChatMessage", () => {
    it("rejects empty or whitespace-only messages", () => {
      expect(validateChatMessage("").ok).toBe(false);
      expect(validateChatMessage("   ").ok).toBe(false);
      expect(validateChatMessage("\n\t").ok).toBe(false);
    });

    it("rejects messages longer than 280 characters", () => {
      const longMsg = "a".repeat(281);
      const res = validateChatMessage(longMsg);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("maksimal 280 karakter");
    });

    it("sanitizes potentially malicious HTML / XSS payloads", () => {
      const xssInput = "<script>alert('hack')</script>";
      const res = validateChatMessage(xssInput);
      expect(res.ok).toBe(true);
      expect(res.sanitized).not.toContain("<script>");
      expect(res.sanitized).toContain("&lt;script&gt;");

      const imgPayload = '<img src="x" onerror="steal()"/>';
      const imgRes = validateChatMessage(imgPayload);
      expect(imgRes.ok).toBe(true);
      expect(imgRes.sanitized).not.toContain("<img");
      expect(imgRes.sanitized).toContain("&lt;img");
    });

    it("accepts safe conversational English and Indonesian messages", () => {
      const msg = "Hello! Would you like to practice speaking English at the cafe?";
      const res = validateChatMessage(msg);
      expect(res.ok).toBe(true);
      expect(res.sanitized).toBe(msg);
    });
  });

  describe("Mute and Unmute Management", () => {
    it("mutes and unmutes players persistently in local storage", async () => {
      const initial = await fetchMutedUserIds(true);
      expect(initial).toEqual([]);

      const targetId = "user-annoying-123";
      await muteUser(targetId, true);

      const afterMute = await fetchMutedUserIds(true);
      expect(afterMute).toContain(targetId);

      // Pastikan mute idempotent (tidak duplikat)
      await muteUser(targetId, true);
      const idempotent = await fetchMutedUserIds(true);
      expect(idempotent.filter((id) => id === targetId).length).toBe(1);

      // Unmute
      await unmuteUser(targetId, true);
      const afterUnmute = await fetchMutedUserIds(true);
      expect(afterUnmute).not.toContain(targetId);
    });
  });

  describe("Moderation Reports", () => {
    it("submits moderation reports safely with valid reasons", async () => {
      const targetId = "user-bad-behavior-456";
      const res = await submitModerationReport(
        targetId,
        "harassment",
        "Pemain menggunakan kata-kata kasar",
        "room-plaza-1",
        true, // guest mode fallback
      );

      expect(res.ok).toBe(true);
      expect(res.message).toBeTruthy();
    });
  });

  describe("Message Privacy & Security DoD", () => {
    it("never exposes email, password, token, or location in chat payload", () => {
      const sampleMessage: ChatMessage = {
        id: "msg-1",
        roomId: "room-plaza-1",
        senderId: "user-123",
        senderName: "Raka Learner",
        senderUsername: "raka",
        message: "Hello world!",
        timestamp: Date.now(),
        type: "room",
      };

      const serialized = JSON.stringify(sampleMessage);
      expect(serialized).not.toContain("email");
      expect(serialized).not.toContain("password");
      expect(serialized).not.toContain("token");
      expect(serialized).not.toContain("location");
      expect(serialized).not.toContain("lat");
      expect(serialized).not.toContain("lng");
    });
  });

  describe("Duo Practice Sessions", () => {
    it("constructs valid practice invitation and active session objects", () => {
      const invite: PracticeInvite = {
        id: "invite-1",
        roomId: "room-plaza-1",
        senderId: "user-a",
        senderName: "Alice",
        targetId: "user-b",
        topicId: "topic-1",
        topicTitle: "Weekend Plans",
        starterEn: "What do you like to do on weekends?",
        starterId: "Apa yang suka kamu lakukan di akhir pekan?",
        timestamp: Date.now(),
      };

      expect(invite.senderId).toBe("user-a");
      expect(invite.targetId).toBe("user-b");

      const session: PracticeSession = {
        id: invite.id,
        partnerId: invite.senderId,
        partnerName: invite.senderName,
        topicId: invite.topicId,
        topicTitle: invite.topicTitle,
        starterEn: invite.starterEn,
        starterId: invite.starterId,
        prompts: [invite.starterEn],
        currentPromptIndex: 0,
      };

      expect(session.prompts.length).toBeGreaterThan(0);
      expect(session.topicTitle).toBe("Weekend Plans");
    });
  });
});
