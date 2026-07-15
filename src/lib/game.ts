import { missions } from "../data/demoData";
import type { DemoState, Mission } from "../types";

export function normalizeSentence(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ");
}

export function evaluateMissionInput(mission: Mission, input: string, completedObjectiveIds: string[]): string[] {
  const normalized = normalizeSentence(input);
  const next = new Set(completedObjectiveIds);

  mission.objectives.forEach((objective) => {
    if (objective.keywords.some((keyword) => normalized.includes(keyword))) {
      next.add(objective.id);
    }
  });

  return Array.from(next);
}

export function getMissionStatus(state: DemoState, missionId: string) {
  const progress = state.missionProgress[missionId];
  if (missionId === "weekend" && !state.completedMissionIds.includes("intro")) {
    return "locked";
  }
  return progress?.status ?? "incomplete";
}

export function getActiveMission(state: DemoState): Mission {
  return missions.find((mission) => mission.id === state.activeMissionId) ?? missions[0];
}

export function calculateLevel(xp: number): number {
  if (xp >= 1000) return 5;
  if (xp >= 600) return 4;
  if (xp >= 300) return 3;
  if (xp >= 100) return 2;
  return 1;
}

export function getNextLevelTarget(level: number): number {
  if (level <= 1) return 100;
  if (level === 2) return 300;
  if (level === 3) return 600;
  if (level === 4) return 1000;
  return 1000;
}

export function formatCoins(coins: number): string {
  return new Intl.NumberFormat("id-ID").format(coins);
}

export function npcReply(npcName: string, missionId: string, objectiveCount: number, isComplete: boolean): string {
  if (isComplete) {
    return `${npcName}: That is great. You completed this mission.`;
  }

  if (missionId === "intro") {
    return ["Nice to meet you. What is your name?", "That sounds interesting. Where are you from?", "What do you like to do?"][Math.min(objectiveCount, 2)];
  }

  if (missionId === "hobby") {
    return ["I like drawing after class.", "That is a fun hobby. Tell me more.", "Good question. I do it twice a week."][Math.min(objectiveCount, 2)];
  }

  return ["I may visit the park this weekend.", "That sounds nice.", "See you later."][Math.min(objectiveCount, 2)];
}
