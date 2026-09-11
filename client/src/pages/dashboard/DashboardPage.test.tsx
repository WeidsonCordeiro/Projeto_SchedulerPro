import { render, screen, within } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./DashboardPage";
import appointmentsApi from "../../api/endpoints/appointments.api";
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
import type { Role } from "../../types/auth";

vi.mock("../../api/endpoints/appointments.api", () => ({
  default: { getAppointments: vi.fn() },
}));

vi.mock("../../api/endpoints/clients.api", () => ({
  default: { getClients: vi.fn() },
}));

vi.mock("../../api/endpoints/services.api", () => ({
  default: { getServices: vi.fn() },
}));

vi.mock("../../api/endpoints/employees.api", () => ({
  default: { getEmployees: vi.fn() },
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

function renderDashboard(role: Role | null = "OWNER", timezone?: string) {
  return render(
    <Provider store={makeStore(role, timezone)}>
      <DashboardPage />
    </Provider>,
  );
}

function mockData(appointments: Appointment[] = []) {
  vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
    success: true,
    message: "ok",
    data: appointments,
  });
  vi.mocked(clientsApi.getClients).mockResolvedValue({
    success: true,
    message: "ok",
    data: [makeClient()],
  } satisfies ApiResponse<Client[]>);
  vi.mocked(servicesApi.getServices).mockResolvedValue({
    success: true,
    message: "ok",
    data: [makeService()],
  } satisfies ApiResponse<Service[]>);
  vi.mocked(employeesApi.getEmployees).mockResolvedValue({
    success: true,
    message: "ok",
    data: [makeEmployee()],
  } satisfies ApiResponse<Employee[]>);
}

function cardValues(): string[] {
  return screen
    .getAllByTestId("card-value")
    .map((node) => node.textContent ?? "");
}

const NOW = "2026-09-10T12:00:00.000Z";

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a loading spinner while data loads", () => {
    vi.mocked(appointmentsApi.getAppointments).mockReturnValue(
      new Promise(() => {}),
    );
    renderDashboard();

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders greeting, summary cards and appointment tables with data", async () => {
    const today = makeAppointment({
      id: "appt-today",
      startAt: "2026-09-10T08:00:00.000Z",
      endAt: "2026-09-10T08:30:00.000Z",
      status: "scheduled",
    });
    const upcoming = makeAppointment({
      id: "appt-upcoming",
      startAt: "2026-09-15T10:00:00.000Z",
      endAt: "2026-09-15T10:30:00.000Z",
      status: "confirmed",
    });
    const past = makeAppointment({
      id: "appt-past",
      status: "scheduled",
    });
    mockData([today, upcoming, past]);

    renderDashboard();

    expect(
      await screen.findByRole("heading", { name: /bem-vindo ao schedulerpro/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/olá, owner teste/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Resumo" })).toBeInTheDocument();

    expect(cardValues()).toEqual(["1", "2", "1", "1", "1", "1"]);

    expect(
      screen.getByRole("heading", { name: "Agenda do dia" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Próximos agendamentos" }),
    ).toBeInTheDocument();

    const todayCard = screen.getByRole("heading", { name: "Agenda do dia" })
      .closest(".card") as HTMLElement;
    expect(within(todayCard).getAllByRole("row")).toHaveLength(2);
    expect(within(todayCard).getByText("09:00")).toBeInTheDocument();
    expect(within(todayCard).getByText("Maria Silva")).toBeInTheDocument();
    expect(within(todayCard).getByText("Corte de cabelo")).toBeInTheDocument();
    expect(within(todayCard).getByText("Ana Lima")).toBeInTheDocument();
    expect(within(todayCard).getByText("Agendado")).toBeInTheDocument();

    const upcomingCard = screen.getByRole("heading", {
      name: "Próximos agendamentos",
    }).closest(".card") as HTMLElement;
    expect(within(upcomingCard).getAllByRole("row")).toHaveLength(2);
    expect(within(upcomingCard).getByText("11:00")).toBeInTheDocument();
    expect(within(upcomingCard).getByText("Confirmado")).toBeInTheDocument();
  });

  it("shows empty state when there are no appointments", async () => {
    mockData([]);
    renderDashboard();

    expect(
      await screen.findByText("Nenhum agendamento para hoje."),
    ).toBeInTheDocument();
    expect(cardValues()).toEqual(["0", "0", "0", "1", "1", "1"]);
    expect(screen.getByText("Nenhum agendamento próximo.")).toBeInTheDocument();
  });

  it("shows a friendly error and does not load related when appointments fail", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockRejectedValueOnce(
      httpError(500, { message: "Erro interno do servidor." }),
    );
    renderDashboard();

    expect(
      await screen.findByText("Erro interno do servidor."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toBeInTheDocument();
    expect(clientsApi.getClients).not.toHaveBeenCalled();
    expect(servicesApi.getServices).not.toHaveBeenCalled();
    expect(employeesApi.getEmployees).not.toHaveBeenCalled();
  });

  it("still renders the dashboard and shows a warning when related data fails", async () => {
    vi.mocked(clientsApi.getClients).mockRejectedValueOnce(
      httpError(500, { message: "Erro interno do servidor." }),
    );
    mockData([
      makeAppointment({
        id: "appt-today",
        startAt: "2026-09-10T08:00:00.000Z",
        endAt: "2026-09-10T08:30:00.000Z",
      }),
    ]);
    renderDashboard();

    expect(
      await screen.findByText(/não foi possível carregar alguns nomes/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Resumo" })).toBeInTheDocument();
    expect(screen.queryByText("Maria Silva")).not.toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("does not fetch or show employees for MANAGER", async () => {
    mockData([makeAppointment()]);
    renderDashboard("MANAGER");

    expect(await screen.findByRole("heading", { name: "Resumo" })).toBeInTheDocument();
    expect(employeesApi.getEmployees).not.toHaveBeenCalled();
    expect(screen.queryByText("Funcionários")).not.toBeInTheDocument();
  });

  it("computes 'today' using the company timezone", async () => {
    const boundary = makeAppointment({
      id: "appt-boundary",
      startAt: "2026-09-10T01:30:00.000Z",
      endAt: "2026-09-10T02:00:00.000Z",
    });
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [boundary],
    });

    renderDashboard("OWNER", "America/Sao_Paulo");

    expect(
      await screen.findByText("Nenhum agendamento para hoje."),
    ).toBeInTheDocument();
    expect(screen.queryByText("22:30")).not.toBeInTheDocument();
  });

  it("classifies the same instant as today when the timezone differs", async () => {
    const boundary = makeAppointment({
      id: "appt-boundary",
      startAt: "2026-09-10T01:30:00.000Z",
      endAt: "2026-09-10T02:00:00.000Z",
    });
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [boundary],
    });

    renderDashboard("OWNER", "Europe/Lisbon");

    expect(
      await screen.findByText("02:30", { selector: ".text-nowrap" }),
    ).toBeInTheDocument();
  });
});