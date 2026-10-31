import { fireEvent, render, screen, within } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./DashboardPage";
import dashboardApi from "../../api/endpoints/dashboard.api";
import clientsApi from "../../api/endpoints/clients.api";
import servicesApi from "../../api/endpoints/services.api";
import employeesApi from "../../api/endpoints/employees.api";
import { buildReportRange } from "../../config/reportPeriod";
import authReducer from "../../store/slices/authSlice";
import companyReducer from "../../store/slices/companySlice";
import { httpError } from "../../test/http";
import { user } from "../../test/fixtures";
import type { ApiResponse } from "../../types/api";
import type { Appointment, AppointmentStatus } from "../../types/appointment";
import type { Client } from "../../types/client";
import type { Service } from "../../types/service";
import type { Employee } from "../../types/employee";
import type { Role } from "../../types/auth";
import type { DashboardSummary } from "../../types/dashboard";

vi.mock("../../api/endpoints/dashboard.api", () => ({
  default: { getSummary: vi.fn() },
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

function emptyByStatus(): Record<AppointmentStatus, number> {
  return {
    scheduled: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    "no-show": 0,
  };
}

function makeSummary(
  overrides: Partial<DashboardSummary> = {},
): DashboardSummary {
  const range = buildReportRange(
    "today",
    "Europe/Lisbon",
    undefined,
    undefined,
    new Date(NOW),
  )!;

  return {
    period: {
      startAt: range.startAt,
      endAt: range.endAt,
      total: 0,
      byStatus: emptyByStatus(),
    },
    todayAppointments: [],
    upcomingAppointments: [],
    activeClientsCount: 0,
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
    portalAccess: { exists: false, isActive: false },
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
    isActive: true,
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
    <Provider store={makeStore(role, timezone ?? "Europe/Lisbon")}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </Provider>,
  );
}

function mockSummaryResponse(summary: DashboardSummary) {
  vi.mocked(dashboardApi.getSummary).mockResolvedValue({
    success: true,
    message: "ok",
    data: summary,
  } satisfies ApiResponse<DashboardSummary>);
}

function mockRelatedData() {
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
    mockRelatedData();
    mockSummaryResponse(makeSummary());
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a loading spinner while data loads", () => {
    vi.mocked(dashboardApi.getSummary).mockReturnValue(new Promise(() => {}));
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

    mockSummaryResponse(
      makeSummary({
        todayAppointments: [today],
        upcomingAppointments: [upcoming],
        period: {
          ...makeSummary().period,
          total: 4,
          byStatus: {
            ...emptyByStatus(),
            scheduled: 2,
            confirmed: 1,
          },
        },
      }),
    );

    renderDashboard();

    expect(
      await screen.findByRole("heading", { name: /bem-vindo ao schedulerpro/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/olá, owner teste/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Resumo do dia" })).toBeInTheDocument();

    expect(cardValues()).toEqual(["1", "2", "1"]);

    const todayCard = screen.getByRole("heading", { name: "Agenda do dia" })
      .closest(".card") as HTMLElement;
    expect(within(todayCard).getAllByRole("row")).toHaveLength(2);
    expect(within(todayCard).getByText("09:00")).toBeInTheDocument();
  });

  it("displays today appointments in API order", async () => {
    mockSummaryResponse(
      makeSummary({
        todayAppointments: [
          makeAppointment({
            id: "a",
            startAt: "2026-09-10T08:00:00.000Z",
            endAt: "2026-09-10T08:30:00.000Z",
          }),
          makeAppointment({
            id: "b",
            startAt: "2026-09-10T10:00:00.000Z",
            endAt: "2026-09-10T10:30:00.000Z",
          }),
          makeAppointment({
            id: "c",
            startAt: "2026-09-10T15:00:00.000Z",
            endAt: "2026-09-10T15:30:00.000Z",
          }),
        ],
      }),
    );

    renderDashboard();
    await screen.findByRole("heading", { name: /bem-vindo ao schedulerpro/i });

    const card = screen
      .getByRole("heading", { name: "Agenda do dia" })
      .closest(".card") as HTMLElement;
    const times = within(card)
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.querySelectorAll("td")[1]?.textContent);

    expect(times).toEqual(["09:00", "11:00", "16:00"]);
  });

  it("shows upcoming appointments from the summary", async () => {
    mockSummaryResponse(
      makeSummary({
        upcomingAppointments: [
          makeAppointment({
            id: "near",
            startAt: "2026-09-11T10:00:00.000Z",
            endAt: "2026-09-11T10:30:00.000Z",
            status: "confirmed",
          }),
          makeAppointment({
            id: "mid",
            startAt: "2026-09-15T14:00:00.000Z",
            endAt: "2026-09-15T14:30:00.000Z",
            status: "confirmed",
          }),
        ],
      }),
    );

    renderDashboard();
    await screen.findByRole("heading", { name: /bem-vindo ao schedulerpro/i });

    const card = screen
      .getByRole("heading", { name: "Próximos agendamentos" })
      .closest(".card") as HTMLElement;
    expect(within(card).getAllByRole("row")).toHaveLength(3);
  });

  it("shows empty state when there are no appointments", async () => {
    mockSummaryResponse(makeSummary());
    renderDashboard();

    expect(
      await screen.findByText("Nenhum agendamento para hoje."),
    ).toBeInTheDocument();
    expect(cardValues()).toEqual(["0", "0", "0"]);
    expect(screen.getByText("Nenhum agendamento próximo.")).toBeInTheDocument();
  });

  it("shows a friendly error and does not load related when summary fails", async () => {
    vi.mocked(dashboardApi.getSummary).mockRejectedValueOnce(
      httpError(500, { message: "Erro interno do servidor." }),
    );
    renderDashboard();

    expect(
      await screen.findByText("Erro interno do servidor."),
    ).toBeInTheDocument();
    expect(clientsApi.getClients).not.toHaveBeenCalled();
  });

  it("retries the initial load without reloading the page", async () => {
    vi.mocked(dashboardApi.getSummary)
      .mockRejectedValueOnce(
        httpError(500, { message: "Erro interno do servidor." }),
      )
      .mockResolvedValueOnce({
        success: true,
        message: "ok",
        data: makeSummary(),
      });
    renderDashboard();

    expect(
      await screen.findByText("Erro interno do servidor."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(
      await screen.findByRole("heading", { name: "Resumo do dia" }),
    ).toBeInTheDocument();
    expect(dashboardApi.getSummary).toHaveBeenCalledTimes(2);
  });

  it("still renders the dashboard and shows a warning when related data fails", async () => {
    vi.mocked(clientsApi.getClients).mockRejectedValueOnce(
      httpError(500, { message: "Erro interno do servidor." }),
    );
    mockSummaryResponse(
      makeSummary({
        todayAppointments: [
          makeAppointment({
            id: "appt-today",
            startAt: "2026-09-10T08:00:00.000Z",
            endAt: "2026-09-10T08:30:00.000Z",
          }),
        ],
      }),
    );
    renderDashboard();

    expect(
      await screen.findByText(/não foi possível carregar alguns nomes/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Maria Silva")).not.toBeInTheDocument();
  });

  it("does not fetch or show employees for MANAGER", async () => {
    renderDashboard("MANAGER");

    expect(await screen.findByRole("heading", { name: "Resumo do dia" })).toBeInTheDocument();
    expect(employeesApi.getEmployees).not.toHaveBeenCalled();
  });

  it("requests summary with today range in company timezone", async () => {
    renderDashboard("OWNER", "America/Sao_Paulo");

    await screen.findByRole("heading", { name: "Resumo do dia" });

    const expected = buildReportRange(
      "today",
      "America/Sao_Paulo",
      undefined,
      undefined,
      new Date(NOW),
    );
    expect(dashboardApi.getSummary).toHaveBeenCalledWith({
      startAt: expected!.startAt,
      endAt: expected!.endAt,
      upcomingLimit: 5,
    });
  });

  it("renders today list returned by the API for the company timezone", async () => {
    mockSummaryResponse(
      makeSummary({
        todayAppointments: [
          makeAppointment({
            id: "appt-boundary",
            startAt: "2026-09-10T01:30:00.000Z",
            endAt: "2026-09-10T02:00:00.000Z",
          }),
        ],
      }),
    );

    renderDashboard("OWNER", "Europe/Lisbon");

    expect(
      await screen.findByText("02:30", { selector: ".text-nowrap" }),
    ).toBeInTheDocument();
  });
});
