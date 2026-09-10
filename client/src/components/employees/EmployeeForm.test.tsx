import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmployeeForm from "./EmployeeForm";
import employeesApi from "../../api/endpoints/employees.api";
import { httpError, networkError } from "../../test/http";
import type { Employee } from "../../types/employee";

vi.mock("../../api/endpoints/employees.api", () => ({
  default: {
    createEmployee: vi.fn(),
    updateEmployee: vi.fn(),
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

function renderForm(props: Partial<Parameters<typeof EmployeeForm>[0]> = {}) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    <EmployeeForm
      isOpen
      employee={null}
      actorRole="OWNER"
      currentUserId="user-other"
      onClose={onClose}
      onSaved={onSaved}
      {...props}
    />,
  );
  return { onClose, onSaved };
}

function fillCreateForm({
  name = "Ana Silva",
  email = "ana@example.com",
  password = "secret123",
  confirmPassword = "secret123",
}: {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
} = {}) {
  fireEvent.change(screen.getByLabelText("Nome"), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText("E-mail"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Senha"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("Confirmação de senha"), {
    target: { value: confirmPassword },
  });
}

describe("EmployeeForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    render(
      <EmployeeForm
        isOpen={false}
        employee={null}
        actorRole="OWNER"
        currentUserId="user-other"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the create form with password fields when no employee is provided", () => {
    renderForm();
    expect(
      screen.getByRole("heading", { name: "Novo funcionário" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Perfil")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmação de senha")).toBeInTheDocument();
  });

  it("defaults the role to EMPLOYEE for a company member", () => {
    renderForm();
    expect(screen.getByLabelText("Perfil")).toHaveValue("EMPLOYEE");
  });

  it("shows the first access note when the selected role is EMPLOYEE", () => {
    renderForm();
    expect(
      screen.getByText("Funcionários devem alterar a senha no primeiro acesso."),
    ).toBeInTheDocument();
  });

  it("renders the edit form pre-filled without password fields when an employee is provided", () => {
    renderForm({ employee: existingEmployee });
    expect(
      screen.getByRole("heading", { name: "Editar funcionário" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveValue("Ana Silva");
    expect(screen.getByLabelText("E-mail")).toHaveValue("ana@example.com");
    expect(screen.getByLabelText("Perfil")).toHaveValue("EMPLOYEE");
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Confirmação de senha"),
    ).not.toBeInTheDocument();
  });

  it("validates required fields without calling the API", () => {
    renderForm();
    fillCreateForm({ name: "", email: "", password: "", confirmPassword: "" });
    fireEvent.click(screen.getByRole("button", { name: /criar funcionário/i }));

    expect(screen.getByText("O nome é obrigatório.")).toBeInTheDocument();
    expect(screen.getByText("O e-mail é obrigatório.")).toBeInTheDocument();
    expect(screen.getByText("A senha é obrigatória.")).toBeInTheDocument();
    expect(
      screen.getByText("A confirmação de senha é obrigatória."),
    ).toBeInTheDocument();
    expect(employeesApi.createEmployee).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", () => {
    renderForm();
    fillCreateForm({ email: "invalido" });
    fireEvent.click(screen.getByRole("button", { name: /criar funcionário/i }));

    expect(screen.getByText("O e-mail é inválido.")).toBeInTheDocument();
    expect(employeesApi.createEmployee).not.toHaveBeenCalled();
  });

  it("rejects a short name", () => {
    renderForm();
    fillCreateForm({ name: "Ab" });
    fireEvent.click(screen.getByRole("button", { name: /criar funcionário/i }));

    expect(
      screen.getByText("O nome deve possuir entre 3 e 120 caracteres."),
    ).toBeInTheDocument();
    expect(employeesApi.createEmployee).not.toHaveBeenCalled();
  });

  it("rejects a short password", () => {
    renderForm();
    fillCreateForm({ password: "1234567", confirmPassword: "1234567" });
    fireEvent.click(screen.getByRole("button", { name: /criar funcionário/i }));

    expect(
      screen.getByText("A senha deve possuir pelo menos 8 caracteres."),
    ).toBeInTheDocument();
    expect(employeesApi.createEmployee).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords", () => {
    renderForm();
    fillCreateForm({ password: "secret123", confirmPassword: "different456" });
    fireEvent.click(screen.getByRole("button", { name: /criar funcionário/i }));

    expect(screen.getByText("As senhas não coincidem.")).toBeInTheDocument();
    expect(employeesApi.createEmployee).not.toHaveBeenCalled();
  });

  it("calls createEmployee with a trimmed and normalized payload on success", async () => {
    vi.mocked(employeesApi.createEmployee).mockResolvedValue({
      success: true,
      message: "Funcionário criado com sucesso.",
      data: existingEmployee,
    });

    const { onSaved, onClose } = renderForm();
    fillCreateForm({
      name: "  Ana Silva  ",
      email: "  ANA@Example.COM  ",
    });
    fireEvent.click(screen.getByRole("button", { name: /criar funcionário/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(employeesApi.createEmployee).toHaveBeenCalledWith({
      name: "Ana Silva",
      email: "ana@example.com",
      password: "secret123",
      confirmPassword: "secret123",
      role: "EMPLOYEE",
    });
    expect(onSaved).toHaveBeenCalledWith(existingEmployee);
  });

  it("creates the employee with the selected role", async () => {
    vi.mocked(employeesApi.createEmployee).mockResolvedValue({
      success: true,
      message: "Funcionário criado com sucesso.",
      data: existingEmployee,
    });

    renderForm();
    fillCreateForm();
    fireEvent.change(screen.getByLabelText("Perfil"), {
      target: { value: "MANAGER" },
    });
    fireEvent.click(screen.getByRole("button", { name: /criar funcionário/i }));

    await waitFor(() => expect(employeesApi.createEmployee).toHaveBeenCalled());
    expect(employeesApi.createEmployee).toHaveBeenCalledWith(
      expect.objectContaining({ role: "MANAGER" }),
    );
  });

  it("calls updateEmployee without a role when nothing changed", async () => {
    vi.mocked(employeesApi.updateEmployee).mockResolvedValue({
      success: true,
      message: "Funcionário atualizado com sucesso.",
      data: existingEmployee,
    });

    const { onSaved, onClose } = renderForm({ employee: existingEmployee });
    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Ana Souza" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(employeesApi.updateEmployee).toHaveBeenCalledWith("abc123", {
      name: "Ana Souza",
      email: "ana@example.com",
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("sends the role when it changes for another employee", async () => {
    vi.mocked(employeesApi.updateEmployee).mockResolvedValue({
      success: true,
      message: "Funcionário atualizado com sucesso.",
      data: { ...existingEmployee, role: "MANAGER" },
    });

    renderForm({ employee: existingEmployee });
    fireEvent.change(screen.getByLabelText("Perfil"), {
      target: { value: "MANAGER" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(employeesApi.updateEmployee).toHaveBeenCalled());
    expect(employeesApi.updateEmployee).toHaveBeenCalledWith("abc123", {
      name: "Ana Silva",
      email: "ana@example.com",
      role: "MANAGER",
    });
  });

  it("disables the role field and never sends a role when editing yourself", async () => {
    vi.mocked(employeesApi.updateEmployee).mockResolvedValue({
      success: true,
      message: "Funcionário atualizado com sucesso.",
      data: existingEmployee,
    });

    const { onClose } = renderForm({
      employee: existingEmployee,
      currentUserId: "abc123",
    });
    expect(screen.getByLabelText("Perfil")).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Ana Souza" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(employeesApi.updateEmployee).toHaveBeenCalledWith("abc123", {
      name: "Ana Souza",
      email: "ana@example.com",
    });
    expect(
      vi.mocked(employeesApi.updateEmployee).mock.calls[0][1],
    ).not.toHaveProperty("role");
  });

  it("disables the role field when the current role is not assignable", () => {
    const owner: Employee = { ...existingEmployee, role: "OWNER" };
    renderForm({
      employee: owner,
      actorRole: "ADMIN",
      currentUserId: "user-other",
    });
    expect(screen.getByLabelText("Perfil")).toBeDisabled();
    expect(
      screen.getByText("O perfil não pode ser alterado para este funcionário."),
    ).toBeInTheDocument();
  });

  it("shows server validation messages coming from the API body", async () => {
    vi.mocked(employeesApi.createEmployee).mockRejectedValue(
      httpError(400, {
        message: "Dados inválidos.",
        errors: [{ field: "email", message: "E-mail já cadastrado." }],
      }),
    );

    renderForm();
    fillCreateForm();
    fireEvent.click(screen.getByRole("button", { name: /criar funcionário/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Dados inválidos.",
    );
  });

  it("stays open and re-enables the button after a server error", async () => {
    vi.mocked(employeesApi.createEmployee).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    const { onClose } = renderForm();
    fillCreateForm();
    fireEvent.click(screen.getByRole("button", { name: /criar funcionário/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );
    expect(
      screen.getByRole("button", { name: /criar funcionário/i }),
    ).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows a friendly message on network errors", async () => {
    vi.mocked(employeesApi.createEmployee).mockRejectedValue(networkError());

    renderForm();
    fillCreateForm();
    fireEvent.click(screen.getByRole("button", { name: /criar funcionário/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível conectar ao servidor. Verifique sua conexão.",
    );
  });

  it("shows loading, blocks duplicate submits and disables cancel while pending", async () => {
    let resolveRequest: (value: {
      success: boolean;
      message: string;
      data: Employee;
    }) => void = () => {};
    vi.mocked(employeesApi.createEmployee).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const { onClose } = renderForm();
    fillCreateForm();
    fireEvent.click(screen.getByRole("button", { name: /criar funcionário/i }));

    const submittingButton = screen.getByRole("button", { name: /criando/i });
    expect(submittingButton).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
    expect(screen.getByLabelText("Confirmação de senha")).toHaveValue(
      "secret123",
    );

    fireEvent.click(submittingButton);
    expect(employeesApi.createEmployee).toHaveBeenCalledTimes(1);

    resolveRequest({
      success: true,
      message: "ok",
      data: existingEmployee,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});