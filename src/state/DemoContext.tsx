import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import type { Dispatch, ReactNode } from "react";
import { loadDemoState, saveDemoState } from "../lib/storage";
import { demoReducer } from "./demoReducer";
import type { DemoAction } from "./demoReducer";
import type { DemoState, DemoStorageMeta } from "../types";

interface DemoContextValue {
  state: DemoState;
  dispatch: Dispatch<DemoAction>;
  loginError: string | null;
  storageMeta: DemoStorageMeta;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [initialLoad] = useState(() => loadDemoState());
  const [state, dispatch] = useReducer(demoReducer, initialLoad.state);
  const [storageMeta, setStorageMeta] = useState(initialLoad.meta);

  useEffect(() => {
    setStorageMeta(saveDemoState(state));
  }, [state]);

  const loginError = useMemo(() => (state.isAuthenticated ? null : "Email atau password demo tidak sesuai."), [state.isAuthenticated]);

  const value = useMemo(() => ({ state, dispatch, loginError, storageMeta }), [state, loginError, storageMeta]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used inside DemoProvider");
  return context;
}
