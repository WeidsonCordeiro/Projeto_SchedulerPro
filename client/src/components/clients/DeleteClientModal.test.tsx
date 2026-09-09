import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeleteClientModal from "./DeleteClientModal";
import clientsApi from "../../api/endpoints/clients.api";
import { httpError, networkError } from "../../test/http";
import type { Client } from "../../types/client";

vi.mock("../../api/endpoints/clients.api", () => ({
  default: {
    deleteClient: vi.fn(),
  },
}));

const existingClient: Client = {
  id: "abc123",
  name: "Ana Silva",
  email: "ana@example.com",
  phone: "912345678",
  companyId: "company1",
  notes: null,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderModal(props: Partial<Parameters<typeof DeleteClientModal>[0]> = {}) {
  const onClose = vi.fn();
  const onDeleted = vi.fn();
  render(
    <DeleteClientModal
      isOpen
      client={existingClient}
      onClose={onClose}
      onDeleted={onDeleted}
      {...props}
    />,
  );
  return { onClose, onDeleted };
}

describe("DeleteClientModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    render(
      <DeleteClientModal
        isOpen={false}
        client={existingClient}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders nothing when client is null", () => {
    render(
      <DeleteClientModal
        isOpen
        client={null}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("displays the client name and confirmation message", () => {
    renderModal();
    expect(screen.getByRole("heading", { name: "Excluir cliente" })).toBeInTheDocument();
    expect(screen.getByText("Tem certeza que deseja excluir este cliente?")).toBeInTheDocument();
    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
  });

  it("calls onClose when the cancel button is clicked", () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when the close button is clicked", () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /fechar/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls deleteClient and onDeleted on successful deletion", async () => {
    vi.mocked(clientsApi.deleteClient).mockResolvedValue({
      success: true,
      message: "Cliente excluído com sucesso.",
      data: null,
    });

    const { onDeleted, onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /excluir$/i }));

    await waitFor(() => expect(clientsApi.deleteClient).toHaveBeenCalledWith("abc123"));
    expect(onDeleted).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows an error message when deletion fails", async () => {
    vi.mocked(clientsApi.deleteClient).mockRejectedValue(
      httpError(409, { message: "Cliente possui agendamentos ativos." }),
    );

    const { onDeleted, onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /excluir$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cliente possui agendamentos ativos.",
    );
    expect(onDeleted).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows a friendly message on network errors", async () => {
    vi.mocked(clientsApi.deleteClient).mockRejectedValue(networkError());

    renderModal();
    fireEvent.click(screen.getByRole("button", { name: /excluir$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível conectar ao servidor. Verifique sua conexão.",
    );
  });

  it("shows loading state and blocks duplicate submissions", async () => {
    let resolveRequest: (value: {
      success: boolean;
      message: string;
      data: null;
    }) => void = () => {};
    vi.mocked(clientsApi.deleteClient).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    renderModal();
    fireEvent.click(screen.getByRole("button", { name: /excluir$/i }));

    const deletingButton = screen.getByRole("button", { name: /excluindo/i });
    expect(deletingButton).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /fechar/i })).toBeDisabled();

    fireEvent.click(deletingButton);
    expect(clientsApi.deleteClient).toHaveBeenCalledTimes(1);

    resolveRequest({ success: true, message: "ok", data: null });
    await waitFor(() => expect(clientsApi.deleteClient).toHaveBeenCalledTimes(1));
  });
});
