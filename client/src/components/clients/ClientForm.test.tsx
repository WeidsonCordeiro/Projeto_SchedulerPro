import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClientForm from "./ClientForm";
import clientsApi from "../../api/endpoints/clients.api";
import { httpError, networkError } from "../../test/http";
import type { Client } from "../../types/client";

vi.mock("../../api/endpoints/clients.api", () => ({
  default: {
    createClient: vi.fn(),
    updateClient: vi.fn(),
  },
}));

const existingClient: Client = {
  id: "abc123",
  name: "Ana Silva",
  email: "ana@example.com",
  phone: "912345678",
  companyId: "company1",
  notes: "Cliente antigo",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderForm(props: Partial<Parameters<typeof ClientForm>[0]> = {}) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    <ClientForm
      isOpen
      client={null}
      onClose={onClose}
      onSaved={onSaved}
      {...props}
    />,
  );
  return { onClose, onSaved };
}

function fillForm({
  name = "Bruno Costa",
  email = "",
  phone = "933123456",
  notes = "",
}: {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
} = {}) {
  fireEvent.change(screen.getByLabelText("Nome"), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Telefone"), {
    target: { value: phone },
  });
  fireEvent.change(screen.getByLabelText("Observações"), {
    target: { value: notes },
  });
}

describe("ClientForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    render(<ClientForm isOpen={false} client={null} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the create form when no client is provided", () => {
    renderForm();
    expect(screen.getByRole("heading", { name: "Novo cliente" })).toBeInTheDocument();
  });

  it("renders the edit form pre-filled when a client is provided", () => {
    renderForm({ client: existingClient });
    expect(screen.getByRole("heading", { name: "Editar cliente" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveValue("Ana Silva");
    expect(screen.getByLabelText("Email")).toHaveValue("ana@example.com");
    expect(screen.getByLabelText("Telefone")).toHaveValue("912345678");
    expect(screen.getByLabelText("Observações")).toHaveValue("Cliente antigo");
  });

  it("validates required fields without calling the API", () => {
    renderForm();
    fillForm({ name: "", email: "", phone: "", notes: "" });
    fireEvent.click(screen.getByRole("button", { name: /criar cliente/i }));

    expect(screen.getByText("O nome do cliente é obrigatório.")).toBeInTheDocument();
    expect(screen.getByText("O telefone do cliente é obrigatório.")).toBeInTheDocument();
    expect(clientsApi.createClient).not.toHaveBeenCalled();
  });

  it("rejects a short name and a short phone", () => {
    renderForm();
    fillForm({ name: "A", phone: "123" });
    fireEvent.click(screen.getByRole("button", { name: /criar cliente/i }));

    expect(
      screen.getByText("O nome deve ter entre 2 e 100 caracteres."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("O telefone deve ter entre 8 e 20 caracteres."),
    ).toBeInTheDocument();
    expect(clientsApi.createClient).not.toHaveBeenCalled();
  });

  it("rejects an invalid email address", () => {
    renderForm();
    fillForm({ email: "nao-e-email" });
    fireEvent.click(screen.getByRole("button", { name: /criar cliente/i }));

    expect(screen.getByText("O e-mail informado é inválido.")).toBeInTheDocument();
    expect(clientsApi.createClient).not.toHaveBeenCalled();
  });

  it("rejects notes longer than 500 characters", () => {
    renderForm();
    fillForm({ notes: "x".repeat(501) });
    fireEvent.click(screen.getByRole("button", { name: /criar cliente/i }));

    expect(
      screen.getByText("As observações devem ter no máximo 500 caracteres."),
    ).toBeInTheDocument();
    expect(clientsApi.createClient).not.toHaveBeenCalled();
  });

  it("shows a field error once and removes it after the submit retry succeeds", async () => {
    vi.mocked(clientsApi.createClient).mockResolvedValue({
      success: true,
      message: "Cliente criado com sucesso.",
      data: existingClient,
    });

    const { onSaved, onClose } = renderForm();
    fillForm({ name: "", phone: "933123456" });
    fireEvent.click(screen.getByRole("button", { name: /criar cliente/i }));
    expect(
      screen.getByText("O nome do cliente é obrigatório."),
    ).toBeInTheDocument();

    fillForm({ name: "Bruno Costa", phone: "933123456" });
    fireEvent.click(screen.getByRole("button", { name: /criar cliente/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(clientsApi.createClient).toHaveBeenCalledWith({
      name: "Bruno Costa",
      email: undefined,
      phone: "933123456",
      notes: undefined,
    });
    expect(onSaved).toHaveBeenCalledWith(existingClient);
  });

  it("calls createClient with trimmed payload on success", async () => {
    vi.mocked(clientsApi.createClient).mockResolvedValue({
      success: true,
      message: "Cliente criado com sucesso.",
      data: existingClient,
    });

    const { onSaved, onClose } = renderForm();
    fillForm({ name: "  Bruno Costa  ", email: "bruno@example.com", phone: " 933123456 " });
    fireEvent.click(screen.getByRole("button", { name: /criar cliente/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(clientsApi.createClient).toHaveBeenCalledWith({
      name: "Bruno Costa",
      email: "bruno@example.com",
      phone: "933123456",
      notes: undefined,
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("calls updateClient in edit mode", async () => {
    vi.mocked(clientsApi.updateClient).mockResolvedValue({
      success: true,
      message: "Cliente atualizado com sucesso.",
      data: { ...existingClient, name: "Ana Souza" },
    });

    const { onSaved, onClose } = renderForm({ client: existingClient });
    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Ana Souza" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(clientsApi.updateClient).toHaveBeenCalledWith("abc123", {
      name: "Ana Souza",
      email: "ana@example.com",
      phone: "912345678",
      notes: "Cliente antigo",
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("shows server validation messages coming from the API body", async () => {
    vi.mocked(clientsApi.createClient).mockRejectedValue(
      httpError(400, {
        message: "Dados inválidos.",
        errors: [{ field: "phone", message: "Telefone já cadastrado." }],
      }),
    );

    renderForm();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /criar cliente/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Dados inválidos.",
    );
  });

  it("stays open and re-enables the button after a server error", async () => {
    vi.mocked(clientsApi.createClient).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    const { onClose } = renderForm();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /criar cliente/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );
    expect(screen.getByRole("button", { name: /criar cliente/i })).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows a friendly message on network errors", async () => {
    vi.mocked(clientsApi.createClient).mockRejectedValue(networkError());

    renderForm();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /criar cliente/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível conectar ao servidor. Verifique sua conexão.",
    );
  });

  it("shows loading, blocks duplicate submits and disables cancel while pending", async () => {
    let resolveRequest: (value: {
      success: boolean;
      message: string;
      data: Client;
    }) => void = () => {};
    vi.mocked(clientsApi.createClient).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const { onClose } = renderForm();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /criar cliente/i }));

    const submittingButton = screen.getByRole("button", { name: /criando/i });
    expect(submittingButton).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();

    fireEvent.click(submittingButton);
    expect(clientsApi.createClient).toHaveBeenCalledTimes(1);

    resolveRequest({
      success: true,
      message: "ok",
      data: existingClient,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});