import type { ContentStatus, UserRole } from "../types";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

export interface AdminSystemStats {
  coursesCount: number;
  unitsCount: number;
  lessonsCount: number;
  questionsCount: number;
  learnersCount: number;
  attemptsCount: number;
}

export interface AdminQuestionItem {
  id: string;
  lessonId: string;
  questionType: "multiple-choice" | "word-order" | "fill-blank" | "listening" | "speaking";
  prompt: string;
  explanation?: string;
  difficulty: string;
  orderIndex: number;
  status: ContentStatus;
  version: number;
  wordBank?: string[];
  options?: Array<{ id: string; label: string; orderIndex: number }>;
  answerKey?: string;
  validationType?: string;
}

export interface AdminAuditLog {
  id: number;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface AdminUserItem {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  coins: number;
  xp: number;
  level: number;
  createdAt?: string;
}

export interface SaveAdminQuestionParams {
  id: string;
  lessonId: string;
  questionType: string;
  prompt: string;
  explanation?: string;
  difficulty?: string;
  orderIndex?: number;
  status?: string;
  wordBank?: string[];
  options?: Array<{ id: string; label: string; orderIndex?: number }>;
  answerKey?: string;
  validationType?: string;
}

export async function fetchAdminStats(): Promise<AdminSystemStats> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      coursesCount: 1,
      unitsCount: 3,
      lessonsCount: 3,
      questionsCount: 9,
      learnersCount: 1,
      attemptsCount: 0,
    };
  }

  const { data, error } = await supabase.rpc("admin_get_system_stats");
  if (error || !data) {
    return {
      coursesCount: 1,
      unitsCount: 3,
      lessonsCount: 3,
      questionsCount: 9,
      learnersCount: 1,
      attemptsCount: 0,
    };
  }

  const res = data as {
    courses_count: number;
    units_count: number;
    lessons_count: number;
    questions_count: number;
    learners_count: number;
    attempts_count: number;
  };

  return {
    coursesCount: res.courses_count,
    unitsCount: res.units_count,
    lessonsCount: res.lessons_count,
    questionsCount: res.questions_count,
    learnersCount: res.learners_count,
    attemptsCount: res.attempts_count,
  };
}

export async function fetchAdminQuestions(): Promise<AdminQuestionItem[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const [questionsRes, optionsRes, keysRes] = await Promise.all([
    supabase.from("curriculum_questions").select("*").order("order_index", { ascending: true }),
    supabase.from("curriculum_question_options").select("*").order("order_index", { ascending: true }),
    supabase.from("curriculum_question_answer_keys").select("*"),
  ]);

  if (questionsRes.error || !questionsRes.data) {
    throw new Error(`Gagal mengambil bank soal admin: ${questionsRes.error?.message}`);
  }

  const optionsMap = new Map<string, Array<{ id: string; label: string; orderIndex: number }>>();
  for (const opt of optionsRes.data ?? []) {
    const qid = opt.question_id as string;
    const list = optionsMap.get(qid) ?? [];
    list.push({
      id: opt.id as string,
      label: opt.label as string,
      orderIndex: opt.order_index as number,
    });
    optionsMap.set(qid, list);
  }

  const keysMap = new Map<string, { expected_answer: string; validation_type: string }>();
  for (const k of keysRes.data ?? []) {
    keysMap.set(k.question_id as string, {
      expected_answer: k.expected_answer as string,
      validation_type: k.validation_type as string,
    });
  }

  return questionsRes.data.map((q) => {
    const key = keysMap.get(q.id as string);
    return {
      id: q.id as string,
      lessonId: q.lesson_id as string,
      questionType: q.question_type as AdminQuestionItem["questionType"],
      prompt: q.prompt as string,
      explanation: q.explanation as string | undefined,
      difficulty: q.difficulty as string,
      orderIndex: q.order_index as number,
      status: q.status as ContentStatus,
      version: q.version as number,
      wordBank: (q.word_bank as string[] | null) ?? [],
      options: optionsMap.get(q.id as string) ?? [],
      answerKey: key?.expected_answer,
      validationType: key?.validation_type,
    };
  });
}

export async function saveAdminQuestion(params: SaveAdminQuestionParams): Promise<{ ok: boolean; message: string; questionId?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: true, message: "Mode demo: Soal tersimpan di memory lokal.", questionId: params.id };
  }

  const { data, error } = await supabase.rpc("admin_save_question", {
    p_id: params.id,
    p_lesson_id: params.lessonId,
    p_question_type: params.questionType,
    p_prompt: params.prompt,
    p_explanation: params.explanation ?? "",
    p_difficulty: params.difficulty ?? "beginner",
    p_order_index: params.orderIndex ?? 1,
    p_status: params.status ?? "draft",
    p_word_bank: params.wordBank ?? [],
    p_options: params.options ?? [],
    p_answer_key: params.answerKey ?? "",
    p_validation_type: params.validationType ?? "exact",
  });

  if (error) {
    throw new Error(`Gagal menyimpan soal admin: ${error.message}`);
  }

  const res = data as { ok: boolean; message: string; question_id?: string };
  return {
    ok: res.ok,
    message: res.message,
    questionId: res.question_id,
  };
}

export async function setAdminQuestionStatus(questionId: string, status: ContentStatus): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: true, message: `Status soal ${questionId} diubah ke ${status}` };
  }

  const { data, error } = await supabase.rpc("admin_set_question_status", {
    p_question_id: questionId,
    p_status: status,
  });

  if (error) {
    throw new Error(`Gagal mengubah status soal: ${error.message}`);
  }

  const res = data as { ok: boolean; message: string };
  return {
    ok: res.ok,
    message: res.message,
  };
}

export async function fetchAdminAuditLogs(limit: number = 20): Promise<AdminAuditLog[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Gagal mengambil audit logs: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: (row.details as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
  }));
}

export async function fetchAdminUsers(): Promise<AdminUserItem[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const [profilesRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("user_id, name, username, coins, xp, level, created_at").order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  if (profilesRes.error) {
    throw new Error(`Gagal mengambil daftar pengguna: ${profilesRes.error.message}`);
  }

  const roleMap = new Map<string, UserRole>();
  for (const r of rolesRes.data ?? []) {
    roleMap.set(r.user_id as string, r.role as UserRole);
  }

  return (profilesRes.data ?? []).map((p) => ({
    id: p.user_id as string,
    name: p.name as string,
    username: p.username as string,
    role: roleMap.get(p.user_id as string) ?? "user",
    coins: p.coins as number,
    xp: p.xp as number,
    level: p.level as number,
    createdAt: p.created_at as string | undefined,
  }));
}

export async function assignAdminUserRole(userId: string, role: UserRole): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: true, message: `Role ${role} diberikan ke ${userId}` };
  }

  const { error } = await supabase.rpc("assign_user_role", {
    target_user_id: userId,
    target_role: role,
  });

  if (error) {
    throw new Error(`Gagal menetapkan peran pengguna: ${error.message}`);
  }

  return { ok: true, message: `Peran berhasil diperbarui menjadi ${role}` };
}
