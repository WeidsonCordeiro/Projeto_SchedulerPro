import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SetClientCredentialsModal from "./SetClientCredentialsModal";
import clientsApi from "../../api/endpoints/clients.api";
import { httpError } from "../../test/http";
import type { Client } from "../../types/client";

vi.mock("../../api/endpoints/clients.api", () => ({
  default: {
    setClientCredentials: vi.fn(),
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

function onSaved() {}

function renderModal(overrides: Partial<Client> = {}) {
  return render(
    <SetClientCredentialsModal
      isOpen
      client={makeClient(overrides)}
      onClose={() => {}}
      onSaved={onSaved}
    />,
  );
}

describe("SetClientCredentialsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders null when closed", () => {
    const { container } = render(
      <SetClientCredentialsModal
        isOpen={false}
        client={makeClient()}
        onClose={() => {}}
        onSaved={onSaved}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the client email in the explanatory text", () => {
    renderModal();

    expect(
      screen.getByText(/definir credenciais/i).textContent,
    ).toBeDefined();
    expect(screen.getByText(/ana@example\.com/)).toBeInTheDocument();
  });

  it("renders the 'Dar acesso' context for a client without portal access", () => {
    renderModal({
      portalAccess: { exists: false, isActive: false },
    });

    expect(
      screen.getByRole("heading", { name: "Dar acesso ao portal do cliente" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/estas credenciais permitem/i)).toBeInTheDocument();
    expect(screen.queryByText(/já possui acesso/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/está inativo/i)).not.toBeInTheDocument();
  });

  it("renders the 'Gerenciar acesso' context when the account is active", () => {
    renderModal({
      portalAccess: { exists: true, isActive: true },
    });

    expect(
      screen.getByRole("heading", {
        name: "Gerenciar acesso ao portal do cliente",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/já possui acesso ao portal/i)).toBeInTheDocument();
    expect(screen.queryByText(/estas credenciais permitem/i)).not.toBeInTheDocument();
  });

  it("renders the 'Reativar acesso' context when the account is inactive", () => {
    renderModal({
      portalAccess: { exists: true, isActive: false },
    });

    expect(
      screen.getByRole("heading", {
        name: "Reativar acesso ao portal do cliente",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/está inativo/i)).toBeInTheDocument();
    expect(screen.queryByText(/já possui acesso/i)).not.toBeInTheDocument();
  });

  it("never exposes sensitive account data", () => {
    const { container } = render(
      <SetClientCredentialsModal
        isOpen
        client={makeClient({ portalAccess: { exists: true, isActive: true } })}
        onClose={() => {}}
        onSaved={onSaved}
      />,
    );

    expect(container.textContent).not.toMatch(/passwordHash/i);
    expect(container.textContent).not.toMatch(/token/i);
    expect(container.textContent).not.toMatch(/senha atual/i);
  });

  it("validates password minimum length", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: /definir credenciais/i }));

    expect(
      await screen.findByText("A senha deve possuir pelo menos 8 caracteres."),
    ).toBeInTheDocument();
    expect(clientsApi.setClientCredentials).not.toHaveBeenCalled();
  });

  it("validates password confirmation match", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: "other123" } });
    fireEvent.click(screen.getByRole("button", { name: /definir credenciais/i }));

    expect(
      await screen.findByText("As senhas não coincidem."),
    ).toBeInTheDocument();
  });

  it("calls setClientCredentials and closes on success", async () => {
    const close = vi.fn();
    const saved = vi.fn();
    vi.mocked(clientsApi.setClientCredentials).mockResolvedValue({
      success: true,
      message: "ok",
      data: makeClient(),
    });

    render(
      <SetClientCredentialsModal
        isOpen
        client={makeClient()}
        onClose={close}
        onSaved={saved}
      />,
    );

    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /definir credenciais/i }));

    expect(await screen.findByRole("button", { name: /definindo\.\.\./i })).toBeInTheDocument();
    expect(clientsApi.setClientCredentials).toHaveBeenCalledWith("abc123", {
      password: "password123",
      confirmPassword: "password123",
    });
    expect(close).toHaveBeenCalled();
  });

  it("shows server errors in the dialog", async () => {
    vi.mocked(clientsApi.setClientCredentials).mockRejectedValue(
      httpError(400, { message: "O cliente precisa de um email." }),
    );

    renderModal();

    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /definir credenciais/i }));

    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "O cliente precisa de um email.",
    );
  });
});