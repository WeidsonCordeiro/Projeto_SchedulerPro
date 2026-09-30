import { fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ReportsPage from "./ReportsPage";
import reportsApi from "../../api/endpoints/reports.api";
import authReducer from "../../store/slices/authSlice";
import companyReducer from "../../store/slices/companySlice";
import { httpError } from "../../test/http";
import { user } from "../../test/fixtures";
import type { ApiResponse } from "../../types/api";
import type { Role } from "../../types/auth";
import type {
  ReportCancellations,
  ReportClients,
  ReportEmployee,
  ReportOverview,
  ReportRevenue,
  ReportTopService,
} from "../../types/report";

vi.mock("../../api/endpoints/reports.api", () => ({
  default: {
    getOverview: vi.fn(),
    getRevenue: vi.fn(),
    getTopServices: vi.fn(),
    getEmployees: vi.fn(),
    getClients: vi.fn(),
    getCancellations: vi.fn(),
  },
}));

const TZ = "Europe/Lisbon";
const NOW = new Date("2026-09-16T10:00:00.000Z");

const MONTH_RANGE = {
  startAt: "2026-08-31T23:00:00.000Z",
  endAt: "2026-09-30T23:00:00.000Z",
};
const TODAY_RANGE = {
  startAt: "2026-09-15T23:00:00.000Z",
  endAt: "2026-09-16T23:00:00.000Z",
};
const CUSTOM_RANGE = {
  startAt: "2026-10-04T23:00:00.000Z",
  endAt: "2026-10-20T23:00:00.000Z",
};

const overview: ReportOverview = {
  total: 20,
  byStatus: {
    scheduled: 5,
    confirmed: 4,
    completed: 6,
    cancelled: 3,
    "no-show": 2,
  },
};
const revenue: ReportRevenue = {
  completedCount: 6,
  estimatedRevenue: 120,
  forecastCount: 9,
  forecastRevenue: 180,
};
const topServices: ReportTopService[] = [
  {
    serviceId: "s1",
    name: "Corte de cabelo",
    count: 8,
    completedCount: 5,
    estimatedRevenue: 75,
  },
];
const employees: ReportEmployee[] = [
  {
    employeeId: "e1",
    name: "Ana Lima",
    count: 12,
    completedCount: 6,
    cancelledCount: 2,
    estimatedRevenue: 90,
  },
];
const clients: ReportClients = {
  totalClients: 4,
  recurringCount: 2,
  topClients: [
    {
      clientId: "c1",
      name: "Maria Silva",
      count: 5,
      completedCount: 4,
      estimatedRevenue: 60,
    },
  ],
};
const cancellations: ReportCancellations = {
  total: 20,
  cancelledCount: 3,
  cancellationRate: 15,
};

const EMPTY_OVERVIEW: ReportOverview = {
  total: 0,
  byStatus: { scheduled: 0, confirmed: 0, completed: 0, cancelled: 0, "no-show": 0 },
};

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

function renderReports(role: Role | null = "OWNER", timezone: string = TZ) {
  return render(
    <Provider store={makeStore(role, timezone)}>
      <ReportsPage />
    </Provider>,
  );
}

function mockSuccess() {
  vi.mocked(reportsApi.getOverview).mockResolvedValue({
    success: true,
    message: "ok",
    data: overview,
  } satisfies ApiResponse<ReportOverview>);
  vi.mocked(reportsApi.getRevenue).mockResolvedValue({
    success: true,
    message: "ok",
    data: revenue,
  } satisfies ApiResponse<ReportRevenue>);
  vi.mocked(reportsApi.getTopServices).mockResolvedValue({
    success: true,
    message: "ok",
    data: topServices,
  } satisfies ApiResponse<ReportTopService[]>);
  vi.mocked(reportsApi.getEmployees).mockResolvedValue({
    success: true,
    message: "ok",
    data: employees,
  } satisfies ApiResponse<ReportEmployee[]>);
  vi.mocked(reportsApi.getClients).mockResolvedValue({
    success: true,
    message: "ok",
    data: clients,
  } satisfies ApiResponse<ReportClients>);
  vi.mocked(reportsApi.getCancellations).mockResolvedValue({
    success: true,
    message: "ok",
    data: cancellations,
  } satisfies ApiResponse<ReportCancellations>);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("ReportsPage", () => {
  it("mostra o spinner enquanto carrega", () => {
    vi.mocked(reportsApi.getOverview).mockReturnValue(new Promise(() => {}));

    renderReports();

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renderiza cards, receita e rankings do período", async () => {
    mockSuccess();
    renderReports();

    expect(await screen.findByText("Visão geral")).toBeInTheDocument();
    expect(screen.getByTestId("revenue-estimated")).toHaveTextContent("120,00");
    expect(screen.getByText("180,00")).toBeInTheDocument();
    expect(screen.getByTestId("cancellation-rate")).toHaveTextContent("15%");

    expect(screen.getByText("Serviços mais realizados")).toBeInTheDocument();
    expect(screen.getByText("Corte de cabelo")).toBeInTheDocument();
    expect(screen.getByText("75,00")).toBeInTheDocument();
    expect(screen.getByText("Funcionários")).toBeInTheDocument();
    expect(screen.getByText("Ana Lima")).toBeInTheDocument();
    expect(screen.getByText("90,00")).toBeInTheDocument();
    expect(screen.getByText("Clientes recorrentes")).toBeInTheDocument();
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText("60,00")).toBeInTheDocument();
    expect(screen.getByText("Cancelamentos")).toBeInTheDocument();
  });

  it("consulta os endpoints com o período mensal padrão", async () => {
    mockSuccess();
    renderReports();
    await screen.findByText("Visão geral");

    expect(reportsApi.getOverview).toHaveBeenCalledWith(MONTH_RANGE);
    expect(reportsApi.getRevenue).toHaveBeenCalledWith(MONTH_RANGE);
    expect(reportsApi.getTopServices).toHaveBeenCalledWith({
      ...MONTH_RANGE,
      limit: 5,
    });
    expect(reportsApi.getEmployees).toHaveBeenCalledWith(MONTH_RANGE);
    expect(reportsApi.getClients).toHaveBeenCalledWith({
      ...MONTH_RANGE,
      limit: 5,
    });
    expect(reportsApi.getCancellations).toHaveBeenCalledWith(MONTH_RANGE);
  });

  it("reconsulta ao trocar o período para hoje", async () => {
    mockSuccess();
    renderReports();
    await screen.findByText("Visão geral");

    fireEvent.click(screen.getByRole("button", { name: "Hoje" }));

    expect(vi.mocked(reportsApi.getOverview)).toHaveBeenLastCalledWith(
      TODAY_RANGE,
    );
  });

  it("aplica um período personalizado", async () => {
    mockSuccess();
    renderReports();
    await screen.findByText("Visão geral");

    fireEvent.click(screen.getByRole("button", { name: "Personalizado" }));

    fireEvent.change(screen.getByLabelText("Início"), {
      target: { value: "2026-10-05" },
    });
    fireEvent.change(screen.getByLabelText("Fim"), {
      target: { value: "2026-10-20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(vi.mocked(reportsApi.getOverview)).toHaveBeenLastCalledWith(
      CUSTOM_RANGE,
    );
  });

  it("rejeita período personalizado com datas fora de ordem", async () => {
    mockSuccess();
    renderReports();
    await screen.findByText("Visão geral");

    fireEvent.click(screen.getByRole("button", { name: "Personalizado" }));
    fireEvent.change(screen.getByLabelText("Início"), {
      target: { value: "2026-10-20" },
    });
    fireEvent.change(screen.getByLabelText("Fim"), {
      target: { value: "2026-10-05" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(
      screen.getByText("A data inicial não pode ser posterior à data final."),
    ).toBeInTheDocument();
  });

  it("mostra o estado vazio", async () => {
    mockSuccess();
    vi.mocked(reportsApi.getOverview).mockResolvedValue({
      success: true,
      message: "ok",
      data: EMPTY_OVERVIEW,
    } satisfies ApiResponse<ReportOverview>);

    renderReports();

    expect(
      await screen.findByText("Nenhum agendamento neste período."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Visão geral")).not.toBeInTheDocument();
  });

  it("mostra erro primário e permite tentar novamente", async () => {
    vi.mocked(reportsApi.getOverview).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );
    renderReports();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Erro interno do servidor.");

    mockSuccess();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Visão geral")).toBeInTheDocument();
  });

  it("continua exibindo o relatório quando um endpoint relacionado falha", async () => {
    mockSuccess();
    vi.mocked(reportsApi.getRevenue).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    renderReports();

    expect(await screen.findByText("Visão geral")).toBeInTheDocument();
    expect(
      screen.getByText(/não foi possível carregar parte dos relatórios/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("revenue-estimated")).toHaveTextContent("0,00");
  });

  it("bloqueia a página para roles sem permissão", () => {
    renderReports("EMPLOYEE");

    expect(
      screen.getByText("Você não tem permissão para acessar esta página."),
    ).toBeInTheDocument();
    expect(reportsApi.getOverview).not.toHaveBeenCalled();
  });

  it("permite acesso para MANAGER", async () => {
    mockSuccess();
    renderReports("MANAGER");

    expect(await screen.findByText("Visão geral")).toBeInTheDocument();
  });
});