import { useMemo } from "react";
import { useDemo } from "../state/DemoContext";
import {
  selectActiveMissionSummary,
  selectLearningPath,
  selectLessonUnitSummaries,
  selectMissionSummaries,
  selectOwnedAvatarOptions,
  selectStateSnapshot,
  selectStoreItemSummaries,
} from "../state/selectors";
import type { AvatarConfig } from "../types";

// Resetting progress touches Supabase (clear remote rows, re-seed the still-active
// session) — that lives solely in useDemoAuth.resetProgress so there is one path,
// not two reset implementations that could drift (the old copy here only ever
// cleared localStorage and never synced the Supabase side).
export function useDemoStorage() {
  const { state, dispatch, storageMeta } = useDemo();

  const selectors = useMemo(() => ({
    activeMission: selectActiveMissionSummary(state),
    missionSummaries: selectMissionSummaries(state),
    learningPath: selectLearningPath(state),
    lessonUnitSummaries: selectLessonUnitSummaries(state),
    ownedAvatarOptions: selectOwnedAvatarOptions(state),
    storeItems: selectStoreItemSummaries(state),
    snapshot: selectStateSnapshot(state),
  }), [state]);

  return {
    state,
    storageMeta,
    ...selectors,
    setActiveMission: (missionId: string) => dispatch({ type: "SET_ACTIVE_MISSION", missionId }),
    saveAvatar: (avatar: AvatarConfig) => dispatch({ type: "SAVE_AVATAR", avatar }),
    buyItem: (itemId: string, price: number, itemName: string) => dispatch({ type: "BUY_ITEM", itemId, price, itemName }),
    addActivity: (message: string) => dispatch({ type: "ADD_ACTIVITY", message }),
    completeLesson: (lessonUnitId: string, xp: number, lessonTitle: string) =>
      dispatch({ type: "COMPLETE_LESSON", lessonUnitId, xp, lessonTitle }),
  };
}
