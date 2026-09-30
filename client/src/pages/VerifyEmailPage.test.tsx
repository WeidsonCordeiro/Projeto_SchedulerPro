import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VerifyEmailPage from "./VerifyEmailPage";
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

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an error when token is missing", () => {
    render(
      <MemoryRouter initialEntries={["/verify-email"]}>
        <VerifyEmailPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /link de verificação inválido/i,
    );
  });

  it("shows an error when token query param is empty string", () => {
    render(
      <MemoryRouter initialEntries={["/verify-email?token="]}>
        <VerifyEmailPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /link de verificação inválido/i,
    );
  });

  it("calls verifyEmail on mount and shows success", async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({
      success: true,
      message: "ok",
    });

    render(
      <MemoryRouter initialEntries={["/verify-email?token=valid-token"]}>
        <VerifyEmailPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/email verificado com sucesso/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /entrar/i }),
    ).toBeInTheDocument();
    expect(authApi.verifyEmail).toHaveBeenCalledWith("valid-token");
  });

  it("shows error when verifyEmail fails", async () => {
    vi.mocked(authApi.verifyEmail).mockRejectedValue(
      httpError(400, { message: "Token inválido." }),
    );

    render(
      <MemoryRouter initialEntries={["/verify-email?token=bad-token"]}>
        <VerifyEmailPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Token inválido.",
    );
    expect(
      screen.getByRole("link", { name: /entrar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /recuperar senha/i }),
    ).toBeInTheDocument();
  });
});