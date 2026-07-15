import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useDemoAuth } from "../../hooks/useDemoAuth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useDemoAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return children;
}
