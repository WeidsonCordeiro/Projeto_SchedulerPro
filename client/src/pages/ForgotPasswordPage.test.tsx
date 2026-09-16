import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "./ForgotPasswordPage";
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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/forgot-password"]}>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the forgot password form", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: /recuperar senha/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("validates required email", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /enviar link/i }));

    expect(await screen.findByText("O email é obrigatório.")).toBeInTheDocument();
  });

  it("validates invalid email", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "not-email" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar link/i }));

    expect(await screen.findByText("Informe um email válido.")).toBeInTheDocument();
  });

  it("calls forgotPassword and shows success message", async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValue({
      success: true,
      message: "ok",
    });

    renderPage();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar link/i }));

    expect(
      await screen.findByText(/enviaremos um link/i),
    ).toBeInTheDocument();
    expect(authApi.forgotPassword).toHaveBeenCalledWith({ email: "user@example.com" });
  });

  it("shows server errors", async () => {
    vi.mocked(authApi.forgotPassword).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    renderPage();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar link/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );
  });

  it("shows a link to login", () => {
    renderPage();

    expect(screen.getByRole("link", { name: /entrar/i })).toBeInTheDocument();
  });
});