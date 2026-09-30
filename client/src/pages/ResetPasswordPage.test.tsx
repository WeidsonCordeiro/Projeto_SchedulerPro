import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResetPasswordPage from "./ResetPasswordPage";
import authApi from "../api/endpoints/auth.api";
import { httpError } from "../test/http";

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

function renderPageWithToken(token = "valid-token") {
  return render(
    <MemoryRouter initialEntries={[`/reset-password?token=${token}`]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
}

function renderPageWithoutToken() {
  return render(
    <MemoryRouter initialEntries={["/reset-password"]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an error when token is missing", () => {
    renderPageWithoutToken();

    expect(screen.getByRole("alert")).toHaveTextContent(
      /link de recuperação inválido/i,
    );
    expect(
      screen.getByRole("link", { name: /solicitar novo link/i }),
    ).toBeInTheDocument();
  });

  it("renders the reset form when token is present", () => {
    renderPageWithToken();

    expect(
      screen.getByRole("heading", { name: /redefinir senha/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nova senha")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmar nova senha")).toBeInTheDocument();
  });

  it("validates password minimum length", async () => {
    renderPageWithToken();

    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: /redefinir senha/i }));

    expect(
      await screen.findByText("A senha deve possuir pelo menos 8 caracteres."),
    ).toBeInTheDocument();
  });

  it("validates password confirmation match", async () => {
    renderPageWithToken();

    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "different" } });
    fireEvent.click(screen.getByRole("button", { name: /redefinir senha/i }));

    expect(
      await screen.findByText("As senhas não coincidem."),
    ).toBeInTheDocument();
  });

  it("calls resetPassword and shows success message", async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue({
      success: true,
      message: "ok",
    });

    renderPageWithToken("valid-token");

    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /redefinir senha/i }));

    expect(
      await screen.findByText(/senha redefinida com sucesso/i),
    ).toBeInTheDocument();
    expect(authApi.resetPassword).toHaveBeenCalledWith({
      token: "valid-token",
      password: "password123",
    });
  });

  it("shows server errors", async () => {
    vi.mocked(authApi.resetPassword).mockRejectedValue(
      httpError(400, { message: "Token inválido ou expirado." }),
    );

    renderPageWithToken("bad-token");

    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /redefinir senha/i }));

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Token inválido ou expirado.");
  });

  it("shows a link to login after success", async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue({
      success: true,
      message: "ok",
    });

    renderPageWithToken();

    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /redefinir senha/i }));

    expect(await screen.findByRole("link", { name: /entrar/i })).toBeInTheDocument();
  });
});