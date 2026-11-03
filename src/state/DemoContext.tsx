import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Dispatch, ReactNode } from "react";
import { STORAGE_KEY } from "../data/demoData";
import { fetchCurriculumUnits } from "../lib/learningRepository";
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

function isRemoteBacked(state: DemoState) {
  return (
    isSupabaseConfigured &&
    state.isAuthenticated &&
    !state.isGuest &&
    state.user.id !== "demo-user" &&
    state.user.id !== "guest-user"
  );
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [initialLoad] = useState(() => loadDemoState());
  const [state, dispatch] = useReducer(demoReducer, initialLoad.state);
  const [storageMeta, setStorageMeta] = useState(initialLoad.meta);
  const [isSessionChecked, setIsSessionChecked] = useState(!isSupabaseConfigured);

  useEffect(() => {
    setStorageMeta(saveDemoState(state));
  }, [state]);

  const latestStateRef = useRef(state);
  latestStateRef.current = state;
  const syncRef = useRef({ inFlight: false, dirty: false });

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

      if (current.isAuthenticated && !current.isGuest) {
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

  // Load dynamic curriculum units from Supabase for authenticated users
  useEffect(() => {
    if (!isRemoteBacked(state)) return;
    let cancelled = false;
    fetchCurriculumUnits({ isGuest: false })
      .then((units) => {
        if (!cancelled && units.length > 0) {
          dispatch({ type: "SET_CURRICULUM_UNITS", units });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [state.isAuthenticated, state.isGuest, state.user.id]);

  // Sync only user-editable profile metadata and validated avatar config
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
  }, [
    state.isAuthenticated,
    state.isGuest,
    state.user.id,
    state.user.name,
    state.user.username,
    state.user.displayName,
    state.avatar,
  ]);

  const loginError = useMemo(() => (state.isAuthenticated ? null : "Email atau password tidak sesuai."), [state.isAuthenticated]);

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
