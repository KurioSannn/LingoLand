import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ChatMessage,
  type PracticeInvite,
  type PracticeSession,
  fetchMutedUserIds,
  muteUser,
  unmuteUser,
  validateChatMessage,
} from "../lib/chatRepository";
import type { ConversationTopic } from "../lib/plazaWorld";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

export const CHAT_RATE_LIMIT_MS = 800;

interface UseRoomChatParams {
  roomId: string;
  currentUser: {
    id: string;
    name: string;
    username?: string;
    isGuest?: boolean;
  };
  enabled?: boolean;
}

export function useRoomChat({
  roomId,
  currentUser,
  enabled = true,
}: UseRoomChatParams) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mutedUserIds, setMutedUserIds] = useState<string[]>([]);
  const [activePractice, setActivePractice] = useState<PracticeSession | null>(null);
  const [pendingInvite, setPendingInvite] = useState<PracticeInvite | null>(null);

  const lastSendTimeRef = useRef(0);
  const mutedUserIdsRef = useRef<string[]>([]);
  mutedUserIdsRef.current = mutedUserIds;

  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  // Load muted list on mount / user change
  useEffect(() => {
    async function initMutes() {
      const list = await fetchMutedUserIds(currentUser.isGuest);
      setMutedUserIds(list);
    }
    initMutes();
  }, [currentUser.isGuest]);

  // Setup channel listeners
  useEffect(() => {
    if (!enabled || !roomId) return;

    if (!isSupabaseConfigured || !supabase || currentUser.isGuest) {
      // Mock system welcome for guest / isolated offline
      setMessages([
        {
          id: "welcome-system",
          roomId,
          senderId: "system",
          senderName: "Lingoland Bot",
          senderUsername: "system",
          message:
            "Selamat datang di Social Plaza! Gunakan chat ini untuk menyapa dan berlatih bahasa Inggris bersama.",
          timestamp: Date.now(),
          type: "system",
        },
      ]);
      return;
    }

    const channelName = `room:${roomId}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    // 1. Chat Message Broadcast
    channel.on("broadcast", { event: "chat_message" }, ({ payload }) => {
      const msg = payload as ChatMessage;
      if (!msg || !msg.senderId) return;

      // Filter out muted players
      if (mutedUserIdsRef.current.includes(msg.senderId)) {
        return;
      }

      setMessages((prev) => [...prev, msg]);
    });

    // 2. Practice Invite Broadcast
    channel.on("broadcast", { event: "practice_invite" }, ({ payload }) => {
      const invite = payload as PracticeInvite;
      if (!invite || invite.targetId !== currentUser.id) return;

      if (mutedUserIdsRef.current.includes(invite.senderId)) {
        return;
      }

      setPendingInvite(invite);
    });

    // 3. Practice Response Broadcast
    channel.on("broadcast", { event: "practice_response" }, ({ payload }) => {
      const res = payload as {
        inviteId: string;
        senderId: string;
        senderName: string;
        targetId: string;
        accepted: boolean;
        topic: ConversationTopic;
      };

      if (res.targetId !== currentUser.id) return;

      if (res.accepted) {
        setActivePractice({
          id: res.inviteId,
          partnerId: res.senderId,
          partnerName: res.senderName,
          topicId: res.topic.id,
          topicTitle: res.topic.title,
          starterEn: res.topic.starterEn,
          starterId: res.topic.starterId,
          prompts: [res.topic.starterEn],
          currentPromptIndex: 0,
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `system-practice-${Date.now()}`,
            roomId,
            senderId: "system",
            senderName: "Sistem",
            senderUsername: "system",
            message: `${res.senderName} menerima undangan latihan! Topik: ${res.topic.title}`,
            timestamp: Date.now(),
            type: "system",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `system-practice-${Date.now()}`,
            roomId,
            senderId: "system",
            senderName: "Sistem",
            senderUsername: "system",
            message: `${res.senderName} sedang belum bisa bergabung latihan saat ini.`,
            timestamp: Date.now(),
            type: "system",
          },
        ]);
      }
    });

    // 4. Practice End Broadcast
    channel.on("broadcast", { event: "practice_end" }, ({ payload }) => {
      const { partnerId } = payload as { partnerId: string };
      setActivePractice((current) => {
        if (current && current.partnerId === partnerId) {
          return null;
        }
        return current;
      });
    });

    channel.subscribe();

    return () => {
      // Channel will be cleaned up by parent or unmount
    };
  }, [enabled, roomId, currentUser.id, currentUser.isGuest]);

  // Send Chat Message
  const sendMessage = useCallback(
    (text: string, type: "room" | "practice" = "room"): { ok: boolean; error?: string } => {
      const now = Date.now();
      if (now - lastSendTimeRef.current < CHAT_RATE_LIMIT_MS) {
        return {
          ok: false,
          error: "Tunggu sebentar sebelum mengirim pesan berikutnya.",
        };
      }

      const validation = validateChatMessage(text);
      if (!validation.ok) {
        return { ok: false, error: validation.error };
      }

      lastSendTimeRef.current = now;

      const payload: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        roomId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderUsername: currentUser.username || currentUser.name.toLowerCase().replace(/\s+/g, "_"),
        message: validation.sanitized,
        timestamp: now,
        type,
      };

      // Optimistic append to local messages
      setMessages((prev) => [...prev, payload]);

      // Broadcast over channel if online
      if (channelRef.current && !currentUser.isGuest) {
        channelRef.current.send({
          type: "broadcast",
          event: "chat_message",
          payload,
        });
      }

      return { ok: true };
    },
    [roomId, currentUser],
  );

  // Send Practice Invite
  const sendPracticeInvite = useCallback(
    (targetId: string, topic: ConversationTopic) => {
      const invite: PracticeInvite = {
        id: `invite-${Date.now()}`,
        roomId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        targetId,
        topicId: topic.id,
        topicTitle: topic.title,
        starterEn: topic.starterEn,
        starterId: topic.starterId,
        timestamp: Date.now(),
      };

      if (channelRef.current && !currentUser.isGuest) {
        channelRef.current.send({
          type: "broadcast",
          event: "practice_invite",
          payload: invite,
        });
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-invite-${Date.now()}`,
          roomId,
          senderId: "system",
          senderName: "Sistem",
          senderUsername: "system",
          message: `Undangan latihan dengan topik "${topic.title}" telah terkirim.`,
          timestamp: Date.now(),
          type: "system",
        },
      ]);
    },
    [roomId, currentUser],
  );

  // Respond Practice Invite
  const respondPracticeInvite = useCallback(
    (invite: PracticeInvite, accept: boolean) => {
      setPendingInvite(null);

      if (accept) {
        setActivePractice({
          id: invite.id,
          partnerId: invite.senderId,
          partnerName: invite.senderName,
          topicId: invite.topicId,
          topicTitle: invite.topicTitle,
          starterEn: invite.starterEn,
          starterId: invite.starterId,
          prompts: [invite.starterEn],
          currentPromptIndex: 0,
        });
      }

      if (channelRef.current && !currentUser.isGuest) {
        channelRef.current.send({
          type: "broadcast",
          event: "practice_response",
          payload: {
            inviteId: invite.id,
            senderId: currentUser.id,
            senderName: currentUser.name,
            targetId: invite.senderId,
            accepted: accept,
            topic: {
              id: invite.topicId,
              title: invite.topicTitle,
              starterEn: invite.starterEn,
              starterId: invite.starterId,
            },
          },
        });
      }
    },
    [currentUser],
  );

  // End Practice Session
  const endPracticeSession = useCallback(() => {
    if (!activePractice) return;

    if (channelRef.current && !currentUser.isGuest) {
      channelRef.current.send({
        type: "broadcast",
        event: "practice_end",
        payload: { partnerId: currentUser.id },
      });
    }

    setActivePractice(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-end-${Date.now()}`,
        roomId,
        senderId: "system",
        senderName: "Sistem",
        senderUsername: "system",
        message: "Sesi latihan duo telah selesai.",
        timestamp: Date.now(),
        type: "system",
      },
    ]);
  }, [activePractice, roomId, currentUser.id, currentUser.isGuest]);

  // Mute & Unmute actions
  const handleMute = useCallback(
    async (targetUserId: string) => {
      const res = await muteUser(targetUserId, currentUser.isGuest);
      if (res.ok) {
        setMutedUserIds((prev) => (prev.includes(targetUserId) ? prev : [...prev, targetUserId]));
      }
      return res;
    },
    [currentUser.isGuest],
  );

  const handleUnmute = useCallback(
    async (targetUserId: string) => {
      const res = await unmuteUser(targetUserId, currentUser.isGuest);
      if (res.ok) {
        setMutedUserIds((prev) => prev.filter((id) => id !== targetUserId));
      }
      return res;
    },
    [currentUser.isGuest],
  );

  return {
    messages,
    mutedUserIds,
    activePractice,
    pendingInvite,
    sendMessage,
    sendPracticeInvite,
    respondPracticeInvite,
    endPracticeSession,
    muteUser: handleMute,
    unmuteUser: handleUnmute,
  };
}
