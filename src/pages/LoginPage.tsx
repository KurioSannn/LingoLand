import { Eye, EyeOff } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  const { isAuthenticated, loginAsDemo, loginWithCredentials } = useDemoAuth();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    const result = loginWithCredentials(email, password);
    setIsLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSuccess(result.message);
    navigate(redirectTo, { replace: true });
  }

  function loginDemo() {
    setIsLoading(true);
    setError("");
    const result = loginAsDemo();
    setIsLoading(false);
    setSuccess(result.message);
    navigate(redirectTo, { replace: true });
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="page-shell grid min-h-screen items-center gap-8 lg:grid-cols-2">
        <Card className="bg-primary-50">
          <span className="badge badge-prototype">Blok 4 Auth</span>
          <h1 className="text-3xl font-bold">Masuk ke Lingoland</h1>
          <p className="mt-3 text-neutral-500">Gunakan akun demo untuk mencoba alur MVP secara lokal.</p>
          <p className="mt-6 rounded-md bg-white p-4 text-sm text-neutral-700">
            Akun demo disimpan secara lokal dan hanya digunakan untuk mencoba prototype.
          </p>
          <dl className="mt-6 grid gap-3 rounded-md border border-primary-100 bg-white p-4 text-sm">
            <div>
              <dt className="font-semibold text-neutral-700">Email</dt>
              <dd className="text-neutral-500">{DEMO_EMAIL}</dd>
            </div>
            <div>
              <dt className="font-semibold text-neutral-700">Password</dt>
              <dd className="text-neutral-500">{DEMO_PASSWORD}</dd>
            </div>
          </dl>
        </Card>
        <form className="card flex flex-col gap-5" onSubmit={submit} noValidate>
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="username"
            value={email}
            error={error || undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError("");
            }}
          />
          <Input
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError("");
            }}
          />
          <button
            className="button button-ghost w-fit px-0"
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            {showPassword ? "Sembunyikan password" : "Tampilkan password"}
          </button>
          {success ? <p className="rounded-md bg-success-100 p-3 text-sm font-medium text-green-800">{success}</p> : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" isLoading={isLoading}>Masuk</Button>
            <Button type="button" variant="secondary" onClick={loginDemo} disabled={isLoading}>Masuk sebagai Demo</Button>
          </div>
        </form>
      </section>
    </main>
  );
}
