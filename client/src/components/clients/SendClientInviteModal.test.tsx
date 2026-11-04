import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SendClientInviteModal from "./SendClientInviteModal";
import clientsApi from "../../api/endpoints/clients.api";
import { httpError } from "../../test/http";
import type { Client } from "../../types/client";

vi.mock("../../api/endpoints/clients.api", () => ({
  default: {
    sendClientInvite: vi.fn(),
  },
}));

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "abc123",
    name: "Ana Silva",
    email: "ana@example.com",
    phone: "912345678",
    companyId: "company1",
    notes: null,
    isActive: true,
    portalAccess: { exists: false, isActive: false },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderModal(overrides: Partial<Client> = {}, onSent = vi.fn()) {
  return render(
    <SendClientInviteModal
      isOpen
      client={makeClient(overrides)}
      onClose={() => {}}
      onSent={onSent}
    />,
  );
}

describe("SendClientInviteModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders null when closed", () => {
    const { container } = render(
      <SendClientInviteModal
        isOpen={false}
        client={makeClient()}
        onClose={() => {}}
        onSent={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("explains the invite before sending", () => {
    renderModal();

    expect(
      screen.getByRole("heading", { name: /enviar convite de acesso/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText(/expira em 7 dias/i)).toBeInTheDocument();
  });

  it("emits the invite and reports the email", async () => {
    const onSent = vi.fn();
    vi.mocked(clientsApi.sendClientInvite).mockResolvedValue({
      success: true,
      message: "ok",
      data: { expiresAt: "2026-10-14T00:00:00.000Z" },
    });

    renderModal({}, onSent);

    fireEvent.click(screen.getByRole("button", { name: /enviar convite/i }));

    expect(await screen.findByText("ana@example.com")).toBeInTheDocument();
    expect(clientsApi.sendClientInvite).toHaveBeenCalledWith("abc123");
    expect(onSent).toHaveBeenCalledWith("ana@example.com");
  });

  it("keeps the modal open with the server message on conflict (409)", async () => {
    vi.mocked(clientsApi.sendClientInvite).mockRejectedValue(
      httpError(409, {
        success: false,
        message: "Este cliente já possui uma conta de acesso.",
      }),
    );

    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /enviar convite/i }));

    expect(
      await screen.findByText("Este cliente já possui uma conta de acesso."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /enviar convite de acesso/i }),
    ).toBeInTheDocument();
  });

  it("does not send twice while a request is in flight", () => {
    vi.mocked(clientsApi.sendClientInvite).mockReturnValue(
      new Promise(() => {}),
    );

    renderModal();

    const submit = screen.getByRole("button", { name: /enviar convite/i });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(clientsApi.sendClientInvite).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
  });

  it("closes through Cancelar without sending", () => {
    const onClose = vi.fn();
    render(
      <SendClientInviteModal
        isOpen
        client={makeClient()}
        onClose={onClose}
        onSent={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(clientsApi.sendClientInvite).not.toHaveBeenCalled();
  });

  it("shows the server message when the request fails", async () => {
    vi.mocked(clientsApi.sendClientInvite).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /enviar convite/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );
    expect(
      screen.getByRole("heading", { name: /enviar convite de acesso/i }),
    ).toBeInTheDocument();
  });
});
