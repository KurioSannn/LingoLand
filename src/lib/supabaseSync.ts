import { fetchUserRole } from "./profileRepository";
import { supabase } from "./supabaseClient";
import type { AvatarConfig, DemoState, DemoUser, MissionProgress, UserRole } from "../types";

export interface RemoteState {
  user: Pick<DemoUser, "name" | "username" | "level" | "xp" | "coins" | "hearts" | "streakDays"> & {
    role?: UserRole;
  };
  avatar: AvatarConfig;
  inventory: string[];
  missionProgress: Record<string, MissionProgress>;
  claimedRewards: string[];
  completedLessonIds: string[];
}

export async function fetchRemoteState(userId: string): Promise<RemoteState | null> {
  if (!supabase) return null;

  const [profileRes, avatarRes, inventoryRes, missionRes, rewardsRes, lessonsRes, role] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("avatar_configs").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("inventory_items").select("item_id").eq("user_id", userId),
    supabase.from("mission_progress").select("*").eq("user_id", userId),
    supabase.from("claimed_rewards").select("mission_id").eq("user_id", userId),
    supabase.from("lesson_progress").select("lesson_unit_id").eq("user_id", userId),
    fetchUserRole(userId),
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
      role,
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
    completedLessonIds: (lessonsRes.data ?? []).map((row) => row.lesson_unit_id as string),
  };
}

async function upsertRows(table: string, rows: Record<string, unknown>[], onConflict: string) {
  if (!supabase || rows.length === 0) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) {
    throw new Error(`Gagal menyinkronkan data ke tabel ${table}: ${error.message}`);
  }
}

export async function pushRemoteState(userId: string, state: DemoState): Promise<void> {
  if (!supabase) return;

  const [profileRes, avatarRes] = await Promise.all([
    supabase.from("profiles").upsert({
      user_id: userId,
      name: state.user.name,
      username: state.user.username,
      display_name: state.user.displayName ?? state.user.name,
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
  ]);

  if (profileRes.error) {
    throw new Error(`Gagal menyimpan profil remote: ${profileRes.error.message}`);
  }
  if (avatarRes.error) {
    throw new Error(`Gagal menyimpan avatar remote: ${avatarRes.error.message}`);
  }

  await Promise.all([
    upsertRows(
      "inventory_items",
      state.inventory.map((itemId) => ({ user_id: userId, item_id: itemId })),
      "user_id,item_id",
    ),
    upsertRows(
      "mission_progress",
      Object.entries(state.missionProgress).map(([missionId, progress]) => ({
        user_id: userId,
        mission_id: missionId,
        status: progress.status,
        completed_objective_ids: progress.completedObjectiveIds,
        updated_at: new Date().toISOString(),
      })),
      "user_id,mission_id",
    ),
    upsertRows(
      "claimed_rewards",
      state.claimedRewards.map((missionId) => ({ user_id: userId, mission_id: missionId })),
      "user_id,mission_id",
    ),
    upsertRows(
      "lesson_progress",
      state.completedLessonIds.map((lessonUnitId) => ({
        user_id: userId,
        lesson_unit_id: lessonUnitId,
        status: "completed",
        score: 100,
        updated_at: new Date().toISOString(),
      })),
      "user_id,lesson_unit_id",
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
  completedLessonIds?: string[];
}

// Shared by both the explicit login flow (useDemoAuth) and the background
// Supabase session listener (DemoContext), so a fetched-then-empty remote
// vs. an existing remote resolve to the same HYDRATE_REMOTE shape once.
export async function resolveHydratePayload(userId: string): Promise<HydratePayload> {
  const remote = await fetchRemoteState(userId);
  if (!remote) {
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      if (data.user && data.user.id === userId) {
        const email = data.user.email ?? "";
        const name = (data.user.user_metadata?.name as string | undefined) || email.split("@")[0] || "Learner";
        const username =
          (data.user.user_metadata?.username as string | undefined) ||
          name.toLowerCase().replace(/[^a-z0-9_.]/g, "");
        const role = await fetchUserRole(userId);
        return {
          userId,
          user: {
            name,
            username,
            level: 1,
            xp: 0,
            coins: 1000,
            hearts: 5,
            streakDays: 1,
            role,
          },
        };
      }
    }
    return { userId };
  }

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
    completedLessonIds: remote.completedLessonIds,
  };
}

export async function clearRemoteState(userId: string): Promise<void> {
  if (!supabase) return;
  const results = await Promise.all([
    supabase.from("profiles").delete().eq("user_id", userId),
    supabase.from("avatar_configs").delete().eq("user_id", userId),
    supabase.from("inventory_items").delete().eq("user_id", userId),
    supabase.from("mission_progress").delete().eq("user_id", userId),
    supabase.from("claimed_rewards").delete().eq("user_id", userId),
    supabase.from("lesson_progress").delete().eq("user_id", userId),
  ]);

  for (const res of results) {
    if (res.error) {
      throw new Error(`Gagal mereset remote state: ${res.error.message}`);
    }
  }
}
