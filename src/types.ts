export type MissionStatus = "locked" | "available" | "active" | "completed" | "incomplete";
export type LearningPathStatus = "completed" | "active" | "unlocked" | "locked" | "coming-soon";
export type StoreCategory = "hair" | "top" | "bottom" | "shoes" | "accessory";

export interface DemoUser {
  id: string;
  name: string;
  username: string;
  email: string;
  level: number;
  xp: number;
  coins: number;
  hearts: number;
  streakDays: number;
}

export interface AvatarConfig {
  skinToneId: string;
  hairId: string;
  topId: string;
  bottomId: string;
  shoesId: string;
  accessoryId: string | null;
}

export interface AvatarOption {
  id: string;
  label: string;
  category: "skin" | StoreCategory;
  color: string;
  price?: number;
  isOwnedByDefault: boolean;
}

export interface StoreItem {
  id: string;
  name: string;
  category: StoreCategory;
  price: number;
  isOwnedByDefault: boolean;
}

export interface MissionObjective {
  id: string;
  label: string;
  keywords: string[];
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  npcId: string;
  npcName: string;
  difficulty: "Pemula" | "Mudah";
  rewardXp: number;
  rewardCoins: number;
  objectives: MissionObjective[];
  suggestedSentences: string[];
}

export interface NpcCharacter {
  id: string;
  name: string;
  personality: string;
  position: [number, number, number];
  missionId: string;
  zone: string;
}

export interface FriendPreview {
  id: string;
  name: string;
  activity: string;
  online: boolean;
  color: string;
}

export interface MissionProgress {
  completedObjectiveIds: string[];
  status: MissionStatus;
}

export type LessonExerciseType = "multiple-choice" | "word-order";

export interface LessonChoiceOption {
  id: string;
  label: string;
}

export interface LessonExercise {
  id: string;
  type: LessonExerciseType;
  prompt: string;
  /** multiple-choice only */
  options?: LessonChoiceOption[];
  correctOptionId?: string;
  /** word-order only */
  wordBank?: string[];
  correctOrder?: string[];
}

export interface LessonUnit {
  id: string;
  title: string;
  description: string;
  relatedMissionId: string;
  rewardXp: number;
  exercises: LessonExercise[];
}

export interface ConversationMessage {
  id: string;
  sender: "player" | "npc" | "system";
  content: string;
  createdAt: number;
}

export interface DemoState {
  schemaVersion: 1;
  isAuthenticated: boolean;
  user: DemoUser;
  avatar: AvatarConfig;
  inventory: string[];
  activeMissionId: string;
  missionProgress: Record<string, MissionProgress>;
  completedMissionIds: string[];
  claimedRewards: string[];
  completedLessonIds: string[];
  recentActivity: string[];
}

export type DemoStorageStatus = "initialized" | "loaded" | "recovered" | "unavailable" | "saved";

export interface DemoStorageMeta {
  key: string;
  status: DemoStorageStatus;
  message: string;
}
