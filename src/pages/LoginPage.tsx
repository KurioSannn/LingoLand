import { Eye, EyeOff, UserCheck } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { DEMO_EMAIL, DEMO_PASSWORD } from "../data/demoData";
import { useDemoAuth } from "../hooks/useDemoAuth";

interface LoginLocationState {
  from?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loginAsGuest, loginWithCredentials, isSyncing } = useDemoAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const redirectTo = useMemo(() => {
    const state = location.state as LoginLocationState | null;
    return state?.from?.startsWith("/app") ? state.from : "/app/home";
  }, [location.state]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    const result = await loginWithCredentials(email, password);
    setIsLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSuccess(result.message);
    navigate(redirectTo, { replace: true });
  }

  async function handleGuestLogin() {
    setIsLoading(true);
    setError("");

    const result = await loginAsGuest();
    setIsLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSuccess(result.message);
    navigate(redirectTo, { replace: true });
  }

  function fillDemoCredentials() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError("");
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="page-shell grid min-h-screen items-center gap-8 lg:grid-cols-2">
        <Card className="bg-primary-50">
          <Badge tone="info">Autentikasi Akun</Badge>
          <h1 className="mt-4 text-3xl font-bold text-neutral-950">Masuk ke Lingoland</h1>
          <p className="mt-3 text-neutral-600">
            Masuk dengan akun terdaftar untuk menyimpan progres latihan secara permanen, atau coba mode tamu lokal.
          </p>

          <div className="mt-6 rounded-lg border border-primary-200 bg-white p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <UserCheck size={18} className="text-primary-600" />
              Mode Tamu / Akun Uji Coba
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Ingin langsung mencoba gameplay tanpa registrasi? Kamu bisa gunakan tombol <strong>Masuk sebagai Tamu</strong> atau isi kredensial demo.
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-neutral-100 pt-3 text-xs text-neutral-600">
              <span>{DEMO_EMAIL}</span>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="font-semibold text-primary-600 hover:underline"
              >
                Gunakan Akun Demo
              </button>
            </div>
          </div>
        </Card>

        <form className="card flex flex-col gap-5" onSubmit={submit} noValidate>
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="nama@email.com"
            autoComplete="username"
            value={email}
            error={error || undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError("");
            }}
          />

          <div className="flex flex-col gap-1.5">
            <Input
              id="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError("");
              }}
            />
            <div className="flex items-center justify-between pt-1">
              <button
                className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPassword ? "Sembunyikan password" : "Tampilkan password"}
              </button>
              <Link to="/forgot-password" className="text-xs font-semibold text-primary-600 hover:underline">
                Lupa password?
              </Link>
            </div>
          </div>

          {success ? <p className="rounded-md bg-success-100 p-3 text-sm font-medium text-green-800">{success}</p> : null}

          <div className="mt-2 flex flex-col gap-3">
            <Button type="submit" isLoading={isLoading || isSyncing} className="w-full">
              Masuk
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleGuestLogin}
              disabled={isLoading || isSyncing}
              className="w-full"
            >
              Masuk sebagai Tamu (Offline)
            </Button>
          </div>

          <p className="mt-3 text-center text-sm text-neutral-500">
            Belum punya akun?{" "}
            <Link to="/register" className="font-semibold text-primary-600 hover:underline">
              Daftar sekarang
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
