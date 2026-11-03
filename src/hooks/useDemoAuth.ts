import { useState } from "react";
import { clearDemoState } from "../lib/storage";
import {
  resetPasswordForEmail,
  signInWithPassword,
  signOutRemote,
  signUpWithPassword,
  updatePassword,
} from "../lib/supabaseAuth";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { clearRemoteState, resolveHydratePayload } from "../lib/supabaseSync";
import { useDemo } from "../state/DemoContext";

export interface LoginResult {
  ok: boolean;
  message: string;
}

export function useDemoAuth() {
  const { state, dispatch, isSessionChecked } = useDemo();
  const [isSyncing, setIsSyncing] = useState(false);

  async function hydrateFromRemote(userId: string): Promise<void> {
    const payload = await resolveHydratePayload(userId);
    dispatch({ type: "HYDRATE_REMOTE", ...payload });
  }

  async function loginWithCredentials(email: string, password: string): Promise<LoginResult> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      return { ok: false, message: "Email dan password wajib diisi." };
    }

    if (!isSupabaseConfigured) {
      dispatch({ type: "LOGIN_WITH_CREDENTIALS", email: trimmedEmail, password });
      return { ok: true, message: "Akun lokal siap digunakan (mode prototype offline)." };
    }

    setIsSyncing(true);
    try {
      const result = await signInWithPassword(trimmedEmail, password);
      if (!result.ok || !result.userId) {
        dispatch({ type: "LOGOUT" });
        return { ok: false, message: result.message };
      }
      await hydrateFromRemote(result.userId);
      return { ok: true, message: result.message };
    } finally {
      setIsSyncing(false);
    }
  }

  async function register(email: string, password: string, name?: string): Promise<LoginResult> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      return { ok: false, message: "Email dan password wajib diisi." };
    }

    if (password.length < 6) {
      return { ok: false, message: "Password minimal 6 karakter." };
    }

    if (!isSupabaseConfigured) {
      dispatch({ type: "LOGIN_WITH_CREDENTIALS", email: trimmedEmail, password });
      return { ok: true, message: "Akun lokal berhasil didaftarkan (mode prototype offline)." };
    }

    setIsSyncing(true);
    try {
      const result = await signUpWithPassword(trimmedEmail, password, name);
      if (!result.ok) {
        return { ok: false, message: result.message };
      }
      if (result.userId) {
        await hydrateFromRemote(result.userId);
      }
      return { ok: true, message: result.message };
    } finally {
      setIsSyncing(false);
    }
  }

  async function loginAsGuest(): Promise<LoginResult> {
    dispatch({ type: "LOGIN_DEMO" });
    return { ok: true, message: "Masuk sebagai akun tamu (tersimpan lokal)." };
  }

  async function requestPasswordReset(email: string): Promise<LoginResult> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      return { ok: false, message: "Email wajib diisi." };
    }
    return resetPasswordForEmail(trimmedEmail);
  }

  async function updateUserPassword(newPassword: string): Promise<LoginResult> {
    if (!newPassword || newPassword.length < 6) {
      return { ok: false, message: "Password baru minimal 6 karakter." };
    }
    return updatePassword(newPassword);
  }

  async function logout(): Promise<void> {
    clearDemoState();
    dispatch({ type: "LOGOUT" });
    if (isSupabaseConfigured) {
      await signOutRemote().catch(() => {});
    }
  }

  async function resetProgress(): Promise<void> {
    const remoteUserId =
      isSupabaseConfigured && !state.isGuest && state.user.id !== "demo-user" && state.user.id !== "guest-user"
        ? state.user.id
        : null;

    clearDemoState();
    dispatch({ type: "RESET_PROGRESS" });

    if (remoteUserId) {
      await clearRemoteState(remoteUserId).catch(() => {});
      dispatch({ type: "HYDRATE_REMOTE", userId: remoteUserId });
    }
  }

  return {
    isAuthenticated: state.isAuthenticated,
    isGuest: Boolean(state.isGuest || state.user.id === "demo-user" || state.user.id === "guest-user"),
    currentUser: state.user,
    isSyncing,
    isSessionChecked,
    loginWithCredentials,
    register,
    loginAsGuest,
    loginAsDemo: loginAsGuest,
    requestPasswordReset,
    updateUserPassword,
    logout,
    resetProgress,
  };
}
