import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useDemoAuth } from "../../hooks/useDemoAuth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isSessionChecked } = useDemoAuth();
  const location = useLocation();

  // Avoid redirecting to /login (or flashing protected content) before we know
  // whether the Supabase session is still valid — the localStorage mirror alone
  // isn't proof of an active session.
  if (!isSessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 text-neutral-500" role="status">
        Memeriksa sesi akun...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return children;
}
