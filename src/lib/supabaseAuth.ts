import { supabase } from "./supabaseClient";

export interface AuthResult {
  ok: boolean;
  userId: string | null;
  message: string;
}

export async function signUpWithPassword(email: string, password: string, name?: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, userId: null, message: "Supabase belum dikonfigurasi." };

  const trimmedEmail = email.trim().toLowerCase();
  const displayName = name?.trim() || trimmedEmail.split("@")[0];
  const username = displayName.toLowerCase().replace(/[^a-z0-9_.]/g, "");

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: {
        name: displayName,
        username,
      },
    },
  });

  if (error) {
    return { ok: false, userId: null, message: error.message };
  }

  // If email confirmation is required, session will be null
  if (data.user && !data.session) {
    return {
      ok: true,
      userId: data.user.id,
      message: "Akun berhasil dibuat! Silakan periksa inbox email kamu untuk konfirmasi akun sebelum login.",
    };
  }

  return {
    ok: true,
    userId: data.user?.id ?? null,
    message: "Pendaftaran berhasil dan kamu sudah login.",
  };
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, userId: null, message: "Supabase belum dikonfigurasi." };

  const attempt = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (attempt.error) {
    return { ok: false, userId: null, message: attempt.error.message };
  }

  if (attempt.data.user) {
    return { ok: true, userId: attempt.data.user.id, message: "Login berhasil." };
  }

  return { ok: false, userId: null, message: "Email atau password tidak sesuai." };
}

export async function resetPasswordForEmail(email: string): Promise<{ ok: boolean; message: string }> {
  if (!supabase) return { ok: false, message: "Supabase belum dikonfigurasi." };

  const redirectTo = `${window.location.origin}/login`;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Instruksi reset password telah dikirim ke email kamu." };
}

export async function updatePassword(newPassword: string): Promise<{ ok: boolean; message: string }> {
  if (!supabase) return { ok: false, message: "Supabase belum dikonfigurasi." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Password berhasil diperbarui." };
}

export async function signOutRemote(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}
