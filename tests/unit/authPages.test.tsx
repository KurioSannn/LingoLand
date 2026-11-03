import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { defaultUser } from "../../src/data/demoData";
import * as demoAuthHook from "../../src/hooks/useDemoAuth";
import { ForgotPasswordPage } from "../../src/pages/ForgotPasswordPage";
import { LoginPage } from "../../src/pages/LoginPage";
import { RegisterPage } from "../../src/pages/RegisterPage";

vi.mock("../../src/hooks/useDemoAuth");

describe("Auth Pages", () => {
  it("renders LoginPage with guest option and register link", () => {
    vi.mocked(demoAuthHook.useDemoAuth).mockReturnValue({
      isAuthenticated: false,
      isGuest: false,
      isSessionChecked: true,
      isSyncing: false,
      currentUser: defaultUser,
      loginWithCredentials: vi.fn(),
      register: vi.fn(),
      loginAsGuest: vi.fn(),
      loginAsDemo: vi.fn(),
      requestPasswordReset: vi.fn(),
      updateUserPassword: vi.fn(),
      logout: vi.fn(),
      resetProgress: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /Masuk ke Lingoland/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Masuk$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Masuk sebagai Tamu/i })).toBeInTheDocument();
    expect(screen.getByText(/Daftar sekarang/i)).toBeInTheDocument();
  });

  it("renders RegisterPage and shows error on password mismatch", async () => {
    const registerMock = vi.fn();
    vi.mocked(demoAuthHook.useDemoAuth).mockReturnValue({
      isAuthenticated: false,
      isGuest: false,
      isSessionChecked: true,
      isSyncing: false,
      currentUser: defaultUser,
      loginWithCredentials: vi.fn(),
      register: registerMock,
      loginAsGuest: vi.fn(),
      loginAsDemo: vi.fn(),
      requestPasswordReset: vi.fn(),
      updateUserPassword: vi.fn(),
      logout: vi.fn(),
      resetProgress: vi.fn(),
    });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /Buat Akun Lingoland/i })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Nama Lengkap/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/^Password/i);
    const confirmInput = screen.getByLabelText(/Konfirmasi Password/i);
    const submitBtn = screen.getByRole("button", { name: /Daftar Sekarang/i });

    fireEvent.change(nameInput, { target: { value: "Ahmad Learner" } });
    fireEvent.change(emailInput, { target: { value: "ahmad@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmInput, { target: { value: "differentPassword" } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Konfirmasi password tidak cocok/i)).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("renders ForgotPasswordPage and handles submit", async () => {
    const resetMock = vi.fn().mockResolvedValue({
      ok: true,
      message: "Instruksi reset password telah dikirim ke email kamu.",
    });

    vi.mocked(demoAuthHook.useDemoAuth).mockReturnValue({
      isAuthenticated: false,
      isGuest: false,
      isSessionChecked: true,
      isSyncing: false,
      currentUser: defaultUser,
      loginWithCredentials: vi.fn(),
      register: vi.fn(),
      loginAsGuest: vi.fn(),
      loginAsDemo: vi.fn(),
      requestPasswordReset: resetMock,
      updateUserPassword: vi.fn(),
      logout: vi.fn(),
      resetProgress: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /Lupa Password/i })).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/Email Akun/i);
    const submitBtn = screen.getByRole("button", { name: /Kirim Tautan Reset/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitBtn);

    expect(resetMock).toHaveBeenCalledWith("test@example.com");
    expect(await screen.findByText(/Instruksi reset password telah dikirim/i)).toBeInTheDocument();
  });
});
