import { describe, expect, it } from "vitest";
import { createInitialState } from "../../src/data/demoData";
import { demoReducer } from "../../src/state/demoReducer";

describe("demoReducer", () => {
  it("handles LOGIN_DEMO as isolated guest mode", () => {
    const initial = createInitialState(false);
    expect(initial.isAuthenticated).toBe(false);

    const loggedIn = demoReducer(initial, { type: "LOGIN_DEMO" });
    expect(loggedIn.isAuthenticated).toBe(true);
    expect(loggedIn.isGuest).toBe(true);
    expect(loggedIn.user.id).toBe("guest-user");

    const loggedOut = demoReducer(loggedIn, { type: "LOGOUT" });
    expect(loggedOut.isAuthenticated).toBe(false);
    expect(loggedOut.isGuest).toBe(false);
  });

  it("handles LOGIN_WITH_CREDENTIALS for any registered user email", () => {
    const initial = createInitialState(false);
    const result = demoReducer(initial, {
      type: "LOGIN_WITH_CREDENTIALS",
      email: "user@example.com",
    });
    expect(result.isAuthenticated).toBe(true);
    expect(result.isGuest).toBe(false);
    expect(result.user.email).toBe("user@example.com");
  });

  it("handles RESET_PROGRESS restoring initial values", () => {
    const dirty = {
      ...createInitialState(true),
      inventory: ["custom-item"],
      claimedRewards: ["intro"],
    };

    const reset = demoReducer(dirty, { type: "RESET_PROGRESS" });
    expect(reset.isAuthenticated).toBe(true);
    expect(reset.claimedRewards).toHaveLength(0);
    expect(reset.inventory).not.toContain("custom-item");
  });

  it("handles BUY_ITEM and prevents duplicate or unaffordable purchases", () => {
    const state = createInitialState(true);
    const initialCoins = state.user.coins;

    const bought = demoReducer(state, {
      type: "BUY_ITEM",
      itemId: "top-varsity",
      price: 450,
      itemName: "Jaket Kampus",
    });
    expect(bought.user.coins).toBe(initialCoins - 450);
    expect(bought.inventory).toContain("top-varsity");

    // Attempting to buy again shouldn't deduct coins
    const repeat = demoReducer(bought, {
      type: "BUY_ITEM",
      itemId: "top-varsity",
      price: 450,
      itemName: "Jaket Kampus",
    });
    expect(repeat.user.coins).toBe(initialCoins - 450);

    // Unaffordable item
    const poorState = { ...state, user: { ...state.user, coins: 10 } };
    const failedBuy = demoReducer(poorState, {
      type: "BUY_ITEM",
      itemId: "shoes-black",
      price: 350,
      itemName: "Sneakers Hitam",
    });
    expect(failedBuy.user.coins).toBe(10);
    expect(failedBuy.inventory).not.toContain("shoes-black");
  });

  it("handles CLAIM_REWARD with once-only protection and unlocks weekend mission", () => {
    const state = createInitialState(true);
    const claimed = demoReducer(state, {
      type: "CLAIM_REWARD",
      missionId: "intro",
      xp: 50,
      coins: 20,
      missionTitle: "Perkenalan Diri",
    });

    expect(claimed.claimedRewards).toContain("intro");
    expect(claimed.completedMissionIds).toContain("intro");
    expect(claimed.user.xp).toBe(state.user.xp + 50);
    expect(claimed.user.coins).toBe(state.user.coins + 20);
    expect(claimed.missionProgress.weekend.status).toBe("available");

    // Repeated claim should not add rewards
    const repeatClaim = demoReducer(claimed, {
      type: "CLAIM_REWARD",
      missionId: "intro",
      xp: 50,
      coins: 20,
      missionTitle: "Perkenalan Diri",
    });
    expect(repeatClaim.user.xp).toBe(claimed.user.xp);
    expect(repeatClaim.user.coins).toBe(claimed.user.coins);
  });

  it("handles COMPLETE_LESSON with once-only reward protection", () => {
    const state = createInitialState(true);
    const initialXp = state.user.xp;

    const completed = demoReducer(state, {
      type: "COMPLETE_LESSON",
      lessonUnitId: "lesson-intro",
      xp: 15,
      lessonTitle: "Perkenalan Diri",
    });

    expect(completed.completedLessonIds).toContain("lesson-intro");
    expect(completed.user.xp).toBe(initialXp + 15);

    // Repeated completion must not grant duplicate XP
    const repeat = demoReducer(completed, {
      type: "COMPLETE_LESSON",
      lessonUnitId: "lesson-intro",
      xp: 15,
      lessonTitle: "Perkenalan Diri",
    });
    expect(repeat.user.xp).toBe(initialXp + 15);
  });

  it("handles HYDRATE_REMOTE", () => {
    const state = createInitialState(false);
    const hydrated = demoReducer(state, {
      type: "HYDRATE_REMOTE",
      userId: "user-uuid-123",
      user: {
        name: "Test User",
        username: "test.user",
        level: 3,
        xp: 350,
        coins: 8000,
        hearts: 5,
        streakDays: 4,
      },
    });

    expect(hydrated.isAuthenticated).toBe(true);
    expect(hydrated.user.id).toBe("user-uuid-123");
    expect(hydrated.user.name).toBe("Test User");
    expect(hydrated.user.level).toBe(3);
  });

  it("handles SET_WALLET_BALANCES with server-authoritative numbers", () => {
    const state = createInitialState(true);
    const updated = demoReducer(state, {
      type: "SET_WALLET_BALANCES",
      coins: 1540,
      xp: 620,
      level: 4,
    });

    expect(updated.user.coins).toBe(1540);
    expect(updated.user.xp).toBe(620);
    expect(updated.user.level).toBe(4);
  });
});
