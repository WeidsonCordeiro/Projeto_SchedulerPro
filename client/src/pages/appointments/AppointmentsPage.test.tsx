import { fireEvent, render, screen, within } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppointmentsPage from "./AppointmentsPage";
import appointmentsApi from "../../api/endpoints/appointments.api";
import clientsApi from "../../api/endpoints/clients.api";
import servicesApi from "../../api/endpoints/services.api";
import employeesApi from "../../api/endpoints/employees.api";
import authReducer from "../../store/slices/authSlice";
import { httpError } from "../../test/http";
import { user } from "../../test/fixtures";
import type { Appointment } from "../../types/appointment";
import type { Client } from "../../types/client";
import type { Service } from "../../types/service";
import type { Employee } from "../../types/employee";
import type { Role } from "../../types/auth";

vi.mock("../../api/endpoints/appointments.api", () => ({
  default: {
    getAppointments: vi.fn(),
    getAppointment: vi.fn(),
    createAppointment: vi.fn(),
    updateAppointment: vi.fn(),
    confirmAppointment: vi.fn(),
    completeAppointment: vi.fn(),
    cancelAppointment: vi.fn(),
    markAppointmentAsNoShow: vi.fn(),
    deleteAppointment: vi.fn(),
  },
}));

vi.mock("../../api/endpoints/clients.api", () => ({
  default: {
    getClients: vi.fn(),
  },
}));

vi.mock("../../api/endpoints/services.api", () => ({
  default: {
    getServices: vi.fn(),
  },
}));

vi.mock("../../api/endpoints/employees.api", () => ({
  default: {
    getEmployees: vi.fn(),
  },
}));

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "appt1",
    companyId: "company1",
    clientId: "client1",
    serviceId: "service1",
    employeeId: "employee1",
    startAt: "2026-07-15T09:00:00.000Z",
    endAt: "2026-07-15T09:30:00.000Z",
    status: "scheduled",
    notes: null,
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...overrides,
  };
}

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "client1",
    name: "Maria Silva",
    email: "maria@example.com",
    phone: "912345678",
    companyId: "company1",
    notes: null,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: "service1",
    companyId: "company1",
    name: "Corte de cabelo",
    description: null,
    duration: 30,
    price: 15,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "employee1",
    name: "Ana Lima",
    email: "ana@example.com",
    role: "EMPLOYEE",
    companyId: "company1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeStore(role: Role | null = "OWNER") {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: role ? { ...user, role } : null,
        mustChangePassword: false,
        isAuthenticated: Boolean(role),
        isInitializing: false,
        isLoading: false,
      },
    },
  });
}

function renderPage(role: Role | null = "OWNER") {
  return render(
    <Provider store={makeStore(role)}>
      <AppointmentsPage />
    </Provider>,
  );
}

function mockRelatedData() {
  vi.mocked(clientsApi.getClients).mockResolvedValue({
    success: true,
    message: "ok",
    data: [makeClient()],
  });
  vi.mocked(servicesApi.getServices).mockResolvedValue({
    success: true,
    message: "ok",
    data: [makeService()],
  });
  vi.mocked(employeesApi.getEmployees).mockResolvedValue({
    success: true,
    message: "ok",
    data: [makeEmployee()],
  });
}

describe("AppointmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRelatedData();
  });

  it("shows a loading spinner while the list loads", () => {
    vi.mocked(appointmentsApi.getAppointments).mockReturnValue(
      new Promise(() => {}),
    );
    renderPage();

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows a friendly error and a retry button when loading fails", async () => {
    vi.mocked(appointmentsApi.getAppointments)
      .mockRejectedValueOnce(
        httpError(500, { message: "Erro interno do servidor." }),
      )
      .mockResolvedValueOnce({
        success: true,
        message: "ok",
        data: [makeAppointment()],
      });

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );

    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(appointmentsApi.getAppointments).toHaveBeenCalledTimes(2);
  });

  it("keeps the table visible when related name lists fail to load", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment()],
    });
    vi.mocked(employeesApi.getEmployees).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    renderPage();

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar alguns nomes.",
    );
    expect(
      within(screen.getByRole("table")).getAllByText("—").length,
    ).toBeGreaterThan(0);
  });

  it("shows the empty state with a create button for OWNER", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });

    renderPage();

    expect(await screen.findByText("Nenhum agendamento encontrado.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cadastrar primeiro agendamento/i }),
    ).toBeInTheDocument();
  });

  it("shows the empty state without create actions for CLIENT", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });

    renderPage("CLIENT");

    expect(await screen.findByText("Nenhum agendamento encontrado.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /cadastrar primeiro agendamento/i }),
    ).not.toBeInTheDocument();
  });

  it("renders appointments with resolved names, local date/time and status", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment({ notes: "Primeira visita" })],
    });

    renderPage();

    const table = await screen.findByRole("table");
    expect(within(table).getByText("15/07/2026")).toBeInTheDocument();
    expect(within(table).getByText("10:00")).toBeInTheDocument();
    expect(within(table).getByText("até 10:30")).toBeInTheDocument();
    expect(within(table).getByText("Maria Silva")).toBeInTheDocument();
    expect(within(table).getByText("Corte de cabelo")).toBeInTheDocument();
    expect(within(table).getByText("Ana Lima")).toBeInTheDocument();
    expect(within(table).getByText("Primeira visita")).toBeInTheDocument();
    expect(screen.getByText("Agendado")).toBeInTheDocument();
  });

  it("creates an appointment through the form and reloads the list", async () => {
    const created = makeAppointment({ id: "appt99" });
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment()],
    });
    vi.mocked(appointmentsApi.createAppointment).mockResolvedValue({
      success: true,
      message: "Agendamento criado com sucesso.",
      data: created,
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /novo agendamento/i }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Cliente"), {
      target: { value: "client1" },
    });
    fireEvent.change(within(dialog).getByLabelText("Serviço"), {
      target: { value: "service1" },
    });
    fireEvent.change(within(dialog).getByLabelText("Funcionário"), {
      target: { value: "employee1" },
    });
    fireEvent.change(within(dialog).getByLabelText("Data e hora"), {
      target: { value: "2026-07-15T10:00" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /criar agendamento/i }),
    );

    expect(
      await screen.findByText("Agendamento criado com sucesso."),
    ).toBeInTheDocument();
    expect(appointmentsApi.createAppointment).toHaveBeenCalledWith({
      clientId: "client1",
      serviceId: "service1",
      employeeId: "employee1",
      startAt: "2026-07-15T09:00:00.000Z",
    });
    expect(appointmentsApi.getAppointments).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the 409 conflict visible in the form and fails without success", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment()],
    });
    vi.mocked(appointmentsApi.createAppointment).mockRejectedValue(
      httpError(409, {
        message: "O cliente já possui um agendamento neste horário.",
      }),
    );

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /novo agendamento/i }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Cliente"), {
      target: { value: "client1" },
    });
    fireEvent.change(within(dialog).getByLabelText("Serviço"), {
      target: { value: "service1" },
    });
    fireEvent.change(within(dialog).getByLabelText("Funcionário"), {
      target: { value: "employee1" },
    });
    fireEvent.change(within(dialog).getByLabelText("Data e hora"), {
      target: { value: "2026-07-15T10:00" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /criar agendamento/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O cliente já possui um agendamento neste horário.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      within(screen.getByRole("dialog")).getByLabelText("Data e hora"),
    ).toHaveValue("2026-07-15T10:00");
    expect(screen.queryByText("Agendado criado com sucesso.")).not.toBeInTheDocument();
  });

  it("edits an appointment with the pre-filled form", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment()],
    });
    vi.mocked(appointmentsApi.updateAppointment).mockResolvedValue({
      success: true,
      message: "Agendamento atualizado com sucesso.",
      data: makeAppointment({ serviceId: "service2" }),
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Data e hora")).toHaveValue(
      "2026-07-15T10:00",
    );

    fireEvent.change(within(dialog).getByLabelText("Funcionário"), {
      target: { value: "employee1" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /salvar/i }));

    expect(
      await screen.findByText("Agendamento atualizado com sucesso."),
    ).toBeInTheDocument();
    expect(appointmentsApi.updateAppointment).toHaveBeenCalledWith("appt1", {
      clientId: "client1",
      serviceId: "service1",
      employeeId: "employee1",
      startAt: "2026-07-15T09:00:00.000Z",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deletes an appointment after confirmation", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment(), makeAppointment({ id: "appt2" })],
    });
    vi.mocked(appointmentsApi.deleteAppointment).mockResolvedValue({
      success: true,
      message: "Agendamento removido com sucesso.",
      data: null,
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getAllByRole("button", { name: /excluir/i })[0]);

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(
      await screen.findByText("Agendamento removido com sucesso."),
    ).toBeInTheDocument();
    expect(appointmentsApi.deleteAppointment).toHaveBeenCalledWith("appt1");
  });

  it("does not delete when the user cancels the confirmation", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment()],
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /excluir/i }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /cancelar/i }),
    );

    expect(appointmentsApi.deleteAppointment).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lets an OWNER confirm, complete, cancel and mark no-show", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [
        makeAppointment({ id: "scheduled", status: "scheduled" }),
        makeAppointment({ id: "confirmed", status: "confirmed" }),
      ],
    });
    vi.mocked(appointmentsApi.confirmAppointment).mockResolvedValue({
      success: true,
      message: "Agendamento confirmado com sucesso.",
      data: makeAppointment({ id: "scheduled", status: "confirmed" }),
    });
    vi.mocked(appointmentsApi.completeAppointment).mockResolvedValue({
      success: true,
      message: "Agendamento concluído com sucesso.",
      data: makeAppointment({ id: "confirmed", status: "completed" }),
    });

    renderPage();
    const table = await screen.findByRole("table");

    fireEvent.click(within(table).getByRole("button", { name: /confirmar/i }));
    expect(
      await screen.findByText("Agendamento confirmado com sucesso."),
    ).toBeInTheDocument();
    expect(appointmentsApi.confirmAppointment).toHaveBeenCalledWith("scheduled");

    fireEvent.click(within(table).getByRole("button", { name: /concluir/i }));
    expect(
      await screen.findByText("Agendamento concluído com sucesso."),
    ).toBeInTheDocument();
    expect(appointmentsApi.completeAppointment).toHaveBeenCalledWith("confirmed");

    fireEvent.click(screen.getAllByRole("button", { name: /cancelar/i })[0]);
    expect(appointmentsApi.cancelAppointment).toHaveBeenCalledWith("scheduled");

    fireEvent.click(screen.getByRole("button", { name: "Não compareceu" }));
    expect(appointmentsApi.markAppointmentAsNoShow).toHaveBeenCalledWith(
      "confirmed",
    );
  });

  it("does not offer status actions for terminal statuses", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [
        makeAppointment({ id: "done", status: "completed" }),
        makeAppointment({ id: "gone", status: "no-show" }),
        makeAppointment({ id: "cancelled", status: "cancelled" }),
      ],
    });

    renderPage();
    await screen.findByRole("table");

    expect(screen.queryByRole("button", { name: /confirmar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /concluir/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancelar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /não compareceu/i })).not.toBeInTheDocument();
  });

  it("shows a friendly error when the backend rejects a status transition", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment({ id: "scheduled", status: "scheduled" })],
    });
    vi.mocked(appointmentsApi.confirmAppointment).mockRejectedValue(
      httpError(400, {
        message: "Não é possível alterar o status deste agendamento.",
      }),
    );

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não é possível alterar o status deste agendamento.",
    );
  });

  it("shows permission warning for an unauthenticated user", async () => {
    renderPage(null);

    expect(
      screen.getByText("Você não tem permissão para acessar esta página."),
    ).toBeInTheDocument();
  });

  it("hides create and delete but keeps read/status for EMPLOYEE", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment()],
    });

    renderPage("EMPLOYEE");

    const table = await screen.findByRole("table");
    expect(screen.queryByRole("button", { name: /novo agendamento/i })).not.toBeInTheDocument();
    expect(within(table).getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: /confirmar/i })).toBeInTheDocument();
    expect(within(table).queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument();
  });

  it("shows create/edit/status but hides delete for ADMIN and MANAGER", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment()],
    });

    const { unmount } = renderPage("ADMIN");
    const adminTable = await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /novo agendamento/i })).toBeInTheDocument();
    expect(within(adminTable).getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(within(adminTable).queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument();
    unmount();

    renderPage("MANAGER");
    const managerTable = await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /novo agendamento/i })).toBeInTheDocument();
    expect(within(managerTable).getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(within(managerTable).queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument();
  });

  it("shows create/edit/status/delete for OWNER", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment()],
    });

    renderPage();

    const table = await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /novo agendamento/i })).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: /excluir/i })).toBeInTheDocument();
  });

  it("keeps the table read-only for CLIENT without fetching related names", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment()],
    });

    renderPage("CLIENT");

    const table = await screen.findByRole("table");
    expect(within(table).getAllByText("—").length).toBeGreaterThan(0);
    expect(within(table).queryByRole("button")).not.toBeInTheDocument();
    expect(clientsApi.getClients).not.toHaveBeenCalled();
    expect(servicesApi.getServices).not.toHaveBeenCalled();
    expect(employeesApi.getEmployees).not.toHaveBeenCalled();
  });

  it("does not fetch employees for roles without USER_READ", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment()],
    });

    renderPage("EMPLOYEE");

    await screen.findByRole("table");
    expect(clientsApi.getClients).toHaveBeenCalled();
    expect(servicesApi.getServices).toHaveBeenCalled();
    expect(employeesApi.getEmployees).not.toHaveBeenCalled();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("never persists appointment tokens or state to storage", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment()],
    });

    const store = makeStore();
    render(<Provider store={store}><AppointmentsPage /></Provider>);
    await screen.findByRole("table");

    const storageKeys = [
      ...Object.keys(window.localStorage),
      ...Object.keys(window.sessionStorage),
    ];
    expect(storageKeys).toEqual([]);
    expect(store.getState()).not.toHaveProperty("appointments");
  });
});