import { useMemo } from "react";
import { clearDemoState } from "../lib/storage";
import { useDemo } from "../state/DemoContext";
import { selectActiveMissionSummary, selectMissionSummaries, selectOwnedAvatarOptions, selectStateSnapshot, selectStoreItemSummaries } from "../state/selectors";
import type { AvatarConfig } from "../types";

export function useDemoStorage() {
  const { state, dispatch, storageMeta } = useDemo();

  const selectors = useMemo(() => ({
    activeMission: selectActiveMissionSummary(state),
    missionSummaries: selectMissionSummaries(state),
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
    resetProgress: () => {
      clearDemoState();
      dispatch({ type: "RESET_PROGRESS" });
    },
  };
}
