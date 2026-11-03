import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampMovement,
  isSequenceFresher,
  isValidMovementPayload,
  MOVEMENT_RATE_LIMIT_MS,
  PROTOCOL_VERSION,
  REMOTE_PLAYER_TIMEOUT_MS,
  type MovementPayload,
  type PlayerPresence,
} from "../lib/realtime/protocol";
import {
  joinWorldRoom,
  leaveWorldRoom,
  sendRoomHeartbeat,
} from "../lib/realtime/roomService";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

export interface RemotePlayerState {
  presence: PlayerPresence;
  currentPosition?: MovementPayload;
  lastSeen: number;
}

export interface UseMultiplayerRoomParams {
  roomId: string;
  inviteCode?: string;
  playerProfile: PlayerPresence;
  enabled?: boolean;
  isGuest?: boolean;
}

export function useMultiplayerRoom({
  roomId,
  inviteCode,
  playerProfile,
  enabled = true,
  isGuest = false,
}: UseMultiplayerRoomParams) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [remotePlayers, setRemotePlayers] = useState<Map<string, RemotePlayerState>>(new Map());

  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const lastBroadcastTimeRef = useRef(0);
  const seqCounterRef = useRef(1);
  const remotePlayersRef = useRef<Map<string, RemotePlayerState>>(new Map());
  remotePlayersRef.current = remotePlayers;

  // Cleanup timeout interval
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      const nextMap = new Map(remotePlayersRef.current);

      for (const [id, player] of nextMap.entries()) {
        if (now - player.lastSeen > REMOTE_PLAYER_TIMEOUT_MS) {
          nextMap.delete(id);
          changed = true;
        }
      }

      if (changed) {
        setRemotePlayers(nextMap);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [enabled]);

  // Join & subscribe lifecycle
  useEffect(() => {
    if (!enabled || !roomId) return;

    let cancelled = false;

    async function initRoom() {
      try {
        setConnectionError(null);
        await joinWorldRoom(roomId, inviteCode, isGuest);

        if (cancelled) return;

        // If guest or no supabase, mark connected in offline/isolated mode
        if (!isSupabaseConfigured || !supabase || isGuest) {
          setIsConnected(true);
          return;
        }

        const channelName = `room:${roomId}`;
        const channel = supabase.channel(channelName, {
          config: {
            presence: { key: playerProfile.playerId },
            broadcast: { self: false },
          },
        });
        channelRef.current = channel;

        // 1. Presence Listeners
        channel
          .on("presence", { event: "sync" }, () => {
            const presenceState = channel.presenceState();
            const nextMap = new Map<string, RemotePlayerState>();

            for (const [key, presences] of Object.entries(presenceState)) {
              if (key === playerProfile.playerId) continue; // Exclude self
              const latest = presences[presences.length - 1] as unknown as PlayerPresence;
              if (latest && latest.playerId) {
                const existing = remotePlayersRef.current.get(latest.playerId);
                nextMap.set(latest.playerId, {
                  presence: latest,
                  currentPosition: existing?.currentPosition,
                  lastSeen: Date.now(),
                });
              }
            }

            setRemotePlayers(nextMap);
          })
          .on("presence", { event: "leave" }, ({ key }) => {
            if (key === playerProfile.playerId) return;
            setRemotePlayers((prev) => {
              const next = new Map(prev);
              next.delete(key);
              return next;
            });
          });

        // 2. Broadcast Movement Listener
        channel.on("broadcast", { event: "movement" }, ({ payload }) => {
          if (!isValidMovementPayload(payload)) return;
          if (payload.playerId === playerProfile.playerId) return;

          const existing = remotePlayersRef.current.get(payload.playerId);
          const lastSeq = existing?.currentPosition?.seq ?? 0;

          // Reject out-of-order stale packets
          if (!isSequenceFresher(payload.seq, lastSeq)) return;

          // Teleport clamp
          let finalPos = { x: payload.x, z: payload.z };
          if (existing?.currentPosition) {
            finalPos = clampMovement(
              { x: existing.currentPosition.x, z: existing.currentPosition.z },
              { x: payload.x, z: payload.z },
            );
          }

          const updatedPosition: MovementPayload = {
            ...payload,
            x: finalPos.x,
            z: finalPos.z,
          };

          setRemotePlayers((prev) => {
            const next = new Map(prev);
            const player = next.get(payload.playerId);
            if (player) {
              next.set(payload.playerId, {
                ...player,
                currentPosition: updatedPosition,
                lastSeen: Date.now(),
              });
            } else {
              // Create provisional entry if presence didn't land first
              next.set(payload.playerId, {
                presence: {
                  playerId: payload.playerId,
                  name: "Pemain",
                  username: "player",
                  level: 1,
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
                currentPosition: updatedPosition,
                lastSeen: Date.now(),
              });
            }
            return next;
          });
        });

        // 3. Subscribe & Track Presence
        channel.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            setIsConnected(true);
            await channel.track(playerProfile);
          } else if (status === "CHANNEL_ERROR") {
            setConnectionError("Gagal terhubung ke channel realtime room.");
          }
        });
      } catch (err) {
        if (!cancelled) {
          setConnectionError(err instanceof Error ? err.message : "Gagal inisialisasi room.");
        }
      }
    }

    initRoom();

    // Heartbeat loop every 15s
    const heartbeatTimer = setInterval(() => {
      sendRoomHeartbeat(roomId, isGuest);
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(heartbeatTimer);
      if (channelRef.current && supabase) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      leaveWorldRoom(roomId, isGuest);
      setIsConnected(false);
    };
  }, [roomId, inviteCode, enabled, isGuest, playerProfile]);

  // Broadcast throttled movement to room channel
  const broadcastMovement = useCallback(
    (pos: { x: number; z: number; rotation: number; animState: "idle" | "walk" }) => {
      if (!isConnected || isGuest || !channelRef.current) return;

      const now = Date.now();
      if (now - lastBroadcastTimeRef.current < MOVEMENT_RATE_LIMIT_MS) {
        return; // Throttled to 10 Hz
      }
      lastBroadcastTimeRef.current = now;

      const payload: MovementPayload = {
        playerId: playerProfile.playerId,
        roomId,
        x: pos.x,
        z: pos.z,
        rotation: pos.rotation,
        animState: pos.animState,
        seq: seqCounterRef.current++,
        timestamp: now,
        version: PROTOCOL_VERSION,
      };

      channelRef.current.send({
        type: "broadcast",
        event: "movement",
        payload,
      });
    },
    [isConnected, isGuest, roomId, playerProfile.playerId],
  );

  return {
    isConnected,
    connectionError,
    remotePlayers,
    broadcastMovement,
  };
}
