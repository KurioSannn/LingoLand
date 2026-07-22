import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Dispatch, ReactNode } from "react";
import { STORAGE_KEY } from "../data/demoData";
import { loadDemoState, saveDemoState } from "../lib/storage";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { pushRemoteState, resolveHydratePayload } from "../lib/supabaseSync";
import { demoReducer } from "./demoReducer";
import type { DemoAction } from "./demoReducer";
import type { DemoState, DemoStorageMeta } from "../types";

interface DemoContextValue {
  state: DemoState;
  dispatch: Dispatch<DemoAction>;
  loginError: string | null;
  storageMeta: DemoStorageMeta;
  isSessionChecked: boolean;
}

const DemoContext = createContext<DemoContextValue | null>(null);

// The local default id means the session was never hydrated from Supabase
// (either not configured, or user is logged in via the offline fallback path).
function isRemoteBacked(state: DemoState) {
  return isSupabaseConfigured && state.isAuthenticated && state.user.id !== "demo-user";
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [initialLoad] = useState(() => loadDemoState());
  const [state, dispatch] = useReducer(demoReducer, initialLoad.state);
  const [storageMeta, setStorageMeta] = useState(initialLoad.meta);
  const [isSessionChecked, setIsSessionChecked] = useState(!isSupabaseConfigured);

  useEffect(() => {
    setStorageMeta(saveDemoState(state));
  }, [state]);

  // Serialize Supabase pushes: `pushRemoteState` deletes-then-inserts several
  // tables, so two overlapping calls could interleave and let a stale write
  // land after a fresher one. Only one push runs at a time; extra state
  // changes that arrive mid-push are coalesced into a single trailing push
  // of whatever the latest state is once the in-flight one finishes.
  const latestStateRef = useRef(state);
  latestStateRef.current = state;
  const syncRef = useRef({ inFlight: false, dirty: false });

  // Keep auth in sync with the real Supabase session instead of trusting the
  // localStorage mirror alone: a stale mirror (expired token, signed out from
  // another tab) would otherwise keep the app "logged in" until a write fails.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let cancelled = false;

    async function reconcile(userId: string | null) {
      const current = latestStateRef.current;

      if (userId) {
        if (current.user.id === userId) return;
        const payload = await resolveHydratePayload(userId);
        if (!cancelled) dispatch({ type: "HYDRATE_REMOTE", ...payload });
        return;
      }

      if (current.isAuthenticated && current.user.id !== "demo-user") {
        dispatch({ type: "LOGOUT" });
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      reconcile(data.session?.user.id ?? null).finally(() => {
        if (!cancelled) setIsSessionChecked(true);
      });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      reconcile(session?.user.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isRemoteBacked(state)) return;
    runRemoteSync(state.user.id);

    function runRemoteSync(userId: string) {
      if (syncRef.current.inFlight) {
        syncRef.current.dirty = true;
        return;
      }
      syncRef.current.inFlight = true;
      pushRemoteState(userId, latestStateRef.current)
        .catch(() => {
          setStorageMeta({
            key: STORAGE_KEY,
            status: "unavailable",
            message: "Gagal sinkron ke Supabase. Progress tetap aman di localStorage perangkat ini.",
          });
        })
        .finally(() => {
          syncRef.current.inFlight = false;
          if (syncRef.current.dirty) {
            syncRef.current.dirty = false;
            runRemoteSync(userId);
          }
        });
    }
  }, [state]);

  const loginError = useMemo(() => (state.isAuthenticated ? null : "Email atau password demo tidak sesuai."), [state.isAuthenticated]);

  const value = useMemo(
    () => ({ state, dispatch, loginError, storageMeta, isSessionChecked }),
    [state, loginError, storageMeta, isSessionChecked],
  );
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used inside DemoProvider");
  return context;
}
