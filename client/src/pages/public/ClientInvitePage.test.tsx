import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClientInvitePage from "./ClientInvitePage";
import clientInvitesApi from "../../api/endpoints/clientInvites.api";
import { httpError } from "../../test/http";
import type { ClientInviteInfo } from "../../types/clientInvite";

vi.mock("../../api/endpoints/clientInvites.api", () => ({
  default: {
    inspect: vi.fn(),
    accept: vi.fn(),
  },
}));

const TOKEN = "kJ8vQ2mNpR4xW7yLbT0cV6jHfD3qS8aZgE1uI5oK9nM";

const invite: ClientInviteInfo = {
  clientName: "Maria Silva",
  companyName: "Studio Aurora",
  email: "maria@email.com",
  expiresAt: "2026-10-14T00:00:00.000Z",
};

function renderPage(path = `/convite/cliente/${TOKEN}`) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/convite/cliente/:token" element={<ClientInvitePage />} />
        <Route path="*" element={<ClientInvitePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillAndSubmit(password = "senhaForte123", confirm = password) {
  fireEvent.change(screen.getByLabelText("Senha"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("Confirmar senha"), {
    target: { value: confirm },
  });
  fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));
}

describe("ClientInvitePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state while the invite is inspected", () => {
    vi.mocked(clientInvitesApi.inspect).mockReturnValue(
      new Promise(() => {}),
    );

    renderPage();

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("A verificar o convite...")).toBeInTheDocument();
  });

  it("shows the invitation details for a valid token", async () => {
    vi.mocked(clientInvitesApi.inspect).mockResolvedValue({
      success: true,
      message: "ok",
      data: invite,
    });

    renderPage();

    expect(
      await screen.findByRole("heading", { name: /criar conta de cliente/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Studio Aurora")).toBeInTheDocument();
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText("maria@email.com")).toBeInTheDocument();
    expect(clientInvitesApi.inspect).toHaveBeenCalledWith({ token: TOKEN });
    expect(clientInvitesApi.accept).not.toHaveBeenCalled();
  });

  it("never renders the token on the page", async () => {
    vi.mocked(clientInvitesApi.inspect).mockResolvedValue({
      success: true,
      message: "ok",
      data: invite,
    });

    renderPage();

    await screen.findByRole("heading", { name: /criar conta de cliente/i });
    expect(screen.queryByText(new RegExp(TOKEN))).not.toBeInTheDocument();
  });

  it("shows the server message for an invalid token, without the form", async () => {
    vi.mocked(clientInvitesApi.inspect).mockRejectedValue(
      httpError(404, {
        success: false,
        message: "Este convite não é mais válido.",
      }),
    );

    renderPage();

    expect(
      await screen.findByText("Este convite não é mais válido."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ir para o início/i }),
    ).toBeInTheDocument();
  });

  it("surfaces the expiry message when the link expired", async () => {
    vi.mocked(clientInvitesApi.inspect).mockRejectedValue(
      httpError(404, {
        success: false,
        message:
          "Este convite expirou. Solicite um novo convite ao responsável.",
      }),
    );

    renderPage();

    expect(
      await screen.findByText(
        "Este convite expirou. Solicite um novo convite ao responsável.",
      ),
    ).toBeInTheDocument();
  });

  it("offers the login link when the account already exists (409)", async () => {
    vi.mocked(clientInvitesApi.inspect).mockRejectedValue(
      httpError(409, {
        success: false,
        message: "Este cliente já possui uma conta de acesso.",
      }),
    );

    renderPage();

    expect(
      await screen.findByText("Este cliente já possui uma conta de acesso."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /entrar/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
  });

  it("offers a retry on a server failure and recovers", async () => {
    vi.mocked(clientInvitesApi.inspect).mockRejectedValueOnce(
      httpError(500, {
        success: false,
        message: "Erro interno do servidor. Tente novamente mais tarde.",
      }),
    );

    renderPage();

    const retryButton = await screen.findByRole("button", {
      name: /tentar novamente/i,
    });

    vi.mocked(clientInvitesApi.inspect).mockResolvedValue({
      success: true,
      message: "ok",
      data: invite,
    });
    fireEvent.click(retryButton);

    expect(
      await screen.findByRole("heading", { name: /criar conta de cliente/i }),
    ).toBeInTheDocument();
    expect(clientInvitesApi.inspect).toHaveBeenCalledTimes(2);
    expect(clientInvitesApi.inspect).toHaveBeenLastCalledWith({
      token: TOKEN,
    });
  });

  it("validates the password before calling accept", async () => {
    vi.mocked(clientInvitesApi.inspect).mockResolvedValue({
      success: true,
      message: "ok",
      data: invite,
    });

    renderPage();
    await screen.findByRole("heading", { name: /criar conta de cliente/i });

    fillAndSubmit("123", "123");

    expect(
      await screen.findByText("A senha deve possuir pelo menos 8 caracteres."),
    ).toBeInTheDocument();
    expect(clientInvitesApi.accept).not.toHaveBeenCalled();
  });

  it("rejects a confirmation that does not match", async () => {
    vi.mocked(clientInvitesApi.inspect).mockResolvedValue({
      success: true,
      message: "ok",
      data: invite,
    });

    renderPage();
    await screen.findByRole("heading", { name: /criar conta de cliente/i });

    fillAndSubmit("senhaForte123", "outra-senha");

    expect(await screen.findByText("As senhas não coincidem.")).toBeInTheDocument();
    expect(clientInvitesApi.accept).not.toHaveBeenCalled();
  });

  it("creates the account and offers the login link", async () => {
    vi.mocked(clientInvitesApi.inspect).mockResolvedValue({
      success: true,
      message: "ok",
      data: invite,
    });
    vi.mocked(clientInvitesApi.accept).mockResolvedValue({
      success: true,
      message: "ok",
      data: { email: "maria@email.com" },
    });

    renderPage();
    await screen.findByRole("heading", { name: /criar conta de cliente/i });

    fillAndSubmit();

    expect(
      await screen.findByText(/conta criada com sucesso/i),
    ).toBeInTheDocument();
    expect(clientInvitesApi.accept).toHaveBeenCalledWith({
      token: TOKEN,
      password: "senhaForte123",
      confirmPassword: "senhaForte123",
    });
    expect(screen.getByRole("link", { name: /entrar/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
  });

  it("shows the server message when the acceptance fails", async () => {
    vi.mocked(clientInvitesApi.inspect).mockResolvedValue({
      success: true,
      message: "ok",
      data: invite,
    });
    vi.mocked(clientInvitesApi.accept).mockRejectedValue(
      httpError(409, {
        success: false,
        message: "Já existe um usuário com este e-mail.",
      }),
    );

    renderPage();
    await screen.findByRole("heading", { name: /criar conta de cliente/i });

    fillAndSubmit();

    expect(
      await screen.findByText("Já existe um usuário com este e-mail."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
  });

  it("re-inspects the invite when it disappears during acceptance", async () => {
    vi.mocked(clientInvitesApi.inspect)
      .mockResolvedValueOnce({
        success: true,
        message: "ok",
        data: invite,
      })
      .mockRejectedValueOnce(
        httpError(404, {
          success: false,
          message: "Este convite não é mais válido.",
        }),
      );
    vi.mocked(clientInvitesApi.accept).mockRejectedValue(
      httpError(404, {
        success: false,
        message: "Este convite não é mais válido.",
      }),
    );

    renderPage();
    await screen.findByRole("heading", { name: /criar conta de cliente/i });

    fillAndSubmit();

    expect(
      await screen.findByText("Este convite não é mais válido."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(clientInvitesApi.inspect).toHaveBeenCalledTimes(2),
    );
  });

  it("treats a route without a token as an invalid link without calling the API", () => {
    renderPage("/convite/cliente");

    expect(
      screen.getByText("Convite inválido ou incompleto."),
    ).toBeInTheDocument();
    expect(clientInvitesApi.inspect).not.toHaveBeenCalled();
    expect(clientInvitesApi.accept).not.toHaveBeenCalled();
  });
});
