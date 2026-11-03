import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { defaultUser } from "../../src/data/demoData";
import { ProtectedRoute } from "../../src/components/layout/ProtectedRoute";
import * as demoAuthHook from "../../src/hooks/useDemoAuth";

vi.mock("../../src/hooks/useDemoAuth");

describe("ProtectedRoute", () => {
  it("renders loading message when session is not yet checked", () => {
    vi.mocked(demoAuthHook.useDemoAuth).mockReturnValue({
      isAuthenticated: false,
      isSessionChecked: false,
      isSyncing: false,
      currentUser: defaultUser,
      loginWithCredentials: vi.fn(),
      loginAsDemo: vi.fn(),
      logout: vi.fn(),
      resetProgress: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/app/home"]}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Memeriksa sesi akun/i)).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects to login when unauthenticated", () => {
    vi.mocked(demoAuthHook.useDemoAuth).mockReturnValue({
      isAuthenticated: false,
      isSessionChecked: true,
      isSyncing: false,
      currentUser: defaultUser,
      loginWithCredentials: vi.fn(),
      loginAsDemo: vi.fn(),
      logout: vi.fn(),
      resetProgress: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/app/home"]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/app/home"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders protected content when authenticated", () => {
    vi.mocked(demoAuthHook.useDemoAuth).mockReturnValue({
      isAuthenticated: true,
      isSessionChecked: true,
      isSyncing: false,
      currentUser: defaultUser,
      loginWithCredentials: vi.fn(),
      loginAsDemo: vi.fn(),
      logout: vi.fn(),
      resetProgress: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/app/home"]}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});
