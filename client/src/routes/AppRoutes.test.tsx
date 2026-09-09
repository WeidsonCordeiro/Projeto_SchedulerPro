import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AppRoutes from "./AppRoutes";
import authReducer from "../store/slices/authSlice";
import type { AuthState } from "../store/slices/authSlice";
import { user } from "../test/fixtures";

vi.mock("../api/endpoints/clients.api", () => ({
  default: {
    getClients: vi.fn().mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    }),
  },
}));

function renderAt(path: string, auth: Partial<AuthState>) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: null,
        mustChangePassword: false,
        isAuthenticated: false,
        isInitializing: true,
        isLoading: false,
        ...auth,
      },
    },
  });

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>,
  );
}

describe("AppRoutes", () => {
  it("renders the home page for an authenticated user", () => {
    renderAt("/", {
      user,
      isAuthenticated: true,
      isInitializing: false,
    });

    expect(
      screen.getByRole("heading", { name: /bem-vindo ao schedulerpro/i }),
    ).toBeInTheDocument();
  });

  it("redirects an unauthenticated user from / to /login", () => {
    renderAt("/", { isInitializing: false });

    expect(screen.getByRole("heading", { name: /entrar/i })).toBeInTheDocument();
    expect(screen.queryByText(/bem-vindo ao schedulerpro/i)).not.toBeInTheDocument();
  });

  it("shows loading while the session is being checked without redirecting", () => {
    renderAt("/", {});

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
    expect(screen.queryByText(/bem-vindo ao schedulerpro/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /entrar/i })).not.toBeInTheDocument();
  });

  it("does not keep an authenticated user on /login", () => {
    renderAt("/login", {
      user,
      isAuthenticated: true,
      isInitializing: false,
    });

    expect(
      screen.getByRole("heading", { name: /bem-vindo ao schedulerpro/i }),
    ).toBeInTheDocument();
  });

  it("sends a mustChangePassword user from /login to /change-password", () => {
    renderAt("/login", {
      user,
      mustChangePassword: true,
      isAuthenticated: true,
      isInitializing: false,
    });

    expect(
      screen.getByRole("heading", { name: /alterar senha/i }),
    ).toBeInTheDocument();
  });

  it("redirects a mustChangePassword user away from /", () => {
    renderAt("/", {
      user,
      mustChangePassword: true,
      isAuthenticated: true,
      isInitializing: false,
    });

    expect(
      screen.getByRole("heading", { name: /alterar senha/i }),
    ).toBeInTheDocument();
  });

  it("blocks a normal user from /change-password", () => {
    renderAt("/change-password", {
      user,
      isAuthenticated: true,
      isInitializing: false,
    });

    expect(
      screen.getByRole("heading", { name: /bem-vindo ao schedulerpro/i }),
    ).toBeInTheDocument();
  });

  it("redirects an unauthenticated user from /change-password to /login", () => {
    renderAt("/change-password", { isInitializing: false });

    expect(screen.getByRole("heading", { name: /entrar/i })).toBeInTheDocument();
  });

  it("redirects unknown paths to the root behavior", () => {
    renderAt("/unknown", { isInitializing: false });

    expect(screen.getByRole("heading", { name: /entrar/i })).toBeInTheDocument();
  });

  it.each([
    ["/clients", "Clientes"],
    ["/services", "Serviços"],
    ["/employees", "Funcionários"],
    ["/availability", "Disponibilidade"],
    ["/appointments", "Agendamentos"],
    ["/company", "Empresa"],
  ])("renders the %s module page for an authenticated user", (path, title) => {
    renderAt(path, {
      user,
      isAuthenticated: true,
      isInitializing: false,
    });

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  });
});