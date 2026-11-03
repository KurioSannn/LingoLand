import { describe, expect, it } from "vitest";
import { createInitialState } from "../../src/data/demoData";
import {
  selectActiveMissionSummary,
  selectLearningPath,
  selectLessonUnit,
  selectLessonUnitSummaries,
  selectMissionSummaries,
  selectOwnedAvatarOptions,
  selectStoreItemSummaries,
} from "../../src/state/selectors";

describe("selectors", () => {
  it("selects mission summaries with correct progress and locking", () => {
    const state = createInitialState(true);
    const summaries = selectMissionSummaries(state);

    expect(summaries).toHaveLength(3);
    expect(summaries[0].mission.id).toBe("intro");
    expect(summaries[0].status).toBe("available");
    expect(summaries[2].mission.id).toBe("weekend");
    expect(summaries[2].status).toBe("locked");
  });

  it("selects active mission summary", () => {
    const state = createInitialState(true);
    const active = selectActiveMissionSummary(state);
    expect(active.mission.id).toBe("intro");
  });

  it("selects lesson units with linear unlocking", () => {
    const state = createInitialState(true);
    const units = selectLessonUnitSummaries(state);

    expect(units).toHaveLength(3);
    // Unit 0 should be unlocked
    expect(units[0].status).toBe("unlocked");

    // Unit 1 is locked because Unit 0 is not yet completed
    expect(units[1].status).toBe("locked");

    // After completing Unit 0:
    const updatedState = {
      ...state,
      completedLessonIds: ["lesson-intro"],
    };
    const updatedUnits = selectLessonUnitSummaries(updatedState);
    expect(updatedUnits[0].status).toBe("completed");
    expect(updatedUnits[1].status).toBe("unlocked");
  });

  it("selects single lesson unit by id", () => {
    const state = createInitialState(true);
    const unit = selectLessonUnit(state, "lesson-intro");
    expect(unit).not.toBeNull();
    expect(unit?.unit.title).toBe("Perkenalan Diri");

    const missing = selectLessonUnit(state, "non-existent");
    expect(missing).toBeNull();
  });

  it("selects learning path item summaries including coming-soon markers", () => {
    const state = createInitialState(true);
    const path = selectLearningPath(state);

    expect(path.length).toBeGreaterThan(3);
    expect(path[0].status).toBe("completed"); // onboarding baseline is always completed
    const interview = path.find((item) => item.id === "interview");
    expect(interview?.status).toBe("coming-soon");
  });

  it("selects owned avatar options and store summaries", () => {
    const state = createInitialState(true);
    const owned = selectOwnedAvatarOptions(state);
    expect(owned.length).toBeGreaterThan(0);

    const store = selectStoreItemSummaries(state);
    expect(store.length).toBeGreaterThan(0);
    const varsity = store.find((item) => item.item.id === "top-varsity");
    expect(varsity?.isOwned).toBe(false);
  });
});
