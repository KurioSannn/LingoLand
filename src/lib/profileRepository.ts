import { supabase } from "./supabaseClient";
import type { DemoUser, UserRole } from "../types";

export interface PublicProfile {
  userId: string;
  name: string;
  username: string;
  displayName: string;
  level: number;
  isPrivate: boolean;
}

export async function fetchUserRole(userId: string): Promise<UserRole> {
  if (!supabase || !userId || userId === "demo-user" || userId === "guest-user") {
    return "user";
  }

  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data?.role) {
      return "user";
    }

    return data.role as UserRole;
  } catch {
    return "user";
  }
}

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const role = await fetchUserRole(userId);
  return role === "admin";
}

export async function fetchProfile(userId: string): Promise<Partial<DemoUser> | null> {
  if (!supabase || !userId || userId === "demo-user" || userId === "guest-user") {
    return null;
  }

  const [profileRes, role] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    fetchUserRole(userId),
  ]);

  if (profileRes.error || !profileRes.data) {
    return null;
  }

  const p = profileRes.data;
  return {
    id: userId,
    name: p.name,
    username: p.username,
    displayName: p.display_name ?? p.name,
    level: p.level,
    xp: p.xp,
    coins: p.coins,
    hearts: p.hearts,
    streakDays: p.streak_days,
    isPrivate: Boolean(p.is_private),
    role,
  };
}

export async function updateProfileSettings(
  userId: string,
  settings: { displayName?: string; isPrivate?: boolean },
): Promise<{ ok: boolean; message: string }> {
  if (!supabase) return { ok: false, message: "Supabase belum dikonfigurasi." };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (settings.displayName !== undefined) updates.display_name = settings.displayName.trim();
  if (settings.isPrivate !== undefined) updates.is_private = settings.isPrivate;

  const { error } = await supabase.from("profiles").update(updates).eq("user_id", userId);
  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Pengaturan profil berhasil diperbarui." };
}

export async function fetchPublicProfile(username: string): Promise<PublicProfile | null> {
  if (!supabase || !username) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, name, username, display_name, level, is_private")
    .ilike("username", username.trim())
    .maybeSingle();

  if (error || !data) return null;

  return {
    userId: data.user_id,
    name: data.name,
    username: data.username,
    displayName: data.display_name ?? data.name,
    level: data.level,
    isPrivate: Boolean(data.is_private),
  };
}
