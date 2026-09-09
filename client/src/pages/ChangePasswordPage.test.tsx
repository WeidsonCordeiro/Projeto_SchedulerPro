import { fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChangePasswordPage from "./ChangePasswordPage";
import ChangePasswordRoute from "../routes/ChangePasswordRoute";
import authApi from "../api/endpoints/auth.api";
import { httpError, networkError } from "../test/http";
import { user } from "../test/fixtures";
import authReducer from "../store/slices/authSlice";
import type { AuthState } from "../store/slices/authSlice";

vi.mock("../api/endpoints/auth.api", () => ({
  default: {
    changePassword: vi.fn(),
  },
}));

type ChangePasswordResponse = { success: boolean; message: string };

function makeStore(overrides: Partial<AuthState> = {}) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user,
        mustChangePassword: true,
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
        ...overrides,
      },
    },
  });
}

function renderPage(store = makeStore()) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/change-password"]}>
        <Routes>
          <Route element={<ChangePasswordRoute />}>
            <Route path="/change-password" element={<ChangePasswordPage />} />
          </Route>
          <Route path="/" element={<div>Dashboard</div>} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

function fillForm(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
) {
  fireEvent.change(screen.getByLabelText("Senha atual"), {
    target: { value: currentPassword },
  });
  fireEvent.change(screen.getByLabelText("Nova senha"), {
    target: { value: newPassword },
  });
  fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
    target: { value: confirmPassword },
  });
  fireEvent.click(screen.getByRole("button", { name: /alterar senha/i }));
}

describe("ChangePasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title, fields and submit button", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: /alterar senha/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Senha atual")).toBeInTheDocument();
    expect(screen.getByLabelText("Nova senha")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmar nova senha")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /alterar senha/i }),
    ).toBeInTheDocument();
  });

  it("shows the security notice when a change is required", () => {
    renderPage(makeStore({ mustChangePassword: true }));

    expect(
      screen.getByText(/é necessário alterar sua senha antes de continuar/i),
    ).toBeInTheDocument();
  });

  it("does not show the security notice when the password was already changed", () => {
    renderPage(makeStore({ mustChangePassword: false }));

    expect(
      screen.queryByText(/é necessário alterar sua senha antes de continuar/i),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["", "", ""],
    ["", "newpassword123", "newpassword123"],
    ["current123", "", ""],
    ["current123", "newpassword123", ""],
  ])("validates required fields without calling the API", (cur, nova, conf) => {
    renderPage();
    fillForm(cur, nova, conf);

    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it("requires at least 8 characters for the new password", () => {
    renderPage();
    fillForm("current123", "short", "short");

    expect(
      screen.getByText("A nova senha deve possuir pelo menos 8 caracteres."),
    ).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it("rejects when the passwords do not match", () => {
    renderPage();
    fillForm("current123", "newpassword123", "different456");

    expect(screen.getByText("As senhas não coincidem.")).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it("shows required-field errors on empty submit", () => {
    renderPage();
    fillForm("", "", "");

    expect(screen.getByText("A senha atual é obrigatória.")).toBeInTheDocument();
    expect(screen.getByText("A nova senha é obrigatória.")).toBeInTheDocument();
    expect(screen.getByText("Confirme a nova senha.")).toBeInTheDocument();
  });

  it("calls the endpoint with the correct body and navigates to / on success", async () => {
    vi.mocked(authApi.changePassword).mockResolvedValue({
      success: true,
      message: "Senha alterada com sucesso.",
    });

    const store = makeStore();
    renderPage(store);
    fillForm("current123", "newpassword123", "newpassword123");

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(authApi.changePassword).toHaveBeenCalledWith({
      currentPassword: "current123",
      newPassword: "newpassword123",
      confirmPassword: "newpassword123",
    });
    expect(store.getState().auth.mustChangePassword).toBe(false);
    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(store.getState().auth.user?.email).toBe(user.email);
  });

  it("shows loading and blocks duplicate submits while pending", async () => {
    let resolveRequest: (value: ChangePasswordResponse) => void = () => {};
    vi.mocked(authApi.changePassword).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    renderPage();
    fillForm("current123", "newpassword123", "newpassword123");

    const button = screen.getByRole("button", { name: /alterando/i });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(authApi.changePassword).toHaveBeenCalledTimes(1);

    resolveRequest({ success: true, message: "ok" });
    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
  });

  it("shows a friendly message on 400", async () => {
    vi.mocked(authApi.changePassword).mockRejectedValue(
      httpError(400, { message: "Dados inválidos. Verifique as informações." }),
    );

    renderPage();
    fillForm("current123", "newpassword123", "newpassword123");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Dados inválidos. Verifique as informações.",
    );
  });

  it("shows a clear message when the current password is incorrect (401)", async () => {
    vi.mocked(authApi.changePassword).mockRejectedValue(
      httpError(401, { message: "Email ou senha inválidos." }),
    );

    renderPage();
    fillForm("wrong123", "newpassword123", "newpassword123");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A senha atual está incorreta.",
    );
  });

  it("shows a friendly message on 500", async () => {
    vi.mocked(authApi.changePassword).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    renderPage();
    fillForm("current123", "newpassword123", "newpassword123");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );
  });

  it("shows a friendly message on network errors", async () => {
    vi.mocked(authApi.changePassword).mockRejectedValue(networkError());

    renderPage();
    fillForm("current123", "newpassword123", "newpassword123");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível conectar ao servidor. Verifique sua conexão.",
    );
  });

  it("keeps the user on the page after an error and re-enables the button", async () => {
    vi.mocked(authApi.changePassword).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    renderPage();
    fillForm("current123", "newpassword123", "newpassword123");

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /alterar senha/i })).toBeEnabled();
  });

  it("never persists passwords to storage or the auth slice", async () => {
    vi.mocked(authApi.changePassword).mockResolvedValue({
      success: true,
      message: "ok",
    });

    const store = makeStore();
    renderPage(store);
    fillForm("current123", "newpassword123", "newpassword123");

    await screen.findByText("Dashboard");

    const storageKeys = [
      ...Object.keys(window.localStorage),
      ...Object.keys(window.sessionStorage),
    ];
    expect(storageKeys).toEqual([]);

    const state = store.getState().auth;
    expect("password" in state).toBe(false);
    expect("currentPassword" in state).toBe(false);
    expect("newPassword" in state).toBe(false);
    expect("accessToken" in state).toBe(false);
  });
});