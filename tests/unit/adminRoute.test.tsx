import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AdminRoute } from "../../src/components/layout/AdminRoute";
import { defaultUser } from "../../src/data/demoData";
import * as demoAuthHook from "../../src/hooks/useDemoAuth";

vi.mock("../../src/hooks/useDemoAuth");

describe("AdminRoute", () => {
  it("renders loading state while session is being checked", () => {
    vi.mocked(demoAuthHook.useDemoAuth).mockReturnValue({
      isAuthenticated: false,
      isGuest: false,
      role: "user",
      isAdmin: false,
      isSessionChecked: false,
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
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <AdminRoute>
          <div>Admin Dashboard Content</div>
        </AdminRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Memeriksa hak akses/i)).toBeInTheDocument();
    expect(screen.queryByText("Admin Dashboard Content")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users to /login", () => {
    vi.mocked(demoAuthHook.useDemoAuth).mockReturnValue({
      isAuthenticated: false,
      isGuest: false,
      role: "user",
      isAdmin: false,
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
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <div>Admin Dashboard Content</div>
              </AdminRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Admin Dashboard Content")).not.toBeInTheDocument();
  });

  it("renders 403 Forbidden screen when user is logged in but not an admin", () => {
    vi.mocked(demoAuthHook.useDemoAuth).mockReturnValue({
      isAuthenticated: true,
      isGuest: false,
      role: "user",
      isAdmin: false,
      isSessionChecked: true,
      isSyncing: false,
      currentUser: { ...defaultUser, role: "user" },
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
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <AdminRoute>
          <div>Admin Dashboard Content</div>
        </AdminRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText(/403 — Akses Ditolak/i)).toBeInTheDocument();
    expect(screen.getByText(/hanya dapat diakses oleh administrator/i)).toBeInTheDocument();
    expect(screen.queryByText("Admin Dashboard Content")).not.toBeInTheDocument();
  });

  it("renders protected admin children when user has admin role", () => {
    vi.mocked(demoAuthHook.useDemoAuth).mockReturnValue({
      isAuthenticated: true,
      isGuest: false,
      role: "admin",
      isAdmin: true,
      isSessionChecked: true,
      isSyncing: false,
      currentUser: { ...defaultUser, role: "admin" },
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
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <AdminRoute>
          <div>Admin Dashboard Content</div>
        </AdminRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText("Admin Dashboard Content")).toBeInTheDocument();
    expect(screen.queryByText(/403/i)).not.toBeInTheDocument();
  });
});
