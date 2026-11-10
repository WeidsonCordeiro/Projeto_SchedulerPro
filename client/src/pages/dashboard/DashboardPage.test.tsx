import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
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
import { DASHBOARD_REFRESH_WARNING_MESSAGE } from "../../config/dashboardRefresh";

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

function makeStore(
  role: Role | null = "OWNER",
  timezone?: string,
  companyIsActive = true,
) {
  return configureStore({
    reducer: { auth: authReducer, company: companyReducer },
    preloadedState: {
      auth: {
        user: role ? { ...user, role } : null,
        mustChangePassword: false,
        isAuthenticated: Boolean(role),
        isInitializing: false,
        isLoading: false,
        staffCompanyAccessSuspended: false,
      },
      company: timezone
        ? {
            company: {
              id: "company1",
              name: "salao do centro",
              timezone,
              isActive: companyIsActive,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          }
        : { company: null },
    },
  });
}

function renderDashboard(
  role: Role | null = "OWNER",
  timezone?: string,
  companyIsActive = true,
) {
  return render(
    <Provider store={makeStore(role, timezone ?? "Europe/Lisbon", companyIsActive)}>
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

function activeClientsCard() {
  const title = screen.getByRole("heading", { name: "Clientes ativos" });
  return title.closest(".card") as HTMLElement;
}

function todayAgendaDesktop() {
  return within(screen.getByTestId("dashboard-today-agenda-desktop"));
}

function todayAgendaMobile() {
  return within(screen.getByTestId("dashboard-today-agenda-mobile"));
}

function upcomingAgendaDesktop() {
  return within(screen.getByTestId("dashboard-upcoming-agenda-desktop"));
}

function upcomingAgendaMobile() {
  return within(screen.getByTestId("dashboard-upcoming-agenda-mobile"));
}

async function waitForDashboardLoaded() {
  await screen.findByRole("heading", { name: "Resumo do dia" });
}

function setDocumentVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
}

function dispatchVisibilityVisible() {
  setDocumentVisibility("visible");
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const NOW = "2026-09-10T12:00:00.000Z";

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRelatedData();
    mockSummaryResponse(makeSummary());
    setDocumentVisibility("visible");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
    setDocumentVisibility("visible");
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

    expect(cardValues()).toEqual(["1", "2", "1", "0"]);

    const todayDesktop = todayAgendaDesktop();
    expect(todayDesktop.getAllByRole("row")).toHaveLength(2);
    expect(todayDesktop.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-today-agenda-desktop")).toHaveClass(
      "d-none",
      "d-md-block",
    );
    expect(screen.getByTestId("dashboard-today-agenda-mobile")).toHaveClass(
      "d-md-none",
    );
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
    await waitForDashboardLoaded();

    const times = todayAgendaDesktop()
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
    await waitForDashboardLoaded();

    expect(upcomingAgendaDesktop().getAllByRole("row")).toHaveLength(3);
  });

  it("shows empty state when there are no appointments", async () => {
    mockSummaryResponse(makeSummary());
    renderDashboard();

    expect(
      await screen.findByText("Nenhum agendamento para hoje."),
    ).toBeInTheDocument();
    expect(cardValues()).toEqual(["0", "0", "0", "0"]);
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
    await waitForDashboardLoaded();

    expect(
      todayAgendaDesktop().getByText("02:30", { selector: ".text-nowrap" }),
    ).toBeInTheDocument();
  });

  it("does not fetch data when staff company access is suspended", () => {
    const store = configureStore({
      reducer: { auth: authReducer, company: companyReducer },
      preloadedState: {
        auth: {
          user: { ...user, role: "MANAGER" as const },
          mustChangePassword: false,
          isAuthenticated: true,
          isInitializing: false,
          isLoading: false,
          staffCompanyAccessSuspended: true,
        },
        company: { company: null },
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </Provider>,
    );

    expect(dashboardApi.getSummary).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
  });

  it("does not show duplicate inactive-company related alerts when company is inactive", async () => {
    const inactiveError = httpError(403, {
      code: "COMPANY_INACTIVE_OPERATION",
      message: "A empresa está desactivada. Esta operação não está disponível.",
    });
    mockSummaryResponse(makeSummary());
    vi.mocked(clientsApi.getClients).mockRejectedValue(inactiveError);
    vi.mocked(servicesApi.getServices).mockRejectedValue(inactiveError);
    vi.mocked(employeesApi.getEmployees).mockRejectedValue(inactiveError);

    renderDashboard("OWNER", "Europe/Lisbon", false);

    expect(
      await screen.findByRole("heading", { name: "Resumo do dia" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Não foi possível carregar alguns nomes/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Reative a empresa/i)).not.toBeInTheDocument();
  });

  describe("mobile appointment list", () => {
    it("renders two-column compact row with time and client; service only in expanded panel", async () => {
      mockSummaryResponse(
        makeSummary({
          todayAppointments: [
            makeAppointment({
              id: "today-1",
              startAt: "2026-09-10T08:00:00.000Z",
              endAt: "2026-09-10T08:30:00.000Z",
              status: "scheduled",
            }),
          ],
          upcomingAppointments: [
            makeAppointment({
              id: "up-1",
              startAt: "2026-09-15T10:00:00.000Z",
              endAt: "2026-09-15T10:30:00.000Z",
              status: "confirmed",
            }),
          ],
        }),
      );

      renderDashboard();
      await waitForDashboardLoaded();

      const todayMobile = todayAgendaMobile();
      const todayToggle = todayMobile.getByRole("button", { name: /09:00/i });
      expect(within(todayToggle).getByText("09:00")).toBeInTheDocument();
      expect(within(todayToggle).getByText("Maria Silva")).toBeInTheDocument();
      expect(within(todayToggle).queryByText("Corte de cabelo")).not.toBeInTheDocument();
      expect(within(todayToggle).getByText("Agendado")).toBeInTheDocument();
      expect(todayToggle.querySelector(".bi-chevron-down")).toBeInTheDocument();
      const collapsedPanel = todayMobile
        .getByText("Ana Lima")
        .closest(".dashboard-appointment-mobile-panel") as HTMLElement;
      expect(collapsedPanel).toHaveAttribute("hidden");
      expect(within(collapsedPanel).getByText("Corte de cabelo")).toBeInTheDocument();
      expect(todayMobile.queryByRole("link")).not.toBeInTheDocument();

      const upcomingMobile = upcomingAgendaMobile();
      const upcomingToggle = upcomingMobile.getByRole("button", { name: /Confirmado/i });
      expect(within(upcomingToggle).queryByText("Corte de cabelo")).not.toBeInTheDocument();
      expect(within(upcomingToggle).getByText("Maria Silva")).toBeInTheDocument();
      expect(upcomingMobile.queryByRole("link")).not.toBeInTheDocument();
    });

    it("expands and collapses appointment details on row toggle", async () => {
      mockSummaryResponse(
        makeSummary({
          todayAppointments: [
            makeAppointment({
              id: "today-1",
              startAt: "2026-09-10T08:00:00.000Z",
              endAt: "2026-09-10T08:30:00.000Z",
            }),
          ],
        }),
      );

      renderDashboard();
      await waitForDashboardLoaded();

      const mobile = todayAgendaMobile();
      const toggle = mobile.getByRole("button", { name: /09:00/i });
      expect(toggle).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(mobile.getByText("Ana Lima")).toBeInTheDocument();
      expect(mobile.getByText("Profissional")).toBeInTheDocument();
      expect(mobile.getByText("Serviço")).toBeInTheDocument();
      expect(mobile.getByText("Corte de cabelo")).toBeInTheDocument();

      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(
        mobile.getByText("Ana Lima").closest(".dashboard-appointment-mobile-panel"),
      ).toHaveAttribute("hidden");
    });

    it("keeps only one expanded appointment per section", async () => {
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
          ],
        }),
      );

      renderDashboard();
      await waitForDashboardLoaded();

      const mobile = todayAgendaMobile();
      const first = mobile.getByRole("button", { name: /09:00/i });
      const second = mobile.getByRole("button", { name: /11:00/i });

      fireEvent.click(first);
      expect(first).toHaveAttribute("aria-expanded", "true");
      expect(second).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(second);
      expect(first).toHaveAttribute("aria-expanded", "false");
      expect(second).toHaveAttribute("aria-expanded", "true");
    });

    it("uses a scroll container for long mobile lists", async () => {
      const manyToday = Array.from({ length: 20 }, (_, index) =>
        makeAppointment({
          id: `appt-${index}`,
          startAt: `2026-09-10T${String(8 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 === 0 ? "00" : "30"}:00.000Z`,
          endAt: `2026-09-10T${String(8 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 === 0 ? "30" : "00"}:00.000Z`,
        }),
      );

      mockSummaryResponse(
        makeSummary({
          todayAppointments: manyToday,
        }),
      );

      renderDashboard();
      await waitForDashboardLoaded();

      const scroll = screen.getByTestId("dashboard-today-agenda-mobile-scroll");
      expect(scroll).toHaveClass("dashboard-appointment-mobile-list");
      expect(within(scroll).getAllByRole("button")).toHaveLength(20);
    });

    it("does not duplicate empty states on mobile surfaces", async () => {
      mockSummaryResponse(makeSummary());
      renderDashboard();

      expect(
        await screen.findByText("Nenhum agendamento para hoje."),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId("dashboard-today-agenda-mobile"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("dashboard-upcoming-agenda-mobile"),
      ).not.toBeInTheDocument();
    });

    it("exposes desktop and mobile test surfaces with Bootstrap visibility classes", async () => {
      mockSummaryResponse(
        makeSummary({
          todayAppointments: [makeAppointment({ id: "x" })],
          upcomingAppointments: [makeAppointment({ id: "y" })],
        }),
      );

      renderDashboard();
      await waitForDashboardLoaded();

      expect(screen.getByTestId("dashboard-upcoming-agenda-desktop")).toHaveClass(
        "d-none",
        "d-md-block",
      );
      expect(screen.getByTestId("dashboard-upcoming-agenda-mobile")).toHaveClass(
        "d-md-none",
      );
    });
  });

  describe("dashboard tablet and desktop layout", () => {
    it("wraps the page in dashboard-page and keeps the open agenda link", async () => {
      renderDashboard();
      await waitForDashboardLoaded();

      expect(document.querySelector("section.dashboard-page")).toBeInTheDocument();
      const link = screen.getByTestId("dashboard-open-agenda");
      expect(link).toHaveAttribute("href", "/appointments");
      expect(link).toHaveTextContent("Abrir agenda");
    });

    it("keeps six table columns on the desktop appointment surface", async () => {
      mockSummaryResponse(
        makeSummary({
          todayAppointments: [makeAppointment({ id: "desk-1" })],
        }),
      );

      renderDashboard();
      await waitForDashboardLoaded();

      const headers = todayAgendaDesktop().getAllByRole("columnheader");
      expect(headers.map((h) => h.textContent)).toEqual([
        "Dia",
        "Horário",
        "Cliente",
        "Serviço",
        "Profissional",
        "Status",
      ]);
    });

    it("renders the scheduled status badge on the desktop appointment table", async () => {
      mockSummaryResponse(
        makeSummary({
          todayAppointments: [
            makeAppointment({
              id: "status-row",
              status: "scheduled",
            }),
          ],
        }),
      );

      renderDashboard();
      await waitForDashboardLoaded();

      const badge = todayAgendaDesktop().getByText("Agendado");
      expect(badge).toHaveClass("badge", "status-badge-80");
    });
  });

  describe("status distribution (O2)", () => {
    it("renders all five status distribution rows", async () => {
      mockSummaryResponse(makeSummary());

      renderDashboard();
      await waitForDashboardLoaded();

      expect(
        screen.getByTestId("dashboard-status-distribution"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-status-row-scheduled")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-status-row-confirmed")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-status-row-completed")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-status-row-cancelled")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-status-row-no-show")).toBeInTheDocument();
    });

    it("shows non-zero counts for completed, cancelled and no-show", async () => {
      mockSummaryResponse(
        makeSummary({
          period: {
            ...makeSummary().period,
            total: 10,
            byStatus: {
              ...emptyByStatus(),
              scheduled: 2,
              confirmed: 3,
              completed: 2,
              cancelled: 2,
              "no-show": 1,
            },
          },
        }),
      );

      renderDashboard();
      await waitForDashboardLoaded();

      expect(screen.getByTestId("dashboard-status-count-completed")).toHaveTextContent(
        "2",
      );
      expect(screen.getByTestId("dashboard-status-count-cancelled")).toHaveTextContent(
        "2",
      );
      expect(screen.getByTestId("dashboard-status-count-no-show")).toHaveTextContent(
        "1",
      );
    });

    it("uses proportional bar widths from period totals", async () => {
      mockSummaryResponse(
        makeSummary({
          period: {
            ...makeSummary().period,
            total: 10,
            byStatus: {
              ...emptyByStatus(),
              scheduled: 3,
              confirmed: 0,
              completed: 0,
              cancelled: 0,
              "no-show": 0,
            },
          },
        }),
      );

      renderDashboard();
      await waitForDashboardLoaded();

      expect(screen.getByTestId("dashboard-status-bar-scheduled")).toHaveStyle({
        width: "30%",
      });
    });

    it("shows zero counts for every status when byStatus is empty", async () => {
      mockSummaryResponse(
        makeSummary({
          period: {
            ...makeSummary().period,
            total: 0,
            byStatus: emptyByStatus(),
          },
        }),
      );

      renderDashboard();
      await waitForDashboardLoaded();

      expect(
        screen.getByTestId("dashboard-status-distribution-empty"),
      ).toHaveTextContent(/sem agendamentos no período/i);

      for (const status of [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "no-show",
      ] as const) {
        expect(screen.getByTestId(`dashboard-status-count-${status}`)).toHaveTextContent(
          "0",
        );
        expect(screen.getByTestId(`dashboard-status-bar-${status}`)).toHaveStyle({
          width: "0%",
        });
      }
    });

    it("shows the centralized Portuguese labels", async () => {
      mockSummaryResponse(makeSummary());

      renderDashboard();
      await waitForDashboardLoaded();

      expect(screen.getByTestId("dashboard-status-label-scheduled")).toHaveTextContent(
        "Agendado",
      );
      expect(screen.getByTestId("dashboard-status-label-confirmed")).toHaveTextContent(
        "Confirmado",
      );
      expect(screen.getByTestId("dashboard-status-label-completed")).toHaveTextContent(
        "Concluído",
      );
      expect(screen.getByTestId("dashboard-status-label-cancelled")).toHaveTextContent(
        "Cancelado",
      );
      expect(screen.getByTestId("dashboard-status-label-no-show")).toHaveTextContent(
        "Não compareceu",
      );
    });

    it("does not render distribution while the summary is still loading", () => {
      vi.mocked(dashboardApi.getSummary).mockReturnValue(new Promise(() => {}));
      renderDashboard();

      expect(
        screen.queryByTestId("dashboard-status-distribution"),
      ).not.toBeInTheDocument();
    });

    it("does not render distribution when the summary request fails", async () => {
      vi.mocked(dashboardApi.getSummary).mockRejectedValueOnce(
        httpError(500, { message: "Erro interno do servidor." }),
      );

      renderDashboard();
      await screen.findByText("Erro interno do servidor.");

      expect(
        screen.queryByTestId("dashboard-status-distribution"),
      ).not.toBeInTheDocument();
    });

    it("keeps today and upcoming agenda sections after adding distribution", async () => {
      mockSummaryResponse(
        makeSummary({
          todayAppointments: [makeAppointment()],
          upcomingAppointments: [
            makeAppointment({ id: "up1", startAt: "2026-09-11T09:00:00.000Z" }),
          ],
        }),
      );

      renderDashboard();
      await waitForDashboardLoaded();

      expect(screen.getByTestId("dashboard-today-agenda-desktop")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-upcoming-agenda-desktop")).toBeInTheDocument();
    });
  });

  describe("active clients KPI", () => {
    it("shows the active clients count from the summary", async () => {
      mockSummaryResponse(makeSummary({ activeClientsCount: 12 }));

      renderDashboard();
      await waitForDashboardLoaded();

      expect(
        screen.getByRole("heading", { name: "Clientes ativos" }),
      ).toBeInTheDocument();
      expect(within(activeClientsCard()).getByTestId("card-value")).toHaveTextContent(
        "12",
      );
    });

    it("shows zero active clients when the summary reports 0", async () => {
      mockSummaryResponse(makeSummary({ activeClientsCount: 0 }));

      renderDashboard();
      await waitForDashboardLoaded();

      expect(within(activeClientsCard()).getByTestId("card-value")).toHaveTextContent(
        "0",
      );
    });

    it("keeps existing KPI titles and four card values after load", async () => {
      mockSummaryResponse(
        makeSummary({
          todayAppointments: [makeAppointment()],
          period: {
            ...makeSummary().period,
            byStatus: { ...emptyByStatus(), scheduled: 2, confirmed: 1 },
          },
        }),
      );

      renderDashboard();
      await waitForDashboardLoaded();

      expect(screen.getByRole("heading", { name: "Hoje" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Pendentes" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Confirmados" })).toBeInTheDocument();
      expect(cardValues()).toEqual(["1", "2", "1", "0"]);
    });

    it("uses responsive column classes on the fourth KPI wrapper", async () => {
      mockSummaryResponse(makeSummary({ activeClientsCount: 3 }));

      const { container } = renderDashboard();
      await waitForDashboardLoaded();

      const grid = container.querySelector(".dashboard-kpis");
      expect(grid).toBeTruthy();
      const columns = grid!.children;
      expect(columns).toHaveLength(4);
      const fourth = columns[3] as HTMLElement;
      expect(fourth).toHaveClass("col-12", "col-md-6", "col-lg-3");
    });
  });

  describe("automatic refresh (O5)", () => {
    it("reloads summary after unmount and remount", async () => {
      mockSummaryResponse(makeSummary({ activeClientsCount: 5 }));
      const { unmount } = renderDashboard();
      await waitForDashboardLoaded();
      expect(within(activeClientsCard()).getByTestId("card-value")).toHaveTextContent(
        "5",
      );

      unmount();

      mockSummaryResponse(makeSummary({ activeClientsCount: 99 }));
      renderDashboard();
      await waitForDashboardLoaded();

      expect(dashboardApi.getSummary).toHaveBeenCalledTimes(2);
      expect(within(activeClientsCard()).getByTestId("card-value")).toHaveTextContent(
        "99",
      );
    });

    it("refreshes when the tab becomes visible after the throttle interval", async () => {
      renderDashboard();
      await waitForDashboardLoaded();
      expect(dashboardApi.getSummary).toHaveBeenCalledTimes(1);

      mockSummaryResponse(makeSummary({ activeClientsCount: 20 }));

      act(() => {
        vi.advanceTimersByTime(45_000);
      });
      dispatchVisibilityVisible();

      await vi.waitFor(() => {
        expect(dashboardApi.getSummary).toHaveBeenCalledTimes(2);
      });
      await vi.waitFor(() => {
        expect(within(activeClientsCard()).getByTestId("card-value")).toHaveTextContent(
          "20",
        );
      });
    });

    it("does not refresh when visibility becomes hidden", async () => {
      renderDashboard();
      await waitForDashboardLoaded();

      setDocumentVisibility("hidden");
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      expect(dashboardApi.getSummary).toHaveBeenCalledTimes(1);
    });

    it("throttles rapid visible events to one extra call per interval", async () => {
      renderDashboard();
      await waitForDashboardLoaded();

      act(() => {
        vi.advanceTimersByTime(45_000);
      });
      dispatchVisibilityVisible();
      dispatchVisibilityVisible();

      await vi.waitFor(() => {
        expect(dashboardApi.getSummary).toHaveBeenCalledTimes(2);
      });
      await act(async () => {
        await Promise.resolve();
      });
    });

    it("does not start a second refresh while one is already in flight", async () => {
      const hanging = deferred<ApiResponse<DashboardSummary>>();
      vi.mocked(dashboardApi.getSummary)
        .mockResolvedValueOnce({
          success: true,
          message: "ok",
          data: makeSummary(),
        } satisfies ApiResponse<DashboardSummary>)
        .mockImplementationOnce(() => hanging.promise);

      renderDashboard();
      await waitForDashboardLoaded();

      act(() => {
        vi.advanceTimersByTime(45_000);
      });
      dispatchVisibilityVisible();
      dispatchVisibilityVisible();

      expect(dashboardApi.getSummary).toHaveBeenCalledTimes(2);

      await act(async () => {
        hanging.resolve({
          success: true,
          message: "ok",
          data: makeSummary({ activeClientsCount: 7 }),
        });
      });

      await vi.waitFor(() => {
        expect(within(activeClientsCard()).getByTestId("card-value")).toHaveTextContent(
          "7",
        );
      });
    });

    it("waits for the full 45 second throttle before another automatic refresh", async () => {
      renderDashboard();
      await waitForDashboardLoaded();

      act(() => {
        vi.advanceTimersByTime(44_999);
      });
      dispatchVisibilityVisible();
      expect(dashboardApi.getSummary).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      dispatchVisibilityVisible();

      await vi.waitFor(() => {
        expect(dashboardApi.getSummary).toHaveBeenCalledTimes(2);
      });
    });

    it("keeps existing KPIs and shows a warning when a silent refresh fails", async () => {
      mockSummaryResponse(makeSummary({ activeClientsCount: 11 }));
      renderDashboard();
      await waitForDashboardLoaded();

      vi.mocked(dashboardApi.getSummary).mockRejectedValueOnce(
        httpError(500, { message: "Erro interno do servidor." }),
      );

      act(() => {
        vi.advanceTimersByTime(45_000);
      });
      dispatchVisibilityVisible();

      await vi.waitFor(() => {
        expect(screen.getByTestId("dashboard-refresh-warning")).toHaveTextContent(
          DASHBOARD_REFRESH_WARNING_MESSAGE,
        );
      });
      expect(within(activeClientsCard()).getByTestId("card-value")).toHaveTextContent(
        "11",
      );
      expect(screen.queryByText("Erro interno do servidor.")).not.toBeInTheDocument();
    });

    it("does not show fullscreen loading during a silent refresh", async () => {
      const hanging = deferred<ApiResponse<DashboardSummary>>();
      vi.mocked(dashboardApi.getSummary)
        .mockResolvedValueOnce({
          success: true,
          message: "ok",
          data: makeSummary({
            todayAppointments: [makeAppointment()],
          }),
        } satisfies ApiResponse<DashboardSummary>)
        .mockImplementationOnce(() => hanging.promise);

      renderDashboard();
      await waitForDashboardLoaded();
      expect(screen.getByTestId("dashboard-today-agenda-desktop")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(45_000);
      });
      dispatchVisibilityVisible();

      expect(screen.queryByText("A carregar o painel…")).not.toBeInTheDocument();
      expect(screen.getByTestId("dashboard-today-agenda-desktop")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-refreshing")).toBeInTheDocument();

      await act(async () => {
        hanging.resolve({
          success: true,
          message: "ok",
          data: makeSummary(),
        });
      });
    });

    it("preserves O2 distribution after a successful silent refresh", async () => {
      let summaryCalls = 0;
      vi.mocked(dashboardApi.getSummary).mockImplementation(async () => {
        summaryCalls += 1;
        if (summaryCalls === 1) {
          return {
            success: true,
            message: "ok",
            data: makeSummary(),
          } satisfies ApiResponse<DashboardSummary>;
        }
        return {
          success: true,
          message: "ok",
          data: makeSummary({
            period: {
              ...makeSummary().period,
              total: 1,
              byStatus: {
                ...emptyByStatus(),
                completed: 1,
              },
            },
          }),
        } satisfies ApiResponse<DashboardSummary>;
      });

      renderDashboard();
      await waitForDashboardLoaded();

      act(() => {
        vi.advanceTimersByTime(45_000);
      });
      dispatchVisibilityVisible();

      await vi.waitFor(() => {
        expect(screen.getByTestId("dashboard-status-count-completed")).toHaveTextContent(
          "1",
        );
      });
    });

    it("ignores stale summary responses that complete after a newer load cycle", async () => {
      const slow = deferred<ApiResponse<DashboardSummary>>();
      const fresh = deferred<ApiResponse<DashboardSummary>>();

      let summaryCalls = 0;
      vi.mocked(dashboardApi.getSummary).mockImplementation(() => {
        summaryCalls += 1;
        if (summaryCalls === 1) {
          return Promise.resolve({
            success: true,
            message: "ok",
            data: makeSummary({ activeClientsCount: 1 }),
          } satisfies ApiResponse<DashboardSummary>);
        }
        if (summaryCalls === 2) {
          return slow.promise;
        }
        return fresh.promise;
      });

      const view = (timezone: string) => (
        <Provider store={makeStore("OWNER", timezone)}>
          <MemoryRouter>
            <DashboardPage />
          </MemoryRouter>
        </Provider>
      );

      const { rerender } = render(view("Europe/Lisbon"));
      await waitForDashboardLoaded();

      act(() => {
        vi.advanceTimersByTime(45_000);
      });
      dispatchVisibilityVisible();

      rerender(view("America/Sao_Paulo"));

      await act(async () => {
        fresh.resolve({
          success: true,
          message: "ok",
          data: makeSummary({ activeClientsCount: 50 }),
        });
      });

      await vi.waitFor(() => {
        expect(within(activeClientsCard()).getByTestId("card-value")).toHaveTextContent(
          "50",
        );
      });

      await act(async () => {
        slow.resolve({
          success: true,
          message: "ok",
          data: makeSummary({ activeClientsCount: 99 }),
        });
      });

      expect(within(activeClientsCard()).getByTestId("card-value")).toHaveTextContent(
        "50",
      );
    });

    it("removes the visibility listener when the page unmounts", async () => {
      const removeSpy = vi.spyOn(document, "removeEventListener");
      const { unmount } = renderDashboard();
      await waitForDashboardLoaded();

      unmount();

      expect(removeSpy).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function),
      );
      removeSpy.mockRestore();
    });

    it("does not register automatic refresh when staff company access is suspended", () => {
      const addSpy = vi.spyOn(document, "addEventListener");
      const store = configureStore({
        reducer: { auth: authReducer, company: companyReducer },
        preloadedState: {
          auth: {
            user: { ...user, role: "MANAGER" as const },
            mustChangePassword: false,
            isAuthenticated: true,
            isInitializing: false,
            isLoading: false,
            staffCompanyAccessSuspended: true,
          },
          company: { company: null },
        },
      });

      render(
        <Provider store={store}>
          <MemoryRouter>
            <DashboardPage />
          </MemoryRouter>
        </Provider>,
      );

      const visibilityCalls = addSpy.mock.calls.filter(
        ([event]) => event === "visibilitychange",
      );
      expect(visibilityCalls).toHaveLength(0);
      addSpy.mockRestore();
    });

    it("releases the in-flight guard after refresh failure so a later refresh can run", async () => {
      mockSummaryResponse(makeSummary({ activeClientsCount: 3 }));
      renderDashboard();
      await waitForDashboardLoaded();

      vi.mocked(dashboardApi.getSummary).mockRejectedValueOnce(
        httpError(500, { message: "Erro interno do servidor." }),
      );

      act(() => {
        vi.advanceTimersByTime(45_000);
      });
      dispatchVisibilityVisible();

      await vi.waitFor(() => {
        expect(screen.getByTestId("dashboard-refresh-warning")).toBeInTheDocument();
      });

      mockSummaryResponse(makeSummary({ activeClientsCount: 8 }));

      act(() => {
        vi.advanceTimersByTime(45_000);
      });
      dispatchVisibilityVisible();

      await vi.waitFor(() => {
        expect(within(activeClientsCard()).getByTestId("card-value")).toHaveTextContent(
          "8",
        );
      });
    });
  });
});
