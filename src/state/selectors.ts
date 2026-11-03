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

function isUnitCompleted(completedIds: string[], unit: LessonUnit): boolean {
  return (
    completedIds.includes(unit.id) ||
    Boolean(unit.lessonId && completedIds.includes(unit.lessonId))
  );
}

// A linear, self-contained exercise track: unit N unlocks once unit N-1 is
// completed (or according to its unlockPolicy). Uses live database curriculum
// units when loaded for authenticated users, falling back to demoData for guest/offline.
export function selectLessonUnitSummaries(state: DemoState): LessonUnitSummary[] {
  const activeUnits =
    !state.isGuest && state.curriculumUnits && state.curriculumUnits.length > 0
      ? state.curriculumUnits
      : lessonUnits;

  return activeUnits.map((unit, index) => {
    if (isUnitCompleted(state.completedLessonIds, unit)) {
      return { unit, status: "completed" };
    }

    if (unit.unlockPolicy === "admin_only") {
      return {
        unit,
        status: state.user.role === "admin" ? "unlocked" : "locked",
      };
    }

    if (unit.unlockPolicy === "always_unlocked" || index === 0) {
      return { unit, status: "unlocked" };
    }

    const previousUnit = activeUnits[index - 1];
    const isReachable = previousUnit
      ? isUnitCompleted(state.completedLessonIds, previousUnit)
      : true;
    return { unit, status: isReachable ? "unlocked" : "locked" };
  });
}

export function selectLessonUnit(state: DemoState, unitId: string): LessonUnitSummary | null {
  return (
    selectLessonUnitSummaries(state).find(
      (summary) => summary.unit.id === unitId || summary.unit.lessonId === unitId,
    ) ?? null
  );
}

export function selectLearningPath(state: DemoState): LearningPathItemSummary[] {
  const lessonSummaries = selectLessonUnitSummaries(state);
  const mappedUnitIds = new Set<string>();

  const baseItems: LearningPathItemSummary[] = [];

  for (const item of learningPath) {
    if (item.comingSoon) continue;
    if (!item.lessonUnitId) {
      baseItems.push({ id: item.id, title: item.title, status: "completed", lessonUnitId: null });
      continue;
    }

    const summary = lessonSummaries.find(
      (entry) =>
        entry.unit.id === item.lessonUnitId || entry.unit.lessonId === item.lessonUnitId,
    );
    if (summary) {
      mappedUnitIds.add(summary.unit.id);
      baseItems.push({
        id: item.id,
        title: summary.unit.title || item.title,
        status: summary.status,
        lessonUnitId: summary.unit.id,
      });
    } else {
      baseItems.push({
        id: item.id,
        title: item.title,
        status: "locked",
        lessonUnitId: item.lessonUnitId,
      });
    }
  }

  // Append any additional dynamic curriculum units added by admins in Supabase
  for (const summary of lessonSummaries) {
    if (!mappedUnitIds.has(summary.unit.id)) {
      baseItems.push({
        id: `path-${summary.unit.id}`,
        title: summary.unit.title,
        status: summary.status,
        lessonUnitId: summary.unit.id,
      });
    }
  }

  // Append coming-soon items at the end of the path
  for (const item of learningPath) {
    if (item.comingSoon) {
      baseItems.push({
        id: item.id,
        title: item.title,
        status: "coming-soon",
        lessonUnitId: null,
      });
    }
  }

  return baseItems;
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
