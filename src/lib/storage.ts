import { createInitialState, missions, STORAGE_KEY } from "../data/demoData";
import type { DemoState, DemoStorageMeta, MissionProgress, MissionStatus } from "../types";

interface DemoStorageLoadResult {
  state: DemoState;
  meta: DemoStorageMeta;
}

const missionStatuses: MissionStatus[] = ["locked", "available", "active", "completed", "incomplete"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === "string");
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function sanitizeMissionProgress(value: unknown, fallback: Record<string, MissionProgress>): Record<string, MissionProgress> {
  if (!isRecord(value)) return fallback;

  return missions.reduce<Record<string, MissionProgress>>((progress, mission) => {
    const raw = value[mission.id];
    const fallbackItem = fallback[mission.id] ?? { completedObjectiveIds: [], status: "incomplete" };

    if (!isRecord(raw)) {
      progress[mission.id] = fallbackItem;
      return progress;
    }

    const rawStatus = raw.status;
    progress[mission.id] = {
      completedObjectiveIds: stringArray(raw.completedObjectiveIds, fallbackItem.completedObjectiveIds),
      status: typeof rawStatus === "string" && missionStatuses.includes(rawStatus as MissionStatus)
        ? rawStatus as MissionStatus
        : fallbackItem.status,
    };
    return progress;
  }, {});
}

export function hydrateDemoState(value: unknown): DemoState | null {
  if (!isRecord(value) || value.schemaVersion !== 1) return null;

  const fallback = createInitialState(false);
  const rawUser = isRecord(value.user) ? value.user : {};
  const rawAvatar = isRecord(value.avatar) ? value.avatar : {};

  return {
    schemaVersion: 1,
    isAuthenticated: booleanValue(value.isAuthenticated, fallback.isAuthenticated),
    user: {
      id: stringValue(rawUser.id, fallback.user.id),
      name: stringValue(rawUser.name, fallback.user.name),
      username: stringValue(rawUser.username, fallback.user.username),
      email: stringValue(rawUser.email, fallback.user.email),
      level: numberValue(rawUser.level, fallback.user.level),
      xp: numberValue(rawUser.xp, fallback.user.xp),
      coins: numberValue(rawUser.coins, fallback.user.coins),
      hearts: numberValue(rawUser.hearts, fallback.user.hearts),
      streakDays: numberValue(rawUser.streakDays, fallback.user.streakDays),
    },
    avatar: {
      skinToneId: stringValue(rawAvatar.skinToneId, fallback.avatar.skinToneId),
      hairId: stringValue(rawAvatar.hairId, fallback.avatar.hairId),
      topId: stringValue(rawAvatar.topId, fallback.avatar.topId),
      bottomId: stringValue(rawAvatar.bottomId, fallback.avatar.bottomId),
      shoesId: stringValue(rawAvatar.shoesId, fallback.avatar.shoesId),
      accessoryId: rawAvatar.accessoryId === null || typeof rawAvatar.accessoryId === "string"
        ? rawAvatar.accessoryId
        : fallback.avatar.accessoryId,
    },
    inventory: stringArray(value.inventory, fallback.inventory),
    activeMissionId: stringValue(value.activeMissionId, fallback.activeMissionId),
    missionProgress: sanitizeMissionProgress(value.missionProgress, fallback.missionProgress),
    completedMissionIds: stringArray(value.completedMissionIds, fallback.completedMissionIds),
    claimedRewards: stringArray(value.claimedRewards, fallback.claimedRewards),
    recentActivity: stringArray(value.recentActivity, fallback.recentActivity).slice(0, 5),
  };
}

export function loadDemoState(): DemoStorageLoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        state: createInitialState(false),
        meta: {
          key: STORAGE_KEY,
          status: "initialized",
          message: "State demo baru dibuat dari data default.",
        },
      };
    }

    const hydrated = hydrateDemoState(JSON.parse(raw));
    if (!hydrated) {
      return {
        state: createInitialState(false),
        meta: {
          key: STORAGE_KEY,
          status: "recovered",
          message: "Data localStorage tidak valid. State demo dipulihkan ke default.",
        },
      };
    }

    return {
      state: hydrated,
      meta: {
        key: STORAGE_KEY,
        status: "loaded",
        message: "State demo berhasil dibaca dari localStorage.",
      },
    };
  } catch {
    return {
      state: createInitialState(false),
      meta: {
        key: STORAGE_KEY,
        status: "recovered",
        message: "Data localStorage rusak. State demo dipulihkan ke default.",
      },
    };
  }
}

export function saveDemoState(state: DemoState): DemoStorageMeta {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return {
      key: STORAGE_KEY,
      status: "saved",
      message: "State demo berhasil disimpan ke localStorage.",
    };
  } catch {
    return {
      key: STORAGE_KEY,
      status: "unavailable",
      message: "localStorage tidak tersedia atau penuh. Perubahan hanya aktif di sesi ini.",
    };
  }
}

export function clearDemoState(): DemoStorageMeta {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return {
      key: STORAGE_KEY,
      status: "initialized",
      message: "State demo dihapus dan siap dibuat ulang.",
    };
  } catch {
    return {
      key: STORAGE_KEY,
      status: "unavailable",
      message: "localStorage tidak dapat dihapus dari browser ini.",
    };
  }
}
