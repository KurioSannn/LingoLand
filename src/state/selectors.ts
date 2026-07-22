import { avatarOptions, learningPath, lessonUnits, missions, storeItems } from "../data/demoData";
import type { DemoState, LearningPathStatus, LessonUnit, Mission, MissionStatus, StoreItem } from "../types";

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

export interface LearningPathItemSummary {
  id: string;
  title: string;
  status: LearningPathStatus;
  lessonUnitId: string | null;
}

export interface LessonUnitSummary {
  unit: LessonUnit;
  status: "locked" | "unlocked" | "completed";
}

// A linear, self-contained exercise track: unit N unlocks once unit N-1 is
// completed. Deliberately independent from mission/World progress — see
// learningPath's comment in data/demoData.ts for why.
export function selectLessonUnitSummaries(state: DemoState): LessonUnitSummary[] {
  return lessonUnits.map((unit, index) => {
    if (state.completedLessonIds.includes(unit.id)) return { unit, status: "completed" };
    const previousUnit = lessonUnits[index - 1];
    const isReachable = index === 0 || (previousUnit ? state.completedLessonIds.includes(previousUnit.id) : true);
    return { unit, status: isReachable ? "unlocked" : "locked" };
  });
}

export function selectLessonUnit(state: DemoState, unitId: string): LessonUnitSummary | null {
  return selectLessonUnitSummaries(state).find((summary) => summary.unit.id === unitId) ?? null;
}

export function selectLearningPath(state: DemoState): LearningPathItemSummary[] {
  const lessonSummaries = selectLessonUnitSummaries(state);

  return learningPath.map((item) => {
    if (item.comingSoon) return { id: item.id, title: item.title, status: "coming-soon", lessonUnitId: null };
    if (!item.lessonUnitId) return { id: item.id, title: item.title, status: "completed", lessonUnitId: null };

    const summary = lessonSummaries.find((entry) => entry.unit.id === item.lessonUnitId);
    const status: LearningPathStatus = summary?.status ?? "locked";
    return { id: item.id, title: item.title, status, lessonUnitId: item.lessonUnitId };
  });
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
