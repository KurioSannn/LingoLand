import { Eye, EyeOff } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useDemoAuth } from "../hooks/useDemoAuth";

export function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, register, isSyncing } = useDemoAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/app/home", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      setError("Semua kolom pendaftaran wajib diisi.");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    const result = await register(trimmedEmail, password, trimmedName);
    setIsLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSuccess(result.message);
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="page-shell grid min-h-screen items-center gap-8 lg:grid-cols-2">
        <Card className="bg-primary-50">
          <Badge tone="info">Blok 21 Auth</Badge>
          <h1 className="mt-4 text-3xl font-bold text-neutral-950">Buat Akun Lingoland</h1>
          <p className="mt-3 text-neutral-600">
            Daftarkan akunmu untuk mulai latihan speaking bahasa Inggris, mengumpulkan koin, menyesuaikan avatar, dan menyimpan progres secara permanen.
          </p>

          <div className="mt-6 space-y-3 rounded-lg border border-primary-200 bg-white p-4 text-sm text-neutral-600">
            <p className="font-semibold text-neutral-900">Keuntungan mendaftar akun:</p>
            <ul className="list-inside list-disc space-y-1 text-xs text-neutral-500">
              <li>Progres latihan dan level tersimpan di database aman.</li>
              <li>Avatar dan item inventory tidak hilang saat berganti perangkat.</li>
              <li>Siap untuk berinteraksi dengan sesama pembelajar di Social Plaza.</li>
            </ul>
          </div>
        </Card>

        <form className="card flex flex-col gap-4" onSubmit={submit} noValidate>
          <Input
            id="name"
            label="Nama Lengkap / Panggilan"
            type="text"
            placeholder="Contoh: Raka Aditya"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError("");
            }}
          />

          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="nama@email.com"
            autoComplete="username"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError("");
            }}
          />

          <Input
            id="password"
            label="Password (min. 6 karakter)"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError("");
            }}
          />

          <Input
            id="confirmPassword"
            label="Konfirmasi Password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              if (error) setError("");
            }}
          />

          <button
            className="inline-flex w-fit items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700"
            type="button"
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPassword ? "Sembunyikan password" : "Tampilkan password"}
          </button>

          {error ? <p className="rounded-md bg-danger-100 p-3 text-sm font-medium text-danger-800">{error}</p> : null}
          {success ? <p className="rounded-md bg-success-100 p-3 text-sm font-medium text-green-800">{success}</p> : null}

          <Button type="submit" isLoading={isLoading || isSyncing} className="mt-2 w-full">
            Daftar Sekarang
          </Button>

          <p className="mt-2 text-center text-sm text-neutral-500">
            Sudah memiliki akun?{" "}
            <Link to="/login" className="font-semibold text-primary-600 hover:underline">
              Masuk di sini
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
