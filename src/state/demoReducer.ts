import { createInitialState, DEMO_EMAIL, DEMO_PASSWORD } from "../data/demoData";
import { calculateLevel } from "../lib/game";
import type { AvatarConfig, DemoState, MissionProgress, MissionStatus } from "../types";

export type DemoAction =
  | { type: "LOGIN_DEMO" }
  | { type: "LOGIN_WITH_CREDENTIALS"; email: string; password: string }
  | { type: "LOGOUT" }
  | { type: "RESET_PROGRESS" }
  | { type: "SET_ACTIVE_MISSION"; missionId: string }
  | { type: "SAVE_AVATAR"; avatar: AvatarConfig }
  | { type: "BUY_ITEM"; itemId: string; price: number; itemName: string }
  | { type: "UPDATE_MISSION_PROGRESS"; missionId: string; completedObjectiveIds: string[] }
  | { type: "CLAIM_REWARD"; missionId: string; xp: number; coins: number; missionTitle: string }
  | { type: "ADD_ACTIVITY"; message: string };

function recent(message: string, current: string[]): string[] {
  return [message, ...current].slice(0, 5);
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "LOGIN_DEMO":
      return { ...state, isAuthenticated: true, recentActivity: recent("Akun demo siap digunakan.", state.recentActivity) };
    case "LOGIN_WITH_CREDENTIALS":
      if (action.email === DEMO_EMAIL && action.password === DEMO_PASSWORD) {
        return { ...state, isAuthenticated: true, recentActivity: recent("Login demo berhasil.", state.recentActivity) };
      }
      return { ...state, isAuthenticated: false };
    case "LOGOUT":
      return { ...state, isAuthenticated: false };
    case "RESET_PROGRESS":
      return createInitialState(state.isAuthenticated);
    case "SET_ACTIVE_MISSION": {
      const existing = state.missionProgress[action.missionId];
      const status: MissionStatus = existing?.status === "completed" ? "completed" : "active";
      const nextProgress: Record<string, MissionProgress> = {
        ...state.missionProgress,
        [action.missionId]: {
          completedObjectiveIds: existing?.completedObjectiveIds ?? [],
          status,
        },
      };
      return { ...state, activeMissionId: action.missionId, missionProgress: nextProgress };
    }
    case "SAVE_AVATAR":
      return { ...state, avatar: action.avatar, recentActivity: recent("Avatar berhasil diperbarui.", state.recentActivity) };
    case "BUY_ITEM":
      if (state.inventory.includes(action.itemId) || state.user.coins < action.price) return state;
      return {
        ...state,
        user: { ...state.user, coins: state.user.coins - action.price },
        inventory: [...state.inventory, action.itemId],
        recentActivity: recent(`${action.itemName} berhasil ditambahkan ke inventory.`, state.recentActivity),
      };
    case "UPDATE_MISSION_PROGRESS": {
      const status: MissionStatus = state.completedMissionIds.includes(action.missionId) ? "completed" : "active";
      const missionProgress: Record<string, MissionProgress> = {
        ...state.missionProgress,
        [action.missionId]: {
          completedObjectiveIds: action.completedObjectiveIds,
          status,
        },
      };
      return { ...state, missionProgress };
    }
    case "CLAIM_REWARD": {
      if (state.claimedRewards.includes(action.missionId)) return state;
      const xp = state.user.xp + action.xp;
      const completedMissionIds = Array.from(new Set([...state.completedMissionIds, action.missionId]));
      const weekendStatus: MissionStatus = completedMissionIds.includes("intro") && !completedMissionIds.includes("weekend")
        ? "available"
        : state.missionProgress.weekend?.status ?? "locked";
      const missionProgress: Record<string, MissionProgress> = {
        ...state.missionProgress,
        [action.missionId]: {
          completedObjectiveIds: state.missionProgress[action.missionId]?.completedObjectiveIds ?? [],
          status: "completed",
        },
        weekend: {
          completedObjectiveIds: state.missionProgress.weekend?.completedObjectiveIds ?? [],
          status: weekendStatus,
        },
      };
      return {
        ...state,
        user: { ...state.user, xp, level: calculateLevel(xp), coins: state.user.coins + action.coins },
        completedMissionIds,
        claimedRewards: [...state.claimedRewards, action.missionId],
        missionProgress,
        recentActivity: recent(`Misi ${action.missionTitle} selesai.`, state.recentActivity),
      };
    }
    case "ADD_ACTIVITY":
      return { ...state, recentActivity: recent(action.message, state.recentActivity) };
    default:
      return state;
  }
}
