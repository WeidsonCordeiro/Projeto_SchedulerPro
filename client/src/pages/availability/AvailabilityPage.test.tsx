import { fireEvent, render, screen, within } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AvailabilityPage from "./AvailabilityPage";
import availabilityApi from "../../api/endpoints/availability.api";
import employeesApi from "../../api/endpoints/employees.api";
import authReducer from "../../store/slices/authSlice";
import { httpError } from "../../test/http";
import { user } from "../../test/fixtures";
import type { Availability } from "../../types/availability";
import type { Employee } from "../../types/employee";
import type { Role } from "../../types/auth";

vi.mock("../../api/endpoints/availability.api", () => ({
  default: {
    getAvailabilities: vi.fn(),
    getEmployeeAvailabilities: vi.fn(),
    getAvailability: vi.fn(),
    createAvailability: vi.fn(),
    updateAvailability: vi.fn(),
    deleteAvailability: vi.fn(),
  },
}));

vi.mock("../../api/endpoints/employees.api", () => ({
  default: {
    getEmployees: vi.fn(),
  },
}));

function makeAvailability(
  overrides: Partial<Availability> = {},
): Availability {
  return {
    id: "abc123",
    companyId: user.companyId,
    employeeId: user.id,
    dayOfWeek: 1,
    morningStart: "09:00",
    morningEnd: "12:00",
    afternoonStart: null,
    afternoonEnd: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "abc999",
    companyId: user.companyId,
    name: "Bruno Lima",
    email: "bruno@example.com",
    role: "MANAGER",
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
      <AvailabilityPage />
    </Provider>,
  );
}

function mockEmployees(list: Employee[]) {
  vi.mocked(employeesApi.getEmployees).mockResolvedValue({
    success: true,
    message: "ok",
    data: list,
  });
}

function mockAvailability(list: Availability[]) {
  vi.mocked(availabilityApi.getEmployeeAvailabilities).mockResolvedValue({
    success: true,
    message: "ok",
    data: list,
  });
}

describe("AvailabilityPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmployees([]);
  });

  it("shows a loading spinner while availability loads", () => {
    vi.mocked(availabilityApi.getEmployeeAvailabilities).mockReturnValue(
      new Promise(() => {}),
    );

    renderPage();

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders the employee selector and one card per day for OWNER", async () => {
    mockEmployees([makeEmployee({ id: user.id, name: "Owner Teste", role: "OWNER" })]);
    mockAvailability([]);

    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Disponibilidade" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Funcionário")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Domingo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Segunda-feira" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Sábado" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("switch")).toHaveLength(7);
    expect(availabilityApi.getEmployeeAvailabilities).toHaveBeenCalledWith(
      user.id,
    );
  });

  it("shows a friendly error and retries when loading availability fails", async () => {
    mockEmployees([]);
    vi.mocked(availabilityApi.getEmployeeAvailabilities)
      .mockRejectedValueOnce(
        httpError(500, { message: "Erro interno do servidor." }),
      )
      .mockResolvedValueOnce({
        success: true,
        message: "ok",
        data: [],
      });

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );

    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));

    expect(
      await screen.findByRole("heading", { name: "Domingo" }),
    ).toBeInTheDocument();
    expect(
      availabilityApi.getEmployeeAvailabilities,
    ).toHaveBeenCalledTimes(2);
  });

  it("shows the info banner and never lists users for MANAGER", async () => {
    mockAvailability([makeAvailability()]);

    renderPage(makeStore("MANAGER"));

    expect(
      await screen.findByText("Você está visualizando sua própria disponibilidade."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Funcionário")).not.toBeInTheDocument();
    expect(employeesApi.getEmployees).not.toHaveBeenCalled();
  });

  it("gives MANAGER read/update for existing days but no create or delete", async () => {
    mockAvailability([makeAvailability()]);

    renderPage(makeStore("MANAGER"));

    await screen.findByRole("heading", { name: "Segunda-feira" });

    const existingMorningStart = document.getElementById(
      "availability-morning-start-1",
    );
    expect(existingMorningStart).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Salvar Segunda-feira" }),
    ).toBeEnabled();

expect(
      screen.queryByRole("button", { name: "Salvar Terça-feira" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Apenas perfis com permissão de criação podem adicionar dias.",
      ),
    ).toHaveLength(6);

    const switches = screen.getAllByRole("switch");
    expect(switches[1]).toBeDisabled();
  });

  it("gives EMPLOYEE read-only access to existing and empty days", async () => {
    mockAvailability([makeAvailability()]);

    renderPage(makeStore("EMPLOYEE"));

    await screen.findByRole("heading", { name: "Segunda-feira" });

    expect(document.getElementById("availability-morning-start-1")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /salvar/i }),
    ).not.toBeInTheDocument();
    expect(employeesApi.getEmployees).not.toHaveBeenCalled();
  });

  it("gives ADMIN create/edit but no delete (switches stay locked)", async () => {
    mockEmployees([]);
    mockAvailability([makeAvailability()]);

    renderPage(makeStore("ADMIN"));

    await screen.findByRole("heading", { name: "Segunda-feira" });

    const morningStart = document.getElementById("availability-morning-start-1");
    expect(morningStart).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Salvar Segunda-feira" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Salvar Terça-feira" }),
    ).toBeInTheDocument();

    const switches = screen.getAllByRole("switch");
    expect(switches[1]).toBeDisabled();
  });

  it("lets OWNER create a new availability day", async () => {
    mockEmployees([]);
    mockAvailability([]);
    const created = makeAvailability({ dayOfWeek: 2, id: "new" });
    vi.mocked(availabilityApi.createAvailability).mockResolvedValue({
      success: true,
      message: "Disponibilidade do funcionário criada com sucesso.",
      data: created,
    });

    renderPage();

    await screen.findByRole("heading", { name: "Terça-feira" });

    fireEvent.change(document.getElementById("availability-morning-start-2")!, {
      target: { value: "09:00" },
    });
    fireEvent.change(document.getElementById("availability-morning-end-2")!, {
      target: { value: "12:00" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Salvar Terça-feira" }),
    );

    expect(
      await screen.findByText(
        "Disponibilidade do funcionário criada com sucesso.",
      ),
    ).toBeInTheDocument();
    expect(availabilityApi.createAvailability).toHaveBeenCalledWith({
      employeeId: user.id,
      dayOfWeek: 2,
      morningStart: "09:00",
      morningEnd: "12:00",
      afternoonStart: null,
      afternoonEnd: null,
    });
  });

  it("keeps local HH:mm strings untouched and updates an existing day", async () => {
    mockEmployees([]);
    mockAvailability([makeAvailability()]);
    vi.mocked(availabilityApi.updateAvailability).mockResolvedValue({
      success: true,
      message: "Disponibilidade do funcionário atualizada com sucesso.",
      data: makeAvailability({ morningStart: "08:00" }),
    });

    renderPage();

    await screen.findByRole("heading", { name: "Segunda-feira" });

    expect(document.getElementById("availability-morning-start-1")).toHaveValue(
      "09:00",
    );
    expect(document.getElementById("availability-morning-end-1")).toHaveValue(
      "12:00",
    );

    fireEvent.change(document.getElementById("availability-morning-start-1")!, {
      target: { value: "08:00" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Salvar Segunda-feira" }),
    );

    expect(
      await screen.findByText(
        "Disponibilidade do funcionário atualizada com sucesso.",
      ),
    ).toBeInTheDocument();
    expect(availabilityApi.updateAvailability).toHaveBeenCalledWith("abc123", {
      morningStart: "08:00",
      morningEnd: "12:00",
      afternoonStart: null,
      afternoonEnd: null,
    });
  });

  it("rejects an incomplete period before calling the API", async () => {
    mockEmployees([]);
    mockAvailability([]);

    renderPage();

    await screen.findByRole("heading", { name: "Terça-feira" });

    fireEvent.change(document.getElementById("availability-morning-start-2")!, {
      target: { value: "09:00" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Salvar Terça-feira" }),
    );

    expect(
      await screen.findByText("Informe o horário inicial e final da manhã."),
    ).toBeInTheDocument();
    expect(availabilityApi.createAvailability).not.toHaveBeenCalled();
  });

  it("shows a friendly error when saving fails", async () => {
    mockEmployees([]);
    mockAvailability([]);
    vi.mocked(availabilityApi.createAvailability).mockRejectedValue(
      httpError(409, { message: "Já existe uma disponibilidade cadastrada para este funcionário neste dia." }),
    );

    renderPage();

    await screen.findByRole("heading", { name: "Terça-feira" });

    fireEvent.change(document.getElementById("availability-morning-start-2")!, {
      target: { value: "09:00" },
    });
    fireEvent.change(document.getElementById("availability-morning-end-2")!, {
      target: { value: "12:00" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Salvar Terça-feira" }),
    );

    expect(
      await screen.findByText(
        "Já existe uma disponibilidade cadastrada para este funcionário neste dia.",
      ),
    ).toBeInTheDocument();
  });

  it("removes an existing day after OWNER confirms the modal", async () => {
    mockEmployees([]);
    mockAvailability([makeAvailability()]);
    vi.mocked(availabilityApi.deleteAvailability).mockResolvedValue({
      success: true,
      message: "Disponibilidade do funcionário removida com sucesso.",
      data: null,
    });

    renderPage();

    await screen.findByRole("heading", { name: "Segunda-feira" });

    fireEvent.click(screen.getAllByRole("switch")[1]);

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(
        "Tem certeza que deseja excluir esta disponibilidade?",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Segunda-feira")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(
      await screen.findByText(
        "Disponibilidade do funcionário removida com sucesso.",
      ),
    ).toBeInTheDocument();
    expect(availabilityApi.deleteAvailability).toHaveBeenCalledWith("abc123");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getAllByText("Sem disponibilidade")).toHaveLength(7);
  });

  it("does not delete when the confirmation is cancelled", async () => {
    mockEmployees([]);
    mockAvailability([makeAvailability()]);

    renderPage();

    await screen.findByRole("heading", { name: "Segunda-feira" });

    fireEvent.click(screen.getAllByRole("switch")[1]);
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /cancelar/i,
      }),
    );

    expect(availabilityApi.deleteAvailability).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows delete errors inside the confirmation dialog", async () => {
    mockEmployees([]);
    mockAvailability([makeAvailability()]);
    vi.mocked(availabilityApi.deleteAvailability).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    renderPage();

    await screen.findByRole("heading", { name: "Segunda-feira" });

    fireEvent.click(screen.getAllByRole("switch")[1]);
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Excluir",
      }),
    );

    expect(
      await within(screen.getByRole("dialog")).findByRole("alert"),
    ).toHaveTextContent("Erro interno do servidor.");
  });

  it("reloads availability when the selected employee changes", async () => {
    mockEmployees([
      makeEmployee({ id: user.id, name: "Owner Teste", role: "OWNER" }),
      makeEmployee({ id: "abc999", name: "Bruno Lima" }),
    ]);
    mockAvailability([]);

    renderPage();

    const select = await screen.findByLabelText("Funcionário");
    fireEvent.change(select, { target: { value: "abc999" } });

    await screen.findAllByRole("switch");
    expect(screen.getAllByRole("switch")).toHaveLength(7);

    expect(availabilityApi.getEmployeeAvailabilities).toHaveBeenLastCalledWith(
      "abc999",
    );
  });

  it("falls back to self-only when listing employees fails", async () => {
    vi.mocked(employeesApi.getEmployees).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );
    mockAvailability([]);

    renderPage();

    expect(
      await screen.findByText(/Lista de funcionários indisponível/),
    ).toBeInTheDocument();
    expect(
      availabilityApi.getEmployeeAvailabilities,
    ).toHaveBeenCalledWith(user.id);
    expect(
      await screen.findByRole("heading", { name: "Domingo" }),
    ).toBeInTheDocument();
  });

  it("shows a permission warning and never fetches for CLIENT", () => {
    mockAvailability([]);

    renderPage(makeStore("CLIENT"));

    expect(
      screen.getByText("Você não tem permissão para acessar esta página."),
    ).toBeInTheDocument();
    expect(
      availabilityApi.getEmployeeAvailabilities,
    ).not.toHaveBeenCalled();
    expect(employeesApi.getEmployees).not.toHaveBeenCalled();
  });

  it("never persists availability data to storage", async () => {
    mockEmployees([]);
    mockAvailability([]);

    renderPage();
    await screen.findByRole("heading", { name: "Domingo" });

    const storageKeys = [
      ...Object.keys(window.localStorage),
      ...Object.keys(window.sessionStorage),
    ];
    expect(storageKeys).toEqual([]);
  });
});