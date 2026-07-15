import type {
  AvatarConfig,
  AvatarOption,
  DemoState,
  DemoUser,
  FriendPreview,
  LearningPathStatus,
  Mission,
  NpcCharacter,
  StoreItem,
} from "../types";

export const DEMO_EMAIL = "demo@lingoland.app";
export const DEMO_PASSWORD = "Demo123!";
export const STORAGE_KEY = "lingoland_demo_v1";

export const defaultUser: DemoUser = {
  id: "demo-user",
  name: "Raka Demo",
  username: "raka.demo",
  email: DEMO_EMAIL,
  level: 2,
  xp: 120,
  coins: 15000,
  hearts: 5,
  streakDays: 3,
};

export const defaultAvatar: AvatarConfig = {
  skinToneId: "skin-medium",
  hairId: "hair-short-black",
  topId: "top-hoodie-lavender",
  bottomId: "bottom-dark-pants",
  shoesId: "shoes-white",
  accessoryId: null,
};

export const avatarOptions: AvatarOption[] = [
  { id: "skin-light", label: "Light", category: "skin", color: "#F4C7A1", isOwnedByDefault: true },
  { id: "skin-medium", label: "Medium", category: "skin", color: "#C98B5A", isOwnedByDefault: true },
  { id: "skin-tan", label: "Tan", category: "skin", color: "#9F623B", isOwnedByDefault: true },
  { id: "skin-dark", label: "Dark", category: "skin", color: "#6F422B", isOwnedByDefault: true },
  { id: "hair-short-black", label: "Short Black", category: "hair", color: "#18151A", isOwnedByDefault: true },
  { id: "hair-bob-brown", label: "Bob Brown", category: "hair", color: "#7B4932", isOwnedByDefault: true },
  { id: "hair-curly-dark", label: "Curly Dark", category: "hair", color: "#26202A", isOwnedByDefault: true },
  { id: "top-hoodie-lavender", label: "Hoodie Lavender", category: "top", color: "#7868F8", price: 300, isOwnedByDefault: true },
  { id: "top-basic-tee", label: "Kaos Basic", category: "top", color: "#EAF2FF", isOwnedByDefault: true },
  { id: "top-varsity", label: "Jaket Kampus", category: "top", color: "#3D78D8", price: 450, isOwnedByDefault: false },
  { id: "bottom-dark-pants", label: "Celana Gelap", category: "bottom", color: "#27262D", isOwnedByDefault: true },
  { id: "bottom-blue-jeans", label: "Jeans Biru", category: "bottom", color: "#3D78D8", isOwnedByDefault: true },
  { id: "bottom-casual-skirt", label: "Rok Casual", category: "bottom", color: "#35B86B", isOwnedByDefault: true },
  { id: "shoes-white", label: "Sneakers Putih", category: "shoes", color: "#FFFFFF", isOwnedByDefault: true },
  { id: "shoes-black", label: "Sneakers Hitam", category: "shoes", color: "#18151A", price: 350, isOwnedByDefault: false },
  { id: "accessory-round-glasses", label: "Kacamata Bulat", category: "accessory", color: "#27262D", price: 180, isOwnedByDefault: false },
  { id: "accessory-mini-home-cap", label: "Topi Mini Home", category: "accessory", color: "#F4C84A", price: 250, isOwnedByDefault: false },
];

export const missions: Mission[] = [
  {
    id: "intro",
    title: "Perkenalan Diri",
    description: "Perkenalkan dirimu dalam minimal tiga kalimat.",
    npcId: "bintang",
    npcName: "Bintang",
    difficulty: "Pemula",
    rewardXp: 50,
    rewardCoins: 20,
    objectives: [
      { id: "name", label: "Sampaikan nama", keywords: ["my name", "i am", "call me"] },
      { id: "origin", label: "Sampaikan asal atau kampus", keywords: ["from", "live in", "study at"] },
      { id: "interest", label: "Sampaikan satu hal yang disukai", keywords: ["like", "love", "enjoy", "hobby"] },
    ],
    suggestedSentences: ["My name is Raka.", "I am from Surabaya.", "I like playing games."],
  },
  {
    id: "hobby",
    title: "Hobi Favorit",
    description: "Tanyakan hobi NPC, ceritakan hobi sendiri, dan beri pertanyaan lanjutan.",
    npcId: "lala",
    npcName: "Lala",
    difficulty: "Mudah",
    rewardXp: 70,
    rewardCoins: 30,
    objectives: [
      { id: "ask-hobby", label: "Tanyakan hobi NPC", keywords: ["what do you like", "your hobby", "like to do"] },
      { id: "own-hobby", label: "Ceritakan hobi sendiri", keywords: ["my hobby", "i like", "i enjoy", "i love"] },
      { id: "follow-up", label: "Beri satu pertanyaan lanjutan", keywords: ["how often", "why", "when do you"] },
    ],
    suggestedSentences: ["What do you like to do?", "My hobby is drawing.", "How often do you do it?"],
  },
  {
    id: "weekend",
    title: "Rencana Akhir Pekan",
    description: "Tanyakan rencana akhir pekan dan tutup percakapan dengan sopan.",
    npcId: "benny",
    npcName: "Benny",
    difficulty: "Mudah",
    rewardXp: 90,
    rewardCoins: 40,
    objectives: [
      { id: "ask-plan", label: "Tanyakan rencana akhir pekan", keywords: ["what will you do", "weekend", "plan"] },
      { id: "own-plan", label: "Jelaskan rencana sendiri", keywords: ["i will", "i am going", "visit"] },
      { id: "polite-close", label: "Tutup percakapan dengan sopan", keywords: ["see you", "sounds great", "thank you", "later"] },
    ],
    suggestedSentences: ["What will you do this weekend?", "I will visit my family.", "That sounds great. See you later."],
  },
];

export const npcs: NpcCharacter[] = [
  { id: "bintang", name: "Bintang", personality: "Ramah dan membantu pemula.", position: [-3.2, 0, -1.4], missionId: "intro", zone: "Ruang tamu" },
  { id: "lala", name: "Lala", personality: "Aktif dan komunikatif.", position: [2.7, 0, -2.2], missionId: "hobby", zone: "Area belajar" },
  { id: "benny", name: "Benny", personality: "Santai dan informal.", position: [2.9, 0, 2.5], missionId: "weekend", zone: "Taman" },
];

export const storeItems: StoreItem[] = [
  { id: "top-hoodie-lavender", name: "Hoodie Lavender", category: "top", price: 300, isOwnedByDefault: true },
  { id: "top-varsity", name: "Jaket Varsity", category: "top", price: 450, isOwnedByDefault: false },
  { id: "accessory-round-glasses", name: "Kacamata Bulat", category: "accessory", price: 180, isOwnedByDefault: false },
  { id: "accessory-mini-home-cap", name: "Topi Mini Home", category: "accessory", price: 250, isOwnedByDefault: false },
  { id: "shoes-black", name: "Sneakers Hitam", category: "shoes", price: 350, isOwnedByDefault: false },
];

export const friends: FriendPreview[] = [
  { id: "afiana", name: "Afiana", activity: "membaca objective speaking.", online: true, color: "#35B86B" },
  { id: "benny-friend", name: "Benny", activity: "sedang di Mini Home.", online: true, color: "#3D78D8" },
  { id: "lala-friend", name: "Lala", activity: "latihan hobi favorit.", online: true, color: "#F4C84A" },
  { id: "lulu", name: "Lulu", activity: "menyimpan avatar baru.", online: false, color: "#EC5C6C" },
  { id: "bintang-friend", name: "Bintang", activity: "menunggu percakapan.", online: true, color: "#7868F8" },
  { id: "moker", name: "Moker", activity: "menyelesaikan daily challenge.", online: false, color: "#D99A24" },
];

export const learningPath: Array<{ id: string; title: string; status: LearningPathStatus }> = [
  { id: "basic", title: "Dasar Percakapan", status: "completed" },
  { id: "intro-path", title: "Perkenalan Diri", status: "active" },
  { id: "hobby-path", title: "Hobi dan Minat", status: "unlocked" },
  { id: "daily", title: "Percakapan Sehari-hari", status: "locked" },
  { id: "interview", title: "Interview Kerja", status: "coming-soon" },
  { id: "presentation", title: "Presentasi Profesional", status: "coming-soon" },
];

export function createInitialState(isAuthenticated = false): DemoState {
  return {
    schemaVersion: 1,
    isAuthenticated,
    user: { ...defaultUser },
    avatar: { ...defaultAvatar },
    inventory: avatarOptions.filter((item) => item.isOwnedByDefault).map((item) => item.id),
    activeMissionId: "intro",
    missionProgress: {
      intro: { completedObjectiveIds: [], status: "available" },
      hobby: { completedObjectiveIds: [], status: "available" },
      weekend: { completedObjectiveIds: [], status: "locked" },
    },
    completedMissionIds: [],
    claimedRewards: [],
    recentActivity: [
      "Misi Perkenalan Diri belum selesai.",
      "Kamu memiliki 15.000 koin demo.",
      "Karakter lain dalam versi demo merupakan simulasi.",
    ],
  };
}
