import { useState } from "react";
import { DEMO_EMAIL, DEMO_PASSWORD } from "../data/demoData";
import { clearDemoState } from "../lib/storage";
import { signInDemo, signInWithPassword, signOutRemote } from "../lib/supabaseAuth";
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
    if (email.trim() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      dispatch({ type: "LOGOUT" });
      return { ok: false, message: "Email atau password demo tidak sesuai." };
    }

    if (!isSupabaseConfigured) {
      dispatch({ type: "LOGIN_WITH_CREDENTIALS", email: email.trim(), password });
      return { ok: true, message: "Akun demo siap digunakan." };
    }

    setIsSyncing(true);
    try {
      const result = await signInWithPassword(email.trim(), password);
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

  async function loginAsDemo(): Promise<LoginResult> {
    if (!isSupabaseConfigured) {
      dispatch({ type: "LOGIN_DEMO" });
      return { ok: true, message: "Akun demo siap digunakan." };
    }

    setIsSyncing(true);
    try {
      const result = await signInDemo();
      if (!result.ok || !result.userId) {
        return { ok: false, message: result.message };
      }
      await hydrateFromRemote(result.userId);
      return { ok: true, message: result.message };
    } finally {
      setIsSyncing(false);
    }
  }

  async function logout(): Promise<void> {
    dispatch({ type: "LOGOUT" });
    if (isSupabaseConfigured) {
      await signOutRemote().catch(() => {});
    }
  }

  async function resetProgress(): Promise<void> {
    const remoteUserId = isSupabaseConfigured && state.user.id !== "demo-user" ? state.user.id : null;
    clearDemoState();
    dispatch({ type: "RESET_PROGRESS" });
    if (remoteUserId) {
      await clearRemoteState(remoteUserId).catch(() => {});
      // RESET_PROGRESS drops user.id back to the local "demo-user" default,
      // which would silently stop future syncing even though the Supabase
      // session is still active. Re-attach the real uuid so the next change
      // (new avatar, new mission) keeps syncing without a re-login.
      dispatch({ type: "HYDRATE_REMOTE", userId: remoteUserId });
    }
  }

  return {
    isAuthenticated: state.isAuthenticated,
    currentUser: state.user,
    isSyncing,
    isSessionChecked,
    loginWithCredentials,
    loginAsDemo,
    logout,
    resetProgress,
  };
}
