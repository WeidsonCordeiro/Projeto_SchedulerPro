import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppointmentsPage from "./AppointmentsPage";
import appointmentsApi from "../../api/endpoints/appointments.api";
import availabilityApi from "../../api/endpoints/availability.api";
import availabilityExceptionsApi from "../../api/endpoints/availabilityExceptions.api";
import clientsApi from "../../api/endpoints/clients.api";
import servicesApi from "../../api/endpoints/services.api";
import employeesApi from "../../api/endpoints/employees.api";
import authReducer from "../../store/slices/authSlice";
import companyReducer from "../../store/slices/companySlice";
import { httpError } from "../../test/http";
import { user } from "../../test/fixtures";
import type { ApiResponse } from "../../types/api";
import type { Appointment } from "../../types/appointment";
import type { Client } from "../../types/client";
import type { Service } from "../../types/service";
import type { Employee } from "../../types/employee";
import type { Availability } from "../../types/availability";
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

vi.mock("../../api/endpoints/availability.api", () => ({
  default: {
    getEmployeeAvailabilities: vi.fn(),
  },
}));

vi.mock("../../api/endpoints/availabilityExceptions.api", () => ({
  default: {
    getAvailabilityExceptions: vi.fn(),
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
    startAt: "2026-09-15T09:00:00.000Z",
    endAt: "2026-09-15T09:30:00.000Z",
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

function makeStore(role: Role | null = "OWNER", timezone?: string) {
  return configureStore({
    reducer: { auth: authReducer, company: companyReducer },
    preloadedState: {
      auth: {
        user: role ? { ...user, role } : null,
        mustChangePassword: false,
        isAuthenticated: Boolean(role),
        isInitializing: false,
        isLoading: false,
      },
      company: timezone
        ? {
            company: {
              id: "company1",
              name: "salao do centro",
              timezone,
              isActive: true,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          }
        : { company: null },
    },
  });
}

function renderPage(role: Role | null = "OWNER", timezone?: string) {
  return render(
    <Provider store={makeStore(role, timezone)}>
      <AppointmentsPage />
    </Provider>,
  );
}

/**
 * Muda para a visualização de Lista para que a tabela seja exibida.
 */
async function switchToListView() {
  const listButton = screen.getByRole("button", { name: "Lista" });
  fireEvent.click(listButton);
}

/**
 * Renderiza a página e alterna para a visualização de Lista (tabela).
 * Útil para manter compatibilidade com testes existentes que esperam a tabela.
 */
async function renderPageList(role: Role | null = "OWNER", timezone?: string) {
  renderPage(role, timezone);
  await switchToListView();
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

function makeAvailability(dayOfWeek: number): Availability {
  return {
    id: `av-${dayOfWeek}`,
    companyId: "company1",
    employeeId: "employee1",
    dayOfWeek: dayOfWeek as Availability["dayOfWeek"],
    morningStart: "09:00",
    morningEnd: "12:00",
    afternoonStart: "14:00",
    afternoonEnd: "18:00",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const weekAvailability = [0, 1, 2, 3, 4, 5, 6].map(makeAvailability);

describe("AppointmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRelatedData();
    vi.mocked(availabilityApi.getEmployeeAvailabilities).mockResolvedValue({
      success: true,
      message: "ok",
      data: weekAvailability,
    } satisfies ApiResponse<Availability[]>);
    vi.mocked(availabilityExceptionsApi.getAvailabilityExceptions).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });
    // Fixa o relógio para tornar o mês exibido pelo calendário determinístico.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
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
      .mockResolvedValue({
        success: true,
        message: "ok",
        data: [makeAppointment()],
      });

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );

    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));

    await switchToListView();
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(appointmentsApi.getAppointments).toHaveBeenCalledTimes(3);
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

    await renderPageList();

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar alguns nomes.",
    );
    expect(
      within(screen.getByRole("table")).getAllByText("—").length,
    ).toBeGreaterThan(0);
  });

  it("keeps the table visible when client and service name lists fail to load", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment()],
    });
    vi.mocked(clientsApi.getClients).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );
    vi.mocked(servicesApi.getServices).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    await renderPageList();

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

    await renderPageList();

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

    await renderPageList("CLIENT");

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

    await renderPageList();

    const table = await screen.findByRole("table");
    expect(within(table).getByText("15/09/2026")).toBeInTheDocument();
    expect(within(table).getByText("10:00")).toBeInTheDocument();
    expect(within(table).getByText("até 10:30")).toBeInTheDocument();
    expect(within(table).getByText("Maria Silva")).toBeInTheDocument();
    expect(within(table).getByText("Corte de cabelo")).toBeInTheDocument();
    expect(within(table).getByText("Ana Lima")).toBeInTheDocument();
    expect(within(table).getByText("Primeira visita")).toBeInTheDocument();
    expect(screen.getByText("Agendado")).toBeInTheDocument();
  });

  it("renders appointment times in the company timezone from the session", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment()],
    });

    await renderPageList("OWNER", "America/Sao_Paulo");

    const table = await screen.findByRole("table");
    expect(within(table).getByText("15/09/2026")).toBeInTheDocument();
    expect(within(table).getByText("06:00")).toBeInTheDocument();
    expect(within(table).getByText("até 06:30")).toBeInTheDocument();
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

    await renderPageList();
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
    await screen.findByRole("button", { name: "2026-09-15" });
    fireEvent.click(within(dialog).getByRole("button", { name: "2026-09-15" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "11:00" }));
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
      startAt: "2026-09-15T10:00:00.000Z",
    });
    expect(appointmentsApi.getAppointments).toHaveBeenCalledTimes(3);
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

    await renderPageList();
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
    await screen.findByRole("button", { name: "2026-09-15" });
    fireEvent.click(within(dialog).getByRole("button", { name: "2026-09-15" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "11:00" }));
    fireEvent.click(
      within(dialog).getByRole("button", { name: /criar agendamento/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O cliente já possui um agendamento neste horário.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      within(screen.getByRole("dialog")).getByRole("button", { name: "2026-09-15" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(screen.getByRole("dialog")).getByRole("button", { name: "11:00" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Agendamento criado com sucesso.")).not.toBeInTheDocument();
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

    await renderPageList();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));

    const dialog = screen.getByRole("dialog");
    // O calendário abre no mês do agendamento (Setembro/2026) com o dia/horário
    // atuais já selecionados.
    await screen.findByRole("button", { name: "2026-09-15" });
    expect(within(dialog).getByRole("button", { name: "2026-09-15" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(dialog).getByRole("button", { name: "10:00" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(within(dialog).getByRole("button", { name: /salvar/i }));

    expect(
      await screen.findByText("Agendamento atualizado com sucesso."),
    ).toBeInTheDocument();
    expect(appointmentsApi.updateAppointment).toHaveBeenCalledWith("appt1", {
      clientId: "client1",
      serviceId: "service1",
      employeeId: "employee1",
      startAt: "2026-09-15T09:00:00.000Z",
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

    await renderPageList();
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

    await renderPageList();
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

    await renderPageList();
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

    await renderPageList();
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

    await renderPageList();
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

    await renderPageList("EMPLOYEE");

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
    await switchToListView();
    const adminTable = await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /novo agendamento/i })).toBeInTheDocument();
    expect(within(adminTable).getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(within(adminTable).queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument();
    unmount();

    renderPage("MANAGER");
    await switchToListView();
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

    await renderPageList();

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

    await renderPageList("CLIENT");

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

    await renderPageList("EMPLOYEE");

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
    await switchToListView();
    await screen.findByRole("table");

    const storageKeys = [
      ...Object.keys(window.localStorage),
      ...Object.keys(window.sessionStorage),
    ];
    expect(storageKeys).toEqual([]);
    expect(store.getState()).not.toHaveProperty("appointments");
  });

  it("renders the month calendar by default with a period fetch", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment({ startAt: "2026-09-10T09:00:00.000Z", endAt: "2026-09-10T09:30:00.000Z" })],
    });

    renderPage();

    // A chamada inicial usa o range do grid mensal (UTC).
    await waitFor(() =>
      expect(appointmentsApi.getAppointments).toHaveBeenCalledWith({
        startAt: expect.any(String),
        endAt: expect.any(String),
      }),
    );

    // Grade mensal visível por padrão.
    expect(screen.getByText("Seg")).toBeInTheDocument();
    expect(screen.getByTitle(/Maria Silva/)).toBeInTheDocument();
  });

  it("filters the backend fetch by the visible week/day", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment({ startAt: "2026-09-10T09:00:00.000Z", endAt: "2026-09-10T09:30:00.000Z" })],
    });

    renderPage();
    await screen.findByTitle(/Maria Silva/);

    fireEvent.click(screen.getByRole("button", { name: "Semana" }));
    await waitFor(() => expect(appointmentsApi.getAppointments).toHaveBeenCalledTimes(2));
    const weekCall = vi.mocked(appointmentsApi.getAppointments).mock.calls[1][0];
    expect(weekCall).toMatchObject({ startAt: expect.any(String), endAt: expect.any(String) });

    fireEvent.click(screen.getByRole("button", { name: "Dia" }));
    await waitFor(() => expect(appointmentsApi.getAppointments).toHaveBeenCalledTimes(3));
    const dayCall = vi.mocked(appointmentsApi.getAppointments).mock.calls[2][0];
    expect(dayCall).toMatchObject({ startAt: expect.any(String), endAt: expect.any(String) });
  });

  it("opens the create form prefilled when clicking a month day", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });

    renderPage();

    // Célula de um dia futuro (15/09/2026) → abre o formulário de criação.
    const futureDay = await screen.findByRole("button", { name: "15" });
    fireEvent.click(futureDay);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Novo agendamento" })).toBeInTheDocument();
  });

  it("opens the create form prefilled when clicking a week time slot", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment({ startAt: "2026-09-10T09:00:00.000Z", endAt: "2026-09-10T09:30:00.000Z" })],
    });

    renderPage();
    await screen.findByTitle(/Maria Silva/);
    fireEvent.click(screen.getByRole("button", { name: "Semana" }));
    await screen.findByRole("heading", { name: /07\/09/ });

    // Célula de hora vazia e futura → abre o formulário de criação.
    const futureSlots = document.querySelectorAll(
      '.week-slot[role="button"]:not([aria-disabled="true"])',
    );
    expect(futureSlots.length).toBeGreaterThan(0);
    fireEvent.click(futureSlots[0]);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("returns to today via the toolbar", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeAppointment({ startAt: "2026-09-10T09:00:00.000Z", endAt: "2026-09-10T09:30:00.000Z" })],
    });

    renderPage();
    await screen.findByTitle(/Maria Silva/);

    // Navega para o mês seguinte depois volta para hoje.
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    await waitFor(() =>
      expect(appointmentsApi.getAppointments).toHaveBeenCalledTimes(2),
    );
    fireEvent.click(screen.getByRole("button", { name: "Hoje" }));
    await waitFor(() =>
      expect(appointmentsApi.getAppointments).toHaveBeenCalledTimes(3),
    );
  });
});