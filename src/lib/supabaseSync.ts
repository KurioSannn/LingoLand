import { supabase } from "./supabaseClient";
import type { AvatarConfig, DemoState, DemoUser, MissionProgress } from "../types";

export interface RemoteState {
  user: Pick<DemoUser, "name" | "username" | "level" | "xp" | "coins" | "hearts" | "streakDays">;
  avatar: AvatarConfig;
  inventory: string[];
  missionProgress: Record<string, MissionProgress>;
  claimedRewards: string[];
}

export async function fetchRemoteState(userId: string): Promise<RemoteState | null> {
  if (!supabase) return null;

  const [profileRes, avatarRes, inventoryRes, missionRes, rewardsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("avatar_configs").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("inventory_items").select("item_id").eq("user_id", userId),
    supabase.from("mission_progress").select("*").eq("user_id", userId),
    supabase.from("claimed_rewards").select("mission_id").eq("user_id", userId),
  ]);

  if (!profileRes.data) return null;

  const missionProgress: Record<string, MissionProgress> = {};
  for (const row of missionRes.data ?? []) {
    missionProgress[row.mission_id as string] = {
      completedObjectiveIds: (row.completed_objective_ids as string[] | null) ?? [],
      status: row.status as MissionProgress["status"],
    };
  }

  return {
    user: {
      name: profileRes.data.name,
      username: profileRes.data.username,
      level: profileRes.data.level,
      xp: profileRes.data.xp,
      coins: profileRes.data.coins,
      hearts: profileRes.data.hearts,
      streakDays: profileRes.data.streak_days,
    },
    avatar: avatarRes.data
      ? {
          skinToneId: avatarRes.data.skin_tone_id,
          hairId: avatarRes.data.hair_id,
          topId: avatarRes.data.top_id,
          bottomId: avatarRes.data.bottom_id,
          shoesId: avatarRes.data.shoes_id,
          accessoryId: avatarRes.data.accessory_id,
        }
      : {
          skinToneId: "skin-medium",
          hairId: "hair-short-black",
          topId: "top-hoodie-lavender",
          bottomId: "bottom-dark-pants",
          shoesId: "shoes-white",
          accessoryId: null,
        },
    inventory: (inventoryRes.data ?? []).map((row) => row.item_id as string),
    missionProgress,
    claimedRewards: (rewardsRes.data ?? []).map((row) => row.mission_id as string),
  };
}

async function replaceRows(table: string, userId: string, rows: Record<string, unknown>[]) {
  if (!supabase) return;
  await supabase.from(table).delete().eq("user_id", userId);
  if (rows.length > 0) await supabase.from(table).insert(rows);
}

export async function pushRemoteState(userId: string, state: DemoState): Promise<void> {
  if (!supabase) return;

  await Promise.all([
    supabase.from("profiles").upsert({
      user_id: userId,
      name: state.user.name,
      username: state.user.username,
      level: state.user.level,
      xp: state.user.xp,
      coins: state.user.coins,
      hearts: state.user.hearts,
      streak_days: state.user.streakDays,
      updated_at: new Date().toISOString(),
    }),
    supabase.from("avatar_configs").upsert({
      user_id: userId,
      skin_tone_id: state.avatar.skinToneId,
      hair_id: state.avatar.hairId,
      top_id: state.avatar.topId,
      bottom_id: state.avatar.bottomId,
      shoes_id: state.avatar.shoesId,
      accessory_id: state.avatar.accessoryId,
      updated_at: new Date().toISOString(),
    }),
    replaceRows(
      "inventory_items",
      userId,
      state.inventory.map((itemId) => ({ user_id: userId, item_id: itemId })),
    ),
    replaceRows(
      "mission_progress",
      userId,
      Object.entries(state.missionProgress).map(([missionId, progress]) => ({
        user_id: userId,
        mission_id: missionId,
        status: progress.status,
        completed_objective_ids: progress.completedObjectiveIds,
        updated_at: new Date().toISOString(),
      })),
    ),
    replaceRows(
      "claimed_rewards",
      userId,
      state.claimedRewards.map((missionId) => ({ user_id: userId, mission_id: missionId })),
    ),
  ]);
}

export interface HydratePayload {
  userId: string;
  user?: RemoteState["user"];
  avatar?: AvatarConfig;
  inventory?: string[];
  missionProgress?: Record<string, MissionProgress>;
  completedMissionIds?: string[];
  claimedRewards?: string[];
}

// Shared by both the explicit login flow (useDemoAuth) and the background
// Supabase session listener (DemoContext), so a fetched-then-empty remote
// vs. an existing remote resolve to the same HYDRATE_REMOTE shape once.
export async function resolveHydratePayload(userId: string): Promise<HydratePayload> {
  const remote = await fetchRemoteState(userId);
  if (!remote) return { userId };

  const completedMissionIds = Object.entries(remote.missionProgress)
    .filter(([, progress]) => progress.status === "completed")
    .map(([missionId]) => missionId);

  return {
    userId,
    user: remote.user,
    avatar: remote.avatar,
    inventory: remote.inventory,
    missionProgress: remote.missionProgress,
    completedMissionIds,
    claimedRewards: remote.claimedRewards,
  };
}

export async function clearRemoteState(userId: string): Promise<void> {
  if (!supabase) return;
  await Promise.all([
    supabase.from("profiles").delete().eq("user_id", userId),
    supabase.from("avatar_configs").delete().eq("user_id", userId),
    supabase.from("inventory_items").delete().eq("user_id", userId),
    supabase.from("mission_progress").delete().eq("user_id", userId),
    supabase.from("claimed_rewards").delete().eq("user_id", userId),
  ]);
}
