export type MissionStatus = "locked" | "available" | "active" | "completed" | "incomplete";
export type LearningPathStatus = "completed" | "active" | "unlocked" | "locked" | "coming-soon";
export type StoreCategory = "hair" | "top" | "bottom" | "shoes" | "accessory";
export type UserRole = "user" | "moderator" | "admin";

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
  isGuest?: boolean;
  role?: UserRole;
  displayName?: string;
  isPrivate?: boolean;
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

export type LessonExerciseType = "multiple-choice" | "word-order" | "fill-blank" | "listening" | "speaking";

export type ContentStatus = "draft" | "published" | "archived";

export interface Course {
  id: string;
  slug: string;
  title: string;
  language: string;
  description: string | null;
  status: ContentStatus;
  sortOrder: number;
}

export interface CurriculumUnitRecord {
  id: string;
  courseId: string;
  slug: string;
  title: string;
  description: string | null;
  levelCefr: string;
  orderIndex: number;
  unlockPolicy: "always_unlocked" | "previous_completed" | "admin_only";
  relatedMissionId: string | null;
  status: ContentStatus;
}

export interface CurriculumLessonRecord {
  id: string;
  unitId: string;
  title: string;
  description: string | null;
  rewardXp: number;
  passThreshold: number;
  status: ContentStatus;
  version: number;
  orderIndex: number;
}

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
  lessonId?: string;
  title: string;
  description: string;
  relatedMissionId: string;
  rewardXp: number;
  passThreshold?: number;
  unlockPolicy?: "always_unlocked" | "previous_completed" | "admin_only";
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
  isGuest?: boolean;
  user: DemoUser;
  avatar: AvatarConfig;
  inventory: string[];
  activeMissionId: string;
  missionProgress: Record<string, MissionProgress>;
  completedMissionIds: string[];
  claimedRewards: string[];
  completedLessonIds: string[];
  curriculumUnits?: LessonUnit[];
  recentActivity: string[];
}

export type DemoStorageStatus = "initialized" | "loaded" | "recovered" | "unavailable" | "saved";

export interface DemoStorageMeta {
  key: string;
  status: DemoStorageStatus;
  message: string;
}
