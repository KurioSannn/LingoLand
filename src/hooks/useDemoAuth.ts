import { clearDemoState } from "../lib/storage";
import { useDemo } from "../state/DemoContext";
import { DEMO_EMAIL, DEMO_PASSWORD } from "../data/demoData";

export interface LoginResult {
  ok: boolean;
  message: string;
}

export function useDemoAuth() {
  const { state, dispatch } = useDemo();

  function loginWithCredentials(email: string, password: string): LoginResult {
    if (email.trim() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      dispatch({ type: "LOGOUT" });
      return {
        ok: false,
        message: "Email atau password demo tidak sesuai.",
      };
    }

    dispatch({ type: "LOGIN_WITH_CREDENTIALS", email: email.trim(), password });
    return {
      ok: true,
      message: "Akun demo siap digunakan.",
    };
  }

  function loginAsDemo(): LoginResult {
    dispatch({ type: "LOGIN_DEMO" });
    return {
      ok: true,
      message: "Akun demo siap digunakan.",
    };
  }

  function logout() {
    dispatch({ type: "LOGOUT" });
  }

  function resetProgress() {
    clearDemoState();
    dispatch({ type: "RESET_PROGRESS" });
  }

  return {
    isAuthenticated: state.isAuthenticated,
    currentUser: state.user,
    loginWithCredentials,
    loginAsDemo,
    logout,
    resetProgress,
  };
}
