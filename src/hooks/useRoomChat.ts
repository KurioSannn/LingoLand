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
import type { PlayerPresence } from "../lib/realtime/protocol";
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
  verifiedPresences?: Map<string, { presence: PlayerPresence }>;
}

export function useRoomChat({
  roomId,
  currentUser,
  enabled = true,
  verifiedPresences,
}: UseRoomChatParams) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mutedUserIds, setMutedUserIds] = useState<string[]>([]);
  const [activePractice, setActivePractice] = useState<PracticeSession | null>(null);
  const [pendingInvite, setPendingInvite] = useState<PracticeInvite | null>(null);

  const lastSendTimeRef = useRef(0);
  const mutedUserIdsRef = useRef<string[]>([]);
  mutedUserIdsRef.current = mutedUserIds;
  const verifiedPresencesRef = useRef(verifiedPresences);
  verifiedPresencesRef.current = verifiedPresences;

  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const isSubscribedRef = useRef(false);

  // Load muted list on mount / user change
  useEffect(() => {
    async function initMutes() {
      const list = await fetchMutedUserIds(currentUser.isGuest);
      setMutedUserIds(list);
    }
    initMutes();
  }, [currentUser.isGuest]);

  // Setup channel listeners with deterministic cleanup on room switch or unmount
  useEffect(() => {
    setPendingInvite(null);
    setActivePractice(null);
    isSubscribedRef.current = false;

    if (!enabled || !roomId) {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    if (!isSupabaseConfigured || !supabase || currentUser.isGuest) {
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
          status: "sent",
        },
      ]);
      return;
    }

    let cancelled = false;
    setMessages([]);

    const channelName = `room-chat:${roomId}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: true },
      },
    });
    channelRef.current = channel;

    // 1. Chat Message Broadcast
    channel.on("broadcast", { event: "chat_message" }, ({ payload }) => {
      if (cancelled) return;
      const msg = payload as Partial<ChatMessage>;
      if (
        !msg ||
        typeof msg.id !== "string" ||
        typeof msg.senderId !== "string" ||
        !msg.senderId ||
        msg.senderId === currentUser.id ||
        msg.roomId !== roomId ||
        typeof msg.message !== "string"
      ) {
        return;
      }

      // Filter out muted players
      if (mutedUserIdsRef.current.includes(msg.senderId)) {
        return;
      }

      // Validate and sanitize incoming message content
      const check = validateChatMessage(msg.message);
      if (!check.ok) return;

      // Cross-check sender identity against verified room presence when available
      const verified = verifiedPresencesRef.current?.get(msg.senderId)?.presence;
      const safeSenderName = verified?.name || msg.senderName || "Pemain";
      const safeSenderUsername = verified?.username || msg.senderUsername || "player";

      const incomingMessage: ChatMessage = {
        id: msg.id,
        roomId,
        senderId: msg.senderId,
        senderName: safeSenderName,
        senderUsername: safeSenderUsername,
        message: check.sanitized,
        timestamp: typeof msg.timestamp === "number" ? msg.timestamp : Date.now(),
        type: msg.type === "practice" ? "practice" : "room",
        status: "sent",
      };

      setMessages((prev) => {
        if (prev.some((existing) => existing.id === incomingMessage.id)) {
          return prev;
        }
        return [...prev, incomingMessage];
      });
    });

    // 2. Practice Invite Broadcast
    channel.on("broadcast", { event: "practice_invite" }, ({ payload }) => {
      if (cancelled) return;
      const invite = payload as PracticeInvite;
      if (!invite || invite.roomId !== roomId || invite.targetId !== currentUser.id) return;

      if (mutedUserIdsRef.current.includes(invite.senderId)) {
        return;
      }

      const verified = verifiedPresencesRef.current?.get(invite.senderId)?.presence;
      setPendingInvite({
        ...invite,
        senderName: verified?.name || invite.senderName || "Pemain",
      });
    });

    // 3. Practice Response Broadcast
    channel.on("broadcast", { event: "practice_response" }, ({ payload }) => {
      if (cancelled) return;
      const res = payload as {
        inviteId: string;
        senderId: string;
        senderName: string;
        targetId: string;
        accepted: boolean;
        topic: ConversationTopic;
      };

      if (!res || res.targetId !== currentUser.id) return;

      const verified = verifiedPresencesRef.current?.get(res.senderId)?.presence;
      const responderName = verified?.name || res.senderName || "Pemain";

      if (res.accepted) {
        setActivePractice({
          id: res.inviteId,
          partnerId: res.senderId,
          partnerName: responderName,
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
            message: `${responderName} menerima undangan latihan! Topik: ${res.topic.title}`,
            timestamp: Date.now(),
            type: "system",
            status: "sent",
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
            message: `${responderName} sedang belum bisa bergabung latihan saat ini.`,
            timestamp: Date.now(),
            type: "system",
            status: "sent",
          },
        ]);
      }
    });

    // 4. Practice End Broadcast
    channel.on("broadcast", { event: "practice_end" }, ({ payload }) => {
      if (cancelled) return;
      const { partnerId } = (payload as { partnerId?: string }) ?? {};
      if (!partnerId) return;
      setActivePractice((current) => {
        if (current && current.partnerId === partnerId) {
          return null;
        }
        return current;
      });
    });

    channel.subscribe((status) => {
      if (cancelled) return;
      isSubscribedRef.current = status === "SUBSCRIBED";
    });

    return () => {
      cancelled = true;
      isSubscribedRef.current = false;
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, roomId, currentUser.id, currentUser.isGuest]);

  // Send Chat Message with optimistic pending -> sent/failed status tracking
  const sendMessage = useCallback(
    (text: string, type: "room" | "practice" = "room"): { ok: boolean; error?: string } => {
      if (!enabled) {
        return {
          ok: false,
          error: "Obrolan belum aktif karena belum bergabung ke dalam room.",
        };
      }

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
      const isOfflineOrGuest = !isSupabaseConfigured || !supabase || Boolean(currentUser.isGuest);
      const messageId = `msg-${now}-${Math.random().toString(36).substring(2, 7)}`;

      const payload: ChatMessage = {
        id: messageId,
        roomId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderUsername:
          currentUser.username || currentUser.name.toLowerCase().replace(/\s+/g, "_"),
        message: validation.sanitized,
        timestamp: now,
        type,
        status: isOfflineOrGuest ? "sent" : "pending",
      };

      setMessages((prev) => [...prev, payload]);

      if (!isOfflineOrGuest) {
        const channel = channelRef.current;
        if (!channel) {
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, status: "failed" } : m)),
          );
          return { ok: false, error: "Channel obrolan belum siap." };
        }

        Promise.resolve(
          channel.send({
            type: "broadcast",
            event: "chat_message",
            payload: { ...payload, status: "sent" },
          }),
        )
          .then((sendResult) => {
            const ok = !sendResult || sendResult === "ok";
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId ? { ...m, status: ok ? "sent" : "failed" } : m,
              ),
            );
          })
          .catch(() => {
            setMessages((prev) =>
              prev.map((m) => (m.id === messageId ? { ...m, status: "failed" } : m)),
            );
          });
      }

      return { ok: true };
    },
    [enabled, roomId, currentUser],
  );

  // Send Practice Invite
  const sendPracticeInvite = useCallback(
    (targetId: string, topic: ConversationTopic) => {
      if (!enabled) return;
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
          status: "sent",
        },
      ]);
    },
    [enabled, roomId, currentUser],
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
        status: "sent",
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
