import { fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./LoginPage";
import GuestRoute from "../routes/GuestRoute";
import authApi from "../api/endpoints/auth.api";
import type { AuthSession } from "../types/auth";
import { session, sessionRequiringChange } from "../test/fixtures";
import { httpError, networkError } from "../test/http";
import authReducer from "../store/slices/authSlice";

vi.mock("../api/endpoints/auth.api", () => ({
  default: {
    login: vi.fn(),
  },
}));

type LoginResponse = { success: boolean; message: string; data: AuthSession };

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: null,
        mustChangePassword: false,
        isAuthenticated: false,
        isInitializing: false,
        isLoading: false,
      },
    },
  });
}

function renderLogin(store = makeStore()) {
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/change-password" element={<div>Change password page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

function loginAs(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /entrar/i }));
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the login form", () => {
    renderLogin();

    expect(screen.getByRole("heading", { name: /entrar/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
  });

  it("requires email and password", () => {
    renderLogin();

    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(screen.getByText("O email é obrigatório.")).toBeInTheDocument();
    expect(screen.getByText("A senha é obrigatória.")).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it("requires password when only email is filled", () => {
    renderLogin();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "owner@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(screen.getByText("A senha é obrigatória.")).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it("rejects an invalid email format", () => {
    renderLogin();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(screen.getByText("Informe um email válido.")).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it("logs in and redirects a normal user to /", async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      success: true,
      message: "ok",
      data: session,
    });

    const store = makeStore();
    renderLogin(store);
    loginAs("owner@example.com", "password123");

    expect(await screen.findByText("Home")).toBeInTheDocument();
    expect(authApi.login).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "password123",
    });
    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(store.getState().auth.user?.email).toBe("owner@example.com");
  });

  it("redirects a mustChangePassword user to /change-password", async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      success: true,
      message: "ok",
      data: sessionRequiringChange,
    });

    const store = makeStore();
    renderLogin(store);
    loginAs("owner@example.com", "password123");

    expect(await screen.findByText("Change password page")).toBeInTheDocument();
    expect(store.getState().auth.mustChangePassword).toBe(true);
  });

  it("shows loading while the login request is pending", async () => {
    let resolveLogin: (value: LoginResponse) => void = () => {};
    vi.mocked(authApi.login).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );

    renderLogin();
    loginAs("owner@example.com", "password123");

    const button = screen.getByRole("button", { name: /entrando/i });
    expect(button).toBeDisabled();

    resolveLogin({ success: true, message: "ok", data: session });

    expect(await screen.findByText("Home")).toBeInTheDocument();
  });

  it("shows a friendly message on 401", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      httpError(401, { message: "Credenciais inválidas." }),
    );

    renderLogin();
    loginAs("owner@example.com", "wrong");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Credenciais inválidas.",
    );
    expect(screen.getByRole("button", { name: /entrar/i })).toBeEnabled();
  });

  it("shows a friendly message on 400", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      httpError(400, { message: "Email inválido." }),
    );

    renderLogin();
    loginAs("owner@example.com", "password123");

    expect(await screen.findByRole("alert")).toHaveTextContent("Email inválido.");
  });

  it("shows a friendly message on 500", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    renderLogin();
    loginAs("owner@example.com", "password123");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );
  });

  it("shows a friendly message on network error", async () => {
    vi.mocked(authApi.login).mockRejectedValue(networkError());

    renderLogin();
    loginAs("owner@example.com", "password123");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível conectar ao servidor. Verifique sua conexão.",
    );
  });
});