import { fireEvent, render, screen, within } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmployeesPage from "./EmployeesPage";
import employeesApi from "../../api/endpoints/employees.api";
import authReducer from "../../store/slices/authSlice";
import { httpError } from "../../test/http";
import { user } from "../../test/fixtures";
import type { Employee } from "../../types/employee";
import type { Role } from "../../types/auth";

vi.mock("../../api/endpoints/employees.api", () => ({
  default: {
    getEmployees: vi.fn(),
    createEmployee: vi.fn(),
    updateEmployee: vi.fn(),
    deleteEmployee: vi.fn(),
    activateEmployee: vi.fn(),
    deactivateEmployee: vi.fn(),
  },
}));

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "abc123",
    companyId: "507f1f77bcf86cd799439012",
    name: "Ana Silva",
    email: "ana@example.com",
    role: "EMPLOYEE",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeStore(role: Role = "OWNER") {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: { ...user, role },
        mustChangePassword: false,
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
      },
    },
  });
}

function renderPage(store = makeStore()) {
  return render(
    <Provider store={store}>
      <EmployeesPage />
    </Provider>,
  );
}

describe("EmployeesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading spinner while the list loads", () => {
    vi.mocked(employeesApi.getEmployees).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows a friendly error and a retry button when loading fails", async () => {
    vi.mocked(employeesApi.getEmployees)
      .mockRejectedValueOnce(
        httpError(500, { message: "Erro interno do servidor." }),
      )
      .mockResolvedValueOnce({
        success: true,
        message: "ok",
        data: [makeEmployee()],
      });

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );

    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(employeesApi.getEmployees).toHaveBeenCalledTimes(2);
  });

  it("shows the empty state with a create button for OWNER", async () => {
    vi.mocked(employeesApi.getEmployees).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });

    renderPage();

    expect(
      await screen.findByRole("button", { name: /cadastrar primeiro funcionário/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Nenhum funcionário cadastrado.")).toBeInTheDocument();
  });

  it("renders the employee list with name, email, role and creation date", async () => {
    vi.mocked(employeesApi.getEmployees).mockResolvedValue({
      success: true,
      message: "ok",
      data: [
        makeEmployee(),
        makeEmployee({
          id: "2",
          name: "Bruno Lima",
          email: "bruno@example.com",
          role: "MANAGER",
        }),
      ],
    });

    renderPage();

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Ana Silva")).toBeInTheDocument();
    expect(within(table).getByText("ana@example.com")).toBeInTheDocument();
    expect(within(table).getByText("Bruno Lima")).toBeInTheDocument();
    expect(within(table).getByText("bruno@example.com")).toBeInTheDocument();
    expect(within(table).getByText("EMPLOYEE")).toBeInTheDocument();
    expect(within(table).getByText("MANAGER")).toBeInTheDocument();
    expect(
      within(table).getAllByText((content) => content.includes("2026")),
    ).toHaveLength(2);
  });

  it("creates an employee through the form and reloads the list", async () => {
    const created = makeEmployee({ id: "99", name: "Bruno Lima" });
    vi.mocked(employeesApi.getEmployees).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeEmployee()],
    });
    vi.mocked(employeesApi.createEmployee).mockResolvedValue({
      success: true,
      message: "Funcionário criado com sucesso.",
      data: created,
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /novo funcionário/i }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Nome"), {
      target: { value: "Bruno Lima" },
    });
    fireEvent.change(within(dialog).getByLabelText("E-mail"), {
      target: { value: "bruno@example.com" },
    });
    fireEvent.change(within(dialog).getByLabelText("Senha"), {
      target: { value: "secret123" },
    });
    fireEvent.change(within(dialog).getByLabelText("Confirmação de senha"), {
      target: { value: "secret123" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /criar funcionário/i }),
    );

    expect(
      await screen.findByText("Funcionário criado com sucesso."),
    ).toBeInTheDocument();
    expect(employeesApi.createEmployee).toHaveBeenCalledWith({
      name: "Bruno Lima",
      email: "bruno@example.com",
      password: "secret123",
      confirmPassword: "secret123",
      role: "EMPLOYEE",
    });
    expect(employeesApi.getEmployees).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("edits an employee through the pre-filled form", async () => {
    const employee = makeEmployee();
    vi.mocked(employeesApi.getEmployees).mockResolvedValue({
      success: true,
      message: "ok",
      data: [employee],
    });
    vi.mocked(employeesApi.updateEmployee).mockResolvedValue({
      success: true,
      message: "Funcionário atualizado com sucesso.",
      data: { ...employee, name: "Ana Souza" },
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Nome")).toHaveValue("Ana Silva");
    expect(within(dialog).getByLabelText("E-mail")).toHaveValue(
      "ana@example.com",
    );
    expect(within(dialog).getByLabelText("Perfil")).toHaveValue("EMPLOYEE");

    fireEvent.change(within(dialog).getByLabelText("Nome"), {
      target: { value: "Ana Souza" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /salvar/i }));

    expect(
      await screen.findByText("Funcionário atualizado com sucesso."),
    ).toBeInTheDocument();
    expect(employeesApi.updateEmployee).toHaveBeenCalledWith("abc123", {
      name: "Ana Souza",
      email: "ana@example.com",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deletes an employee after confirmation", async () => {
    vi.mocked(employeesApi.getEmployees).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeEmployee(), makeEmployee({ id: "2", name: "Bruno Lima" })],
    });
    vi.mocked(employeesApi.deleteEmployee).mockResolvedValue({
      success: true,
      message: "Funcionário removido com sucesso.",
      data: null,
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getAllByRole("button", { name: /excluir/i })[0]);

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Tem certeza que deseja excluir este funcionário?"),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(
      await screen.findByText("Funcionário excluído com sucesso."),
    ).toBeInTheDocument();
    expect(employeesApi.deleteEmployee).toHaveBeenCalledWith("abc123");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not delete when the user cancels the confirmation", async () => {
    vi.mocked(employeesApi.getEmployees).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeEmployee()],
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /excluir/i }));

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /cancelar/i }));

    expect(employeesApi.deleteEmployee).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows delete errors in the confirmation dialog", async () => {
    vi.mocked(employeesApi.getEmployees).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeEmployee()],
    });
    vi.mocked(employeesApi.deleteEmployee).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /excluir/i }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Excluir" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );
  });

  it("deactivates an employee", async () => {
    vi.mocked(employeesApi.getEmployees).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeEmployee()],
    });
    vi.mocked(employeesApi.deactivateEmployee).mockResolvedValue({
      success: true,
      message: "Funcionário desativado com sucesso.",
      data: makeEmployee(),
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /desativar/i }));

    expect(
      await screen.findByText("Funcionário desativado com sucesso."),
    ).toBeInTheDocument();
    expect(employeesApi.deactivateEmployee).toHaveBeenCalledWith("abc123");
    expect(employeesApi.getEmployees).toHaveBeenCalledTimes(2);
  });

  it("activates an employee", async () => {
    vi.mocked(employeesApi.getEmployees).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeEmployee()],
    });
    vi.mocked(employeesApi.activateEmployee).mockResolvedValue({
      success: true,
      message: "Funcionário ativado com sucesso.",
      data: makeEmployee(),
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: "Ativar" }));

    expect(
      await screen.findByText("Funcionário ativado com sucesso."),
    ).toBeInTheDocument();
    expect(employeesApi.activateEmployee).toHaveBeenCalledWith("abc123");
    expect(employeesApi.getEmployees).toHaveBeenCalledTimes(2);
  });

  it("shows a friendly error when toggling the status fails", async () => {
    vi.mocked(employeesApi.getEmployees).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeEmployee()],
    });
    vi.mocked(employeesApi.deactivateEmployee).mockRejectedValue(
      httpError(403, { message: "Não autorizado." }),
    );

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /desativar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não autorizado.",
    );
  });

  it("shows a permission warning and never fetches for MANAGER", async () => {
    vi.mocked(employeesApi.getEmployees).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });

    renderPage(makeStore("MANAGER"));

    expect(
      await screen.findByText("Você não tem permissão para acessar esta página."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /novo funcionário/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(employeesApi.getEmployees).not.toHaveBeenCalled();
  });

  it("shows a permission warning and never fetches for EMPLOYEE", async () => {
    vi.mocked(employeesApi.getEmployees).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });

    renderPage(makeStore("EMPLOYEE"));

    expect(
      await screen.findByText("Você não tem permissão para acessar esta página."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(employeesApi.getEmployees).not.toHaveBeenCalled();
  });

  it("shows create/edit/toggle but hides delete for ADMIN", async () => {
    vi.mocked(employeesApi.getEmployees).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeEmployee()],
    });

    renderPage(makeStore("ADMIN"));

    await screen.findByRole("table");
    expect(
      screen.getByRole("button", { name: /novo funcionário/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /desativar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ativar" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /excluir/i }),
    ).not.toBeInTheDocument();
  });

  it("shows create/edit/toggle and delete for OWNER", async () => {
    vi.mocked(employeesApi.getEmployees).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeEmployee()],
    });

    renderPage(makeStore("OWNER"));

    await screen.findByRole("table");
    expect(
      screen.getByRole("button", { name: /novo funcionário/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /desativar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ativar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /excluir/i }),
    ).toBeInTheDocument();
  });

  it("marks your own row and hides destructive actions for it", async () => {
    vi.mocked(employeesApi.getEmployees).mockResolvedValue({
      success: true,
      message: "ok",
      data: [
        makeEmployee({
          id: "507f1f77bcf86cd799439011",
          name: "Owner Teste",
          role: "OWNER",
        }),
      ],
    });

    renderPage(makeStore("OWNER"));

    const table = await screen.findByRole("table");
    const selfRow = within(table).getByText("Owner Teste").closest("tr");
    expect(selfRow?.textContent).toContain("você");
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /desativar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /ativar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /excluir/i }),
    ).not.toBeInTheDocument();
  });

  it("never persists employee tokens to storage", async () => {
    vi.mocked(employeesApi.getEmployees).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeEmployee()],
    });

    const store = makeStore();
    renderPage(store);
    await screen.findByRole("table");

    const storageKeys = [
      ...Object.keys(window.localStorage),
      ...Object.keys(window.sessionStorage),
    ];
    expect(storageKeys).toEqual([]);
    expect(store.getState()).not.toHaveProperty("employees");
  });
});