import { avatarOptions, defaultAvatar } from "../data/demoData";
import { fetchUserRole } from "./profileRepository";
import { supabase } from "./supabaseClient";
import type { AvatarConfig, DemoState, DemoUser, MissionProgress, UserRole } from "../types";

export interface RemoteState {
  user: Pick<DemoUser, "name" | "username" | "level" | "xp" | "coins" | "hearts" | "streakDays"> & {
    email?: string;
    role?: UserRole;
  };
  avatar: AvatarConfig;
  inventory: string[];
  missionProgress: Record<string, MissionProgress>;
  claimedRewards: string[];
  completedLessonIds: string[];
}

const DEFAULT_OWNED_AVATAR_IDS = new Set(
  avatarOptions.filter((opt) => opt.isOwnedByDefault).map((opt) => opt.id),
);

export function sanitizeAvatarForInventory(
  avatar: AvatarConfig,
  inventory: string[],
): AvatarConfig {
  const owned = new Set([...DEFAULT_OWNED_AVATAR_IDS, ...inventory]);
  return {
    skinToneId: owned.has(avatar.skinToneId) ? avatar.skinToneId : defaultAvatar.skinToneId,
    hairId: owned.has(avatar.hairId) ? avatar.hairId : defaultAvatar.hairId,
    topId: owned.has(avatar.topId) ? avatar.topId : defaultAvatar.topId,
    bottomId: owned.has(avatar.bottomId) ? avatar.bottomId : defaultAvatar.bottomId,
    shoesId: owned.has(avatar.shoesId) ? avatar.shoesId : defaultAvatar.shoesId,
    accessoryId:
      avatar.accessoryId && owned.has(avatar.accessoryId) ? avatar.accessoryId : null,
  };
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
      : { ...defaultAvatar },
    inventory: (inventoryRes.data ?? []).map((row) => row.item_id as string),
    missionProgress,
    claimedRewards: (rewardsRes.data ?? []).map((row) => row.mission_id as string),
    completedLessonIds: (lessonsRes.data ?? []).map((row) => row.lesson_unit_id as string),
  };
}

/**
 * Syncs ONLY user-editable profile metadata (name, username, display_name)
 * and validated avatar configuration to Supabase.
 *
 * Server-authoritative progression and economy state (xp, coins, level,
 * lesson_progress, claimed_rewards, inventory_items, mission_progress)
 * are NEVER written from client state.
 */
export async function pushRemoteState(userId: string, state: DemoState): Promise<void> {
  if (!supabase) return;

  const safeAvatar = sanitizeAvatarForInventory(state.avatar, state.inventory);

  const [profileRes, avatarRes] = await Promise.all([
    supabase.from("profiles").upsert({
      user_id: userId,
      name: state.user.name,
      username: state.user.username,
      display_name: state.user.displayName ?? state.user.name,
      updated_at: new Date().toISOString(),
    }),
    supabase.from("avatar_configs").upsert({
      user_id: userId,
      skin_tone_id: safeAvatar.skinToneId,
      hair_id: safeAvatar.hairId,
      top_id: safeAvatar.topId,
      bottom_id: safeAvatar.bottomId,
      shoes_id: safeAvatar.shoesId,
      accessory_id: safeAvatar.accessoryId,
      updated_at: new Date().toISOString(),
    }),
  ]);

  if (profileRes.error) {
    throw new Error(`Gagal menyimpan profil remote: ${profileRes.error.message}`);
  }
  if (avatarRes.error) {
    throw new Error(`Gagal menyimpan avatar remote: ${avatarRes.error.message}`);
  }
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

export async function resolveHydratePayload(userId: string): Promise<HydratePayload> {
  const remote = await fetchRemoteState(userId);
  let authEmail = "";
  let authMetaName: string | undefined;
  let authMetaUsername: string | undefined;

  if (supabase?.auth?.getUser) {
    try {
      const authRes = await supabase.auth.getUser();
      if (authRes?.data?.user && authRes.data.user.id === userId) {
        authEmail = authRes.data.user.email ?? "";
        authMetaName = authRes.data.user.user_metadata?.name as string | undefined;
        authMetaUsername = authRes.data.user.user_metadata?.username as string | undefined;
      }
    } catch {
      // Abaikan jika gagal mengambil metadata sesi
    }
  }

  if (!remote) {
    if (authEmail || authMetaName) {
      const name = authMetaName || authEmail.split("@")[0] || "Pembelajar";
      const username =
        authMetaUsername ||
        name.toLowerCase().replace(/[^a-z0-9_.]/g, "") ||
        "pembelajar";
      const role = await fetchUserRole(userId);
      return {
        userId,
        user: {
          name,
          username,
          email: authEmail,
          level: 1,
          xp: 0,
          coins: 1000,
          hearts: 5,
          streakDays: 1,
          role,
        },
        avatar: { ...defaultAvatar },
        inventory: Array.from(DEFAULT_OWNED_AVATAR_IDS),
        missionProgress: {
          intro: { completedObjectiveIds: [], status: "active" },
          hobby: { completedObjectiveIds: [], status: "available" },
          weekend: { completedObjectiveIds: [], status: "locked" },
        },
        completedMissionIds: [],
        claimedRewards: [],
        completedLessonIds: [],
      };
    }
    return { userId };
  }

  const isLegacyDemoName =
    remote.user.name === "Raka Demo" ||
    remote.user.username === "raka.demo" ||
    remote.user.name === "Pengguna Tamu";
  const resolvedName =
    isLegacyDemoName && (authMetaName || authEmail)
      ? authMetaName || authEmail.split("@")[0] || remote.user.name
      : remote.user.name;
  const resolvedUsername =
    isLegacyDemoName && (authMetaUsername || authEmail)
      ? authMetaUsername || resolvedName.toLowerCase().replace(/[^a-z0-9_.]/g, "") || remote.user.username
      : remote.user.username;

  const completedMissionIds = Object.entries(remote.missionProgress)
    .filter(([, progress]) => progress.status === "completed")
    .map(([missionId]) => missionId);

  const mergedInventory = Array.from(
    new Set([...DEFAULT_OWNED_AVATAR_IDS, ...remote.inventory]),
  );

  return {
    userId,
    user: {
      ...remote.user,
      name: resolvedName,
      username: resolvedUsername,
      ...(authEmail ? { email: authEmail } : {}),
    },
    avatar: sanitizeAvatarForInventory(remote.avatar, mergedInventory),
    inventory: mergedInventory,
    missionProgress: remote.missionProgress,
    completedMissionIds,
    claimedRewards: remote.claimedRewards,
    completedLessonIds: remote.completedLessonIds,
  };
}

/**
 * Destructive client-side deletion of authoritative progression tables is disabled
 * for authenticated accounts to preserve wallet ledger and idempotency integrity.
 */
export async function clearRemoteState(userId: string): Promise<void> {
  if (!userId) return;
  throw new Error(
    "Reset progres langsung dari klien dinonaktifkan untuk akun autentikasi demi menjaga integritas ledger server.",
  );
}
