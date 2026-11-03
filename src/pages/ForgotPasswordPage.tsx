import { ArrowLeft, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useDemoAuth } from "../hooks/useDemoAuth";

export function ForgotPasswordPage() {
  const { requestPasswordReset, isSyncing } = useDemoAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email wajib diisi.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    const result = await requestPasswordReset(trimmedEmail);
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
          <h1 className="mt-4 text-3xl font-bold text-neutral-950">Lupa Password?</h1>
          <p className="mt-3 text-neutral-600">
            Jangan khawatir! Masukkan alamat email akun Lingoland kamu, dan kami akan mengirimkan tautan untuk mengatur ulang password kamu.
          </p>
        </Card>

        <form className="card flex flex-col gap-5" onSubmit={submit} noValidate>
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-100 text-primary-600">
              <Mail size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-neutral-950">Reset Password</h2>
              <p className="text-xs text-neutral-500">Tautan reset akan dikirim ke email terdaftar.</p>
            </div>
          </div>

          <Input
            id="email"
            label="Email Akun"
            type="email"
            placeholder="nama@email.com"
            autoComplete="email"
            value={email}
            error={error || undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError("");
            }}
          />

          {success ? (
            <div className="rounded-md bg-success-100 p-4 text-sm font-medium text-green-800">
              {success}
            </div>
          ) : null}

          <Button type="submit" isLoading={isLoading || isSyncing} className="w-full">
            Kirim Tautan Reset
          </Button>

          <div className="pt-2 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline"
            >
              <ArrowLeft size={16} />
              Kembali ke Halaman Masuk
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
