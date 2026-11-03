import { describe, expect, it } from "vitest";
import { missions } from "../../src/data/demoData";
import {
  calculateLevel,
  evaluateMissionInput,
  formatCoins,
  getNextLevelTarget,
  normalizeSentence,
  npcReply,
} from "../../src/lib/game";

describe("game logic", () => {
  it("normalizes sentences properly", () => {
    expect(normalizeSentence("Hello,   World! I'm here.")).toBe("hello world i m here");
  });

  it("evaluates mission keywords correctly", () => {
    const introMission = missions[0]; // intro mission: name, origin, interest
    const completedInitial: string[] = [];

    const afterFirstSentence = evaluateMissionInput(introMission, "My name is Raka.", completedInitial);
    expect(afterFirstSentence).toContain("name");
    expect(afterFirstSentence).not.toContain("origin");

    const afterSecondSentence = evaluateMissionInput(introMission, "I live in Surabaya and enjoy games.", afterFirstSentence);
    expect(afterSecondSentence).toContain("name");
    expect(afterSecondSentence).toContain("origin");
    expect(afterSecondSentence).toContain("interest");
  });

  it("calculates levels and level targets based on XP thresholds", () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(99)).toBe(1);
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(299)).toBe(2);
    expect(calculateLevel(300)).toBe(3);
    expect(calculateLevel(600)).toBe(4);
    expect(calculateLevel(1000)).toBe(5);

    expect(getNextLevelTarget(1)).toBe(100);
    expect(getNextLevelTarget(2)).toBe(300);
    expect(getNextLevelTarget(3)).toBe(600);
    expect(getNextLevelTarget(4)).toBe(1000);
  });

  it("formats coins in Indonesian number format", () => {
    expect(formatCoins(15000)).toBe("15.000");
    expect(formatCoins(500)).toBe("500");
  });

  it("returns suitable NPC replies", () => {
    expect(npcReply("Bintang", "intro", 0, false)).toContain("What is your name");
    expect(npcReply("Bintang", "intro", 3, true)).toContain("completed this mission");
  });
});
