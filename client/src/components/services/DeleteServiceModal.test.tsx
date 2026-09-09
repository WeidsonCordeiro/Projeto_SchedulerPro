import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeleteServiceModal from "./DeleteServiceModal";
import servicesApi from "../../api/endpoints/services.api";
import { httpError, networkError } from "../../test/http";
import type { Service } from "../../types/service";

vi.mock("../../api/endpoints/services.api", () => ({
  default: {
    deleteService: vi.fn(),
  },
}));

const existingService: Service = {
  id: "abc123",
  name: "Corte de cabelo",
  description: null,
  duration: 30,
  price: 15.5,
  companyId: "company1",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderModal(
  props: Partial<Parameters<typeof DeleteServiceModal>[0]> = {},
) {
  const onClose = vi.fn();
  const onDeleted = vi.fn();
  render(
    <DeleteServiceModal
      isOpen
      service={existingService}
      onClose={onClose}
      onDeleted={onDeleted}
      {...props}
    />,
  );
  return { onClose, onDeleted };
}

describe("DeleteServiceModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    render(
      <DeleteServiceModal
        isOpen={false}
        service={existingService}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders nothing when service is null", () => {
    render(
      <DeleteServiceModal
        isOpen
        service={null}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("displays the service name and confirmation message", () => {
    renderModal();
    expect(screen.getByRole("heading", { name: "Excluir serviço" })).toBeInTheDocument();
    expect(
      screen.getByText("Tem certeza que deseja excluir este serviço?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Corte de cabelo")).toBeInTheDocument();
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

  it("calls deleteService and onDeleted on successful deletion", async () => {
    vi.mocked(servicesApi.deleteService).mockResolvedValue({
      success: true,
      message: "Serviço removido com sucesso.",
      data: null,
    });

    const { onDeleted, onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /excluir$/i }));

    await waitFor(() => expect(servicesApi.deleteService).toHaveBeenCalledWith("abc123"));
    expect(onDeleted).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows an error message when deletion fails", async () => {
    vi.mocked(servicesApi.deleteService).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    const { onDeleted, onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /excluir$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );
    expect(onDeleted).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows a friendly message on network errors", async () => {
    vi.mocked(servicesApi.deleteService).mockRejectedValue(networkError());

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
    vi.mocked(servicesApi.deleteService).mockImplementation(
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
    expect(servicesApi.deleteService).toHaveBeenCalledTimes(1);

    resolveRequest({ success: true, message: "ok", data: null });
    await waitFor(() => expect(servicesApi.deleteService).toHaveBeenCalledTimes(1));
  });
});