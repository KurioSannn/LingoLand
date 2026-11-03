import { useMemo } from "react";
import { buyStoreItem, claimMissionReward, completeLessonReward } from "../lib/economyRepository";
import { isSupabaseConfigured } from "../lib/supabaseClient";
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
import type { AvatarConfig, LessonUnit } from "../types";

export interface AuthoritativeLessonSync {
  currentXp?: number;
  currentLevel?: number;
  alreadyRewarded?: boolean;
}

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
    setCurriculumUnits: (units: LessonUnit[]) => dispatch({ type: "SET_CURRICULUM_UNITS", units }),
    saveAvatar: (avatar: AvatarConfig) => dispatch({ type: "SAVE_AVATAR", avatar }),
    buyItem: async (itemId: string, price: number, itemName: string) => {
      const isGuest =
        state.isGuest ||
        !state.isAuthenticated ||
        state.user.id === "demo-user" ||
        state.user.id === "guest-user";

      const res = await buyStoreItem({
        itemId,
        fallbackPrice: price,
        fallbackName: itemName,
        currentCoins: state.user.coins,
        alreadyOwned: state.inventory.includes(itemId),
        isGuest,
      });

      if (res.ok) {
        dispatch({ type: "BUY_ITEM", itemId, price, itemName });
        if (res.coins !== undefined) {
          dispatch({ type: "SET_WALLET_BALANCES", coins: res.coins });
        }
      }
      return res;
    },
    addActivity: (message: string) => dispatch({ type: "ADD_ACTIVITY", message }),
    completeLesson: async (
      lessonUnitId: string,
      xp: number,
      lessonTitle: string,
      score: number = 100,
      authoritative?: AuthoritativeLessonSync,
    ) => {
      const isGuest =
        state.isGuest ||
        !state.isAuthenticated ||
        state.user.id === "demo-user" ||
        state.user.id === "guest-user";

      // Authenticated users have already been graded and rewarded atomically on the server
      // via `grade_lesson_attempt_atomic` (`submitLessonAttempt`). Never invoke a second
      // reward RPC from the client.
      if (!isGuest && isSupabaseConfigured) {
        const effectiveXp = authoritative?.alreadyRewarded ? 0 : xp;
        dispatch({
          type: "COMPLETE_LESSON",
          lessonUnitId,
          xp: effectiveXp,
          lessonTitle,
        });
        if (authoritative?.currentXp !== undefined) {
          dispatch({
            type: "SET_WALLET_BALANCES",
            xp: authoritative.currentXp,
            level: authoritative.currentLevel,
          });
        }
        return {
          ok: true,
          message: authoritative?.alreadyRewarded
            ? "Latihan ulang berhasil diselesaikan."
            : `Lesson ${lessonTitle} selesai!`,
          alreadyRewarded: authoritative?.alreadyRewarded ?? false,
          gainedXp: effectiveXp,
          xp: authoritative?.currentXp,
          level: authoritative?.currentLevel,
        };
      }

      // Guest / offline mode local completion
      const res = await completeLessonReward({
        lessonUnitId,
        score,
        fallbackReward: { xp, title: lessonTitle },
        alreadyCompleted: state.completedLessonIds.includes(lessonUnitId),
        isGuest: true,
      });

      if (res.ok) {
        dispatch({ type: "COMPLETE_LESSON", lessonUnitId, xp: res.gainedXp ?? xp, lessonTitle });
        if (res.xp !== undefined && res.level !== undefined) {
          dispatch({ type: "SET_WALLET_BALANCES", xp: res.xp, level: res.level });
        }
      }
      return res;
    },
    claimReward: async (missionId: string, xp: number, coins: number, missionTitle: string) => {
      const isGuest =
        state.isGuest ||
        !state.isAuthenticated ||
        state.user.id === "demo-user" ||
        state.user.id === "guest-user";

      const res = await claimMissionReward({
        missionId,
        fallbackReward: { xp, coins, title: missionTitle },
        isGuest,
      });

      if (res.ok) {
        dispatch({ type: "CLAIM_REWARD", missionId, xp: res.gainedXp ?? xp, coins: res.gainedCoins ?? coins, missionTitle });
        if (res.coins !== undefined && res.xp !== undefined) {
          dispatch({ type: "SET_WALLET_BALANCES", coins: res.coins, xp: res.xp, level: res.level });
        }
      }
      return res;
    },
  };
}
