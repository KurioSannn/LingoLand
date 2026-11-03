import { missions } from "../data/demoData";
import { evaluateMissionInput } from "./game";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

export interface ClaimMissionResult {
  ok: boolean;
  message: string;
  alreadyClaimed?: boolean;
  gainedCoins?: number;
  gainedXp?: number;
  coins?: number;
  xp?: number;
  level?: number;
}

export interface VerifyMissionObjectiveResult {
  ok: boolean;
  missionId: string;
  completedObjectiveIds: string[];
  totalObjectives: number;
  allCompleted: boolean;
  status: "locked" | "available" | "active" | "completed" | "incomplete";
  message?: string;
}

export interface BuyStoreItemResult {
  ok: boolean;
  message: string;
  itemId?: string;
  coins?: number;
}

export interface CompleteLessonResult {
  ok: boolean;
  message: string;
  alreadyRewarded?: boolean;
  gainedXp?: number;
  xp?: number;
  level?: number;
}

export interface WalletTransactionRecord {
  id: number;
  userId: string;
  sourceType: "mission_reward" | "lesson_reward" | "store_purchase" | "admin_adjustment" | "initial_grant";
  sourceId: string;
  deltaCoins: number;
  deltaXp: number;
  idempotencyKey: string;
  createdAt: string;
}

export interface ClaimMissionParams {
  missionId: string;
  fallbackReward: { xp: number; coins: number; title: string };
  isGuest?: boolean;
}

export interface VerifyMissionObjectiveParams {
  missionId: string;
  userInput: string;
  currentCompletedIds?: string[];
  isGuest?: boolean;
}

export interface BuyStoreItemParams {
  itemId: string;
  fallbackPrice: number;
  fallbackName: string;
  currentCoins: number;
  alreadyOwned: boolean;
  isGuest?: boolean;
}

export interface CompleteLessonParams {
  lessonUnitId: string;
  score?: number;
  fallbackReward: { xp: number; title: string };
  alreadyCompleted: boolean;
  isGuest?: boolean;
}

export async function verifyMissionObjective(
  params: VerifyMissionObjectiveParams,
): Promise<VerifyMissionObjectiveResult> {
  const { missionId, userInput, currentCompletedIds = [], isGuest } = params;

  if (!isSupabaseConfigured || !supabase || isGuest) {
    const mission = missions.find((m) => m.id === missionId);
    if (!mission) {
      return {
        ok: false,
        missionId,
        completedObjectiveIds: currentCompletedIds,
        totalObjectives: 0,
        allCompleted: false,
        status: "incomplete",
        message: "Definisi misi tidak ditemukan.",
      };
    }

    const nextIds = evaluateMissionInput(mission, userInput, currentCompletedIds);
    const allCompleted = nextIds.length >= mission.objectives.length;
    return {
      ok: true,
      missionId,
      completedObjectiveIds: nextIds,
      totalObjectives: mission.objectives.length,
      allCompleted,
      status: allCompleted ? "completed" : "active",
    };
  }

  const { data, error } = await supabase.rpc("verify_mission_objective_atomic", {
    p_mission_id: missionId,
    p_user_input: userInput,
  });

  if (error) {
    throw new Error(`Gagal memverifikasi objektif misi di server: ${error.message}`);
  }

  const res = data as {
    ok: boolean;
    mission_id?: string;
    completed_objective_ids?: string[];
    total_objectives?: number;
    all_completed?: boolean;
    status?: "locked" | "available" | "active" | "completed" | "incomplete";
    message?: string;
  };

  return {
    ok: res.ok,
    missionId: res.mission_id ?? missionId,
    completedObjectiveIds: res.completed_objective_ids ?? currentCompletedIds,
    totalObjectives: res.total_objectives ?? 0,
    allCompleted: Boolean(res.all_completed),
    status: res.status ?? "active",
    message: res.message,
  };
}

export async function claimMissionReward(params: ClaimMissionParams): Promise<ClaimMissionResult> {
  const { missionId, fallbackReward, isGuest } = params;

  if (!isSupabaseConfigured || !supabase || isGuest) {
    return {
      ok: true,
      message: `Reward misi ${fallbackReward.title} berhasil diklaim!`,
      gainedCoins: fallbackReward.coins,
      gainedXp: fallbackReward.xp,
    };
  }

  const { data, error } = await supabase.rpc("claim_mission_reward_atomic", {
    p_mission_id: missionId,
  });

  if (error) {
    throw new Error(`Gagal mengklaim reward misi: ${error.message}`);
  }

  const res = data as {
    ok: boolean;
    message: string;
    already_claimed?: boolean;
    gained_coins?: number;
    gained_xp?: number;
    coins?: number;
    xp?: number;
    level?: number;
  };

  return {
    ok: res.ok,
    message: res.message,
    alreadyClaimed: res.already_claimed,
    gainedCoins: res.gained_coins,
    gainedXp: res.gained_xp,
    coins: res.coins,
    xp: res.xp,
    level: res.level,
  };
}

export async function buyStoreItem(params: BuyStoreItemParams): Promise<BuyStoreItemResult> {
  const { itemId, fallbackPrice, fallbackName, currentCoins, alreadyOwned, isGuest } = params;

  if (alreadyOwned) {
    return { ok: false, message: "Item sudah dimiliki di inventori kamu." };
  }

  if (!isSupabaseConfigured || !supabase || isGuest) {
    if (currentCoins < fallbackPrice) {
      return { ok: false, message: "Koin tidak cukup untuk membeli item ini." };
    }
    return {
      ok: true,
      message: `${fallbackName} berhasil dibeli!`,
      itemId,
      coins: currentCoins - fallbackPrice,
    };
  }

  const { data, error } = await supabase.rpc("buy_store_item_atomic", {
    p_item_id: itemId,
  });

  if (error) {
    throw new Error(`Gagal membeli item: ${error.message}`);
  }

  const res = data as {
    ok: boolean;
    message: string;
    item_id?: string;
    coins?: number;
  };

  return {
    ok: res.ok,
    message: res.message,
    itemId: res.item_id ?? itemId,
    coins: res.coins,
  };
}

/**
 * Guest-only local lesson completion helper.
 * Authenticated users MUST complete and grade lessons exclusively via
 * `submitLessonAttempt` (`grade_lesson_attempt_atomic`).
 */
export async function completeLessonReward(params: CompleteLessonParams): Promise<CompleteLessonResult> {
  const { fallbackReward, alreadyCompleted, isGuest } = params;

  if (!isSupabaseConfigured || !supabase || isGuest) {
    if (alreadyCompleted) {
      return {
        ok: true,
        message: "Latihan ulang selesai (reward XP hanya diberikan pada penyelesaian pertama).",
        alreadyRewarded: true,
        gainedXp: 0,
      };
    }
    return {
      ok: true,
      message: `Lesson ${fallbackReward.title} selesai!`,
      gainedXp: fallbackReward.xp,
    };
  }

  throw new Error(
    "Akses ditolak: Penyelesaian lesson akun autentikasi wajib melalui evaluasi server (grade_lesson_attempt_atomic).",
  );
}

export async function fetchWalletTransactions(userId: string): Promise<WalletTransactionRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Gagal mengambil riwayat transaksi dompet: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    deltaCoins: row.delta_coins,
    deltaXp: row.delta_xp,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
  }));
}
