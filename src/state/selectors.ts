import { avatarOptions, missions, storeItems } from "../data/demoData";
import type { DemoState, Mission, MissionStatus, StoreItem } from "../types";

export interface MissionSummary {
  mission: Mission;
  status: MissionStatus;
  completedObjectives: number;
  totalObjectives: number;
  isRewardClaimed: boolean;
}

export interface StoreItemSummary {
  item: StoreItem;
  isOwned: boolean;
  canAfford: boolean;
}

export function selectMissionSummaries(state: DemoState): MissionSummary[] {
  return missions.map((mission) => {
    const lockedByCondition = mission.id === "weekend" && !state.completedMissionIds.includes("intro");
    const progress = state.missionProgress[mission.id];
    const status = lockedByCondition ? "locked" : progress?.status ?? "incomplete";

    return {
      mission,
      status,
      completedObjectives: progress?.completedObjectiveIds.length ?? 0,
      totalObjectives: mission.objectives.length,
      isRewardClaimed: state.claimedRewards.includes(mission.id),
    };
  });
}

export function selectActiveMissionSummary(state: DemoState): MissionSummary {
  return selectMissionSummaries(state).find((summary) => summary.mission.id === state.activeMissionId) ?? selectMissionSummaries(state)[0];
}

export function selectOwnedAvatarOptions(state: DemoState) {
  return avatarOptions.filter((option) => option.category === "skin" || state.inventory.includes(option.id));
}

export function selectStoreItemSummaries(state: DemoState): StoreItemSummary[] {
  return storeItems.map((item) => ({
    item,
    isOwned: state.inventory.includes(item.id),
    canAfford: state.user.coins >= item.price,
  }));
}

export function selectStateSnapshot(state: DemoState) {
  return {
    user: `${state.user.name} / ${state.user.username}`,
    level: state.user.level,
    xp: state.user.xp,
    coins: state.user.coins,
    activeMissionId: state.activeMissionId,
    inventoryCount: state.inventory.length,
    completedMissionCount: state.completedMissionIds.length,
    claimedRewardCount: state.claimedRewards.length,
  };
}
