import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeleteEmployeeModal from "./DeleteEmployeeModal";
import employeesApi from "../../api/endpoints/employees.api";
import { httpError, networkError } from "../../test/http";
import type { Employee } from "../../types/employee";

vi.mock("../../api/endpoints/employees.api", () => ({
  default: {
    deleteEmployee: vi.fn(),
  },
}));

const existingEmployee: Employee = {
  id: "abc123",
  companyId: "507f1f77bcf86cd799439012",
  name: "Ana Silva",
  email: "ana@example.com",
  role: "EMPLOYEE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderModal(
  props: Partial<Parameters<typeof DeleteEmployeeModal>[0]> = {},
) {
  const onClose = vi.fn();
  const onDeleted = vi.fn();
  render(
    <DeleteEmployeeModal
      isOpen
      employee={existingEmployee}
      onClose={onClose}
      onDeleted={onDeleted}
      {...props}
    />,
  );
  return { onClose, onDeleted };
}

describe("DeleteEmployeeModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    render(
      <DeleteEmployeeModal
        isOpen={false}
        employee={existingEmployee}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders nothing when employee is null", () => {
    render(
      <DeleteEmployeeModal
        isOpen
        employee={null}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("displays the employee name and confirmation message", () => {
    renderModal();
    expect(
      screen.getByRole("heading", { name: "Excluir funcionário" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Tem certeza que deseja excluir este funcionário?"),
    ).toBeInTheDocument();
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

  it("calls deleteEmployee and onDeleted on successful deletion", async () => {
    vi.mocked(employeesApi.deleteEmployee).mockResolvedValue({
      success: true,
      message: "Funcionário removido com sucesso.",
      data: null,
    });

    const { onDeleted, onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /excluir$/i }));

    await waitFor(() =>
      expect(employeesApi.deleteEmployee).toHaveBeenCalledWith("abc123"),
    );
    expect(onDeleted).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows an error message when deletion fails", async () => {
    vi.mocked(employeesApi.deleteEmployee).mockRejectedValue(
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
    vi.mocked(employeesApi.deleteEmployee).mockRejectedValue(networkError());

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
    vi.mocked(employeesApi.deleteEmployee).mockImplementation(
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
    expect(employeesApi.deleteEmployee).toHaveBeenCalledTimes(1);

    resolveRequest({ success: true, message: "ok", data: null });
    await waitFor(() =>
      expect(employeesApi.deleteEmployee).toHaveBeenCalledTimes(1),
    );
  });
});