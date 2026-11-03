import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { useDemoAuth } from "../../hooks/useDemoAuth";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isSessionChecked, isAdmin } = useDemoAuth();
  const location = useLocation();

  if (!isSessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 text-neutral-500" role="status">
        Memeriksa hak akses...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-neutral-50 p-6">
        <div className="mx-auto max-w-md pt-20">
          <Card className="flex flex-col items-center p-8 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-danger-100 text-danger-600">
              <ShieldAlert size={32} />
            </span>
            <h1 className="mt-4 text-2xl font-bold text-neutral-950">403 — Akses Ditolak</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Halaman ini hanya dapat diakses oleh administrator Lingoland. Akun kamu saat ini tidak memiliki izin yang diperlukan.
            </p>
            <div className="mt-6 flex gap-3">
              <Link to="/app/home">
                <Button>Kembali ke Beranda</Button>
              </Link>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
