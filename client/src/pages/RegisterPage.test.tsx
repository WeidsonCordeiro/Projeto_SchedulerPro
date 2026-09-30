import { fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "./RegisterPage";
import authApi from "../api/endpoints/auth.api";
import { httpError } from "../test/http";
import authReducer from "../store/slices/authSlice";

vi.mock("../api/endpoints/auth.api", () => ({
  default: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    refresh: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    changePassword: vi.fn(),
    verifyEmail: vi.fn(),
  },
}));

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

function renderPage(store = makeStore()) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/register"]}>
        <RegisterPage />
      </MemoryRouter>
    </Provider>,
  );
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the registration form", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: /criar conta/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmar senha")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome da empresa")).toBeInTheDocument();
    expect(screen.getByLabelText("Fuso horário")).toBeInTheDocument();
  });

  it("validates required fields", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(await screen.findByText("O nome é obrigatório.")).toBeInTheDocument();
    expect(screen.getByText("O email é obrigatório.")).toBeInTheDocument();
    expect(screen.getByText("A senha é obrigatória.")).toBeInTheDocument();
    expect(screen.getByText("Confirme a senha.")).toBeInTheDocument();
    expect(screen.getByText("O nome da empresa é obrigatório.")).toBeInTheDocument();
  });

  it("validates password minimum length", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText("Nome da empresa"), { target: { value: "Test Company" } });

    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(
      await screen.findByText("A senha deve possuir pelo menos 8 caracteres."),
    ).toBeInTheDocument();
  });

  it("validates password confirmation match", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: "different" } });
    fireEvent.change(screen.getByLabelText("Nome da empresa"), { target: { value: "Test Company" } });

    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(
      await screen.findByText("As senhas não coincidem."),
    ).toBeInTheDocument();
  });

  it("calls register and dispatches credentials on success", async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      success: true,
      message: "ok",
      data: {
        id: "user1",
        name: "Owner",
        email: "owner@example.com",
        role: "OWNER",
        companyId: "comp1",
        isActive: true,
        mustChangePassword: false,
      },
    });

    const store = makeStore();
    renderPage(store);

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Owner" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "owner@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Nome da empresa"), { target: { value: "My Company" } });

    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(await screen.findByRole("button", { name: /criando conta/i })).toBeInTheDocument();
    expect(authApi.register).toHaveBeenCalledWith({
      name: "Owner",
      email: "owner@example.com",
      password: "password123",
      confirmPassword: "password123",
      company: {
        name: "My Company",
        timezone: expect.any(String),
      },
    });
  });

  it("shows server errors", async () => {
    vi.mocked(authApi.register).mockRejectedValue(
      httpError(409, { message: "Email já está em uso." }),
    );

    renderPage();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Owner" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "dup@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Nome da empresa"), { target: { value: "My Company" } });

    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email já está em uso.");
  });

  it("shows a link to login", () => {
    renderPage();

    expect(
      screen.getByRole("link", { name: /entrar/i }),
    ).toBeInTheDocument();
  });
});