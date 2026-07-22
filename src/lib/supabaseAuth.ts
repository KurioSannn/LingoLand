import { DEMO_EMAIL, DEMO_PASSWORD } from "../data/demoData";
import { supabase } from "./supabaseClient";

export interface AuthResult {
  ok: boolean;
  userId: string | null;
  message: string;
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, userId: null, message: "Supabase belum dikonfigurasi." };

  const attempt = await supabase.auth.signInWithPassword({ email, password });
  if (!attempt.error && attempt.data.user) {
    return { ok: true, userId: attempt.data.user.id, message: "Login berhasil." };
  }

  // The demo account may not exist yet on a fresh Supabase project. Self-heal by
  // registering it once, since there is no email inbox in this local demo flow.
  if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    const signUp = await supabase.auth.signUp({ email, password });
    if (!signUp.error && signUp.data.user && signUp.data.session) {
      return { ok: true, userId: signUp.data.user.id, message: "Akun demo dibuat dan login berhasil." };
    }
    if (!signUp.error && signUp.data.user && !signUp.data.session) {
      return {
        ok: false,
        userId: null,
        message: "Akun demo dibuat, tapi project Supabase ini mewajibkan konfirmasi email. Nonaktifkan 'Confirm email' di Authentication settings untuk demo lokal.",
      };
    }
  }

  return { ok: false, userId: null, message: attempt.error?.message ?? "Email atau password demo tidak sesuai." };
}

export function signInDemo(): Promise<AuthResult> {
  return signInWithPassword(DEMO_EMAIL, DEMO_PASSWORD);
}

export async function signOutRemote(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}
