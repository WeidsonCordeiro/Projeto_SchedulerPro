import { useCallback, useEffect, useMemo, useState } from "react";
import reportsApi from "../../api/endpoints/reports.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import { getReportAbilities } from "../../config/reportPermissions";
import {
  buildReportRange,
  formatReportDate,
  REPORT_PERIOD_LABELS,
  type ReportPeriodKey,
  type ReportRangeISO,
} from "../../config/reportPeriod";
import { useAppSelector } from "../../store";
import { selectCompanyTimezone } from "../../store/slices/companySlice";
import type { AppointmentStatus } from "../../types/appointment";
import type {
  ReportCancellations,
  ReportClients,
  ReportEmployee,
  ReportOverview,
  ReportRevenue,
  ReportTopService,
} from "../../types/report";
import { DateTime } from "luxon";

const STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no-show",
];

const STATUS_ICONS: Record<AppointmentStatus, string> = {
  scheduled: "bi-clock",
  confirmed: "bi-check-circle",
  completed: "bi-check-circle-fill",
  cancelled: "bi-x-circle",
  "no-show": "bi-person-x",
};

const EMPTY_OVERVIEW: ReportOverview = {
  total: 0,
  byStatus: { scheduled: 0, confirmed: 0, completed: 0, cancelled: 0, "no-show": 0 },
};

const EMPTY_REVENUE: ReportRevenue = {
  completedCount: 0,
  estimatedRevenue: 0,
  forecastCount: 0,
  forecastRevenue: 0,
};

const EMPTY_CLIENTS: ReportClients = {
  totalClients: 0,
  recurringCount: 0,
  topClients: [],
};

const EMPTY_CANCELLATIONS: ReportCancellations = {
  total: 0,
  cancelledCount: 0,
  cancellationRate: 0,
};

function formatMoney(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return value.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatInteger(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return value.toLocaleString("pt-PT", { maximumFractionDigits: 0 });
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return `${value.toLocaleString("pt-PT", { maximumFractionDigits: 2 })}%`;
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: React.ReactNode;
  icon: string;
}) {
  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h3 className="card-title h6 mb-1">{title}</h3>
            <p className="card-text fs-4 mb-0">{value}</p>
          </div>
          <i className={`bi ${icon} text-muted fs-4`} />
        </div>
      </div>
    </div>
  );
}

function customMonthBounds(timezone: string) {
  const now = DateTime.now().setZone(timezone);
  return {
    start: now.startOf("month").toFormat("yyyy-MM-dd"),
    end: now.startOf("month").endOf("month").toFormat("yyyy-MM-dd"),
  };
}

export default function ReportsPage() {
  const user = useAppSelector((state) => state.auth.user);
  const timezone = useAppSelector(selectCompanyTimezone);
  const { canView } = getReportAbilities(user?.role ?? null);

  const [period, setPeriod] = useState<ReportPeriodKey>("month");
  const [customInput, setCustomInput] = useState(() =>
    customMonthBounds(timezone),
  );
  const [appliedCustom, setAppliedCustom] = useState(() =>
    customMonthBounds(timezone),
  );
  const [customError, setCustomError] = useState<string | null>(null);

  const [overview, setOverview] = useState<ReportOverview>(EMPTY_OVERVIEW);
  const [revenue, setRevenue] = useState<ReportRevenue>(EMPTY_REVENUE);
  const [topServices, setTopServices] = useState<ReportTopService[]>([]);
  const [employees, setEmployees] = useState<ReportEmployee[]>([]);
  const [clients, setClients] = useState<ReportClients>(EMPTY_CLIENTS);
  const [cancellations, setCancellations] = useState<ReportCancellations>(
    EMPTY_CANCELLATIONS,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [relatedError, setRelatedError] = useState<string | null>(null);

  const range = useMemo<ReportRangeISO | null>(() => {
    if (period === "custom") {
      return buildReportRange(
        "custom",
        timezone,
        appliedCustom.start,
        appliedCustom.end,
      );
    }
    return buildReportRange(period, timezone);
  }, [period, timezone, appliedCustom]);

  const loadReports = useCallback(async (target: ReportRangeISO | null) => {
    setIsLoading(true);
    setLoadError(null);
    setRelatedError(null);
    setOverview(EMPTY_OVERVIEW);
    setRevenue(EMPTY_REVENUE);
    setTopServices([]);
    setEmployees([]);
    setClients(EMPTY_CLIENTS);
    setCancellations(EMPTY_CANCELLATIONS);

    const params = target ?? {};

    try {
      const response = await reportsApi.getOverview(params);
      setOverview(response.data ?? EMPTY_OVERVIEW);
    } catch (error) {
      setLoadError(getFriendlyErrorMessage(getApiError(error)));
      setIsLoading(false);
      return;
    }

    const failures: string[] = [];

    try {
      const response = await reportsApi.getRevenue(params);
      setRevenue(response.data ?? EMPTY_REVENUE);
    } catch (error) {
      failures.push(getFriendlyErrorMessage(getApiError(error)));
    }

    try {
      const response = await reportsApi.getTopServices({ ...params, limit: 5 });
      setTopServices(response.data ?? []);
    } catch (error) {
      failures.push(getFriendlyErrorMessage(getApiError(error)));
    }

    try {
      const response = await reportsApi.getEmployees(params);
      setEmployees(response.data ?? []);
    } catch (error) {
      failures.push(getFriendlyErrorMessage(getApiError(error)));
    }

    try {
      const response = await reportsApi.getClients({ ...params, limit: 5 });
      setClients(response.data ?? EMPTY_CLIENTS);
    } catch (error) {
      failures.push(getFriendlyErrorMessage(getApiError(error)));
    }

    try {
      const response = await reportsApi.getCancellations(params);
      setCancellations(response.data ?? EMPTY_CANCELLATIONS);
    } catch (error) {
      failures.push(getFriendlyErrorMessage(getApiError(error)));
    }

    setRelatedError(
      failures.length > 0
        ? `Não foi possível carregar parte dos relatórios. ${failures.join(" ")}`
        : null,
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!canView) {
      return;
    }
    void loadReports(range);
  }, [canView, loadReports, range]);

  function selectPeriod(next: ReportPeriodKey) {
    setCustomError(null);
    if (next === "custom") {
      setCustomInput({ ...appliedCustom });
    }
    setPeriod(next);
  }

  function applyCustom() {
    const start = customInput.start.trim();
    const end = customInput.end.trim();
    if (!start || !end) {
      setCustomError("Informe as datas de início e fim do período.");
      return;
    }
    if (start > end) {
      setCustomError(
        "A data inicial não pode ser posterior à data final.",
      );
      return;
    }
    setCustomError(null);
    setAppliedCustom({ start, end });
  }

  if (!canView) {
    return (
      <section>
        <div className="mb-3">
          <h1 className="h3 mb-0">Relatórios</h1>
        </div>
        <div className="alert alert-warning" role="alert">
          Você não tem permissão para acessar esta página.
        </div>
      </section>
    );
  }

  const periodDescription =
    period === "custom"
      ? `${formatReportDate(appliedCustom.start, timezone)} a ${formatReportDate(appliedCustom.end, timezone)}`
      : REPORT_PERIOD_LABELS[period];

  return (
    <section>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h1 className="h3 mb-0">Relatórios</h1>
        <span className="text-muted small">
          Período: {periodDescription}
        </span>
      </div>

      <div className="mb-4">
        <div className="btn-group" role="group" aria-label="Período do relatório">
          {(Object.keys(REPORT_PERIOD_LABELS) as ReportPeriodKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`btn btn-sm ${period === key ? "btn-primary" : "btn-outline-primary"}`}
              aria-pressed={period === key}
              onClick={() => selectPeriod(key)}
            >
              {REPORT_PERIOD_LABELS[key]}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="row g-2 align-items-end mt-2">
            <div className="col-auto">
              <label htmlFor="report-start" className="form-label small mb-1">
                Início
              </label>
              <input
                id="report-start"
                type="date"
                className="form-control form-control-sm"
                value={customInput.start}
                onChange={(event) =>
                  setCustomInput((prev) => ({ ...prev, start: event.target.value }))
                }
              />
            </div>
            <div className="col-auto">
              <label htmlFor="report-end" className="form-label small mb-1">
                Fim
              </label>
              <input
                id="report-end"
                type="date"
                className="form-control form-control-sm"
                value={customInput.end}
                onChange={(event) =>
                  setCustomInput((prev) => ({ ...prev, end: event.target.value }))
                }
              />
            </div>
            <div className="col-auto">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={applyCustom}
              >
                Aplicar
              </button>
            </div>
            {customError && (
              <div className="col-12">
                <p className="text-danger small mb-0">{customError}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      )}

      {!isLoading && loadError && (
        <div className="alert alert-danger" role="alert">
          {loadError}
          <div className="mt-2">
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => void loadReports(range)}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {!isLoading && !loadError && overview.total === 0 && (
        <div className="card">
          <div className="card-body text-center py-5">
            <p className="mb-3 text-muted">
              Nenhum agendamento neste período.
            </p>
          </div>
        </div>
      )}

      {!isLoading && !loadError && overview.total > 0 && (
        <>
          {relatedError && (
            <div className="alert alert-warning" role="alert">
              {relatedError}
            </div>
          )}

          <h2 className="h5 mb-3">Visão geral</h2>
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-4 col-lg-2">
              <StatCard
                title="Total"
                value={formatInteger(overview.total)}
                icon="bi-calendar3"
              />
            </div>
            {STATUSES.map((status) => (
              <div className="col-6 col-md-4 col-lg-2" key={status}>
                <StatCard
                  title={STATUSES_HEADERS[status]}
                  value={formatInteger(overview.byStatus[status] ?? 0)}
                  icon={STATUS_ICONS[status]}
                />
              </div>
            ))}
          </div>

          <h2 className="h5 mb-3">Receita</h2>
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <StatCard
                title="Receita estimada (concluídos)"
                value={
                  <span data-testid="revenue-estimated">
                    {formatMoney(revenue.estimatedRevenue)}
                  </span>
                }
                icon="bi-cash"
              />
            </div>
            <div className="col-md-6">
              <StatCard
                title="Valor previsto (agendados e confirmados)"
                value={formatMoney(revenue.forecastRevenue)}
                icon="bi-calendar2-week"
              />
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-xl-6">
              <div className="card h-100">
                <div className="card-header">Serviços mais realizados</div>
                <div className="card-body table-responsive">
                  <RankingTable
                    emptyMessage="Nenhum serviço neste período."
                    headers={["Serviço", "Agend.", "Concl.", "Valor estimado"]}
                    rows={topServices.map((service) => [
                      service.name ?? "—",
                      formatInteger(service.count),
                      formatInteger(service.completedCount),
                      formatMoney(service.estimatedRevenue),
                    ])}
                  />
                </div>
              </div>
            </div>
            <div className="col-xl-6">
              <div className="card h-100">
                <div className="card-header">Funcionários</div>
                <div className="card-body table-responsive">
                  <RankingTable
                    emptyMessage="Nenhum agendamento neste período."
                    headers={[
                      "Funcionário",
                      "Agend.",
                      "Concl.",
                      "Cancel.",
                      "Valor estimado",
                    ]}
                    rows={employees.map((employee) => [
                      employee.name ?? "—",
                      formatInteger(employee.count),
                      formatInteger(employee.completedCount),
                      formatInteger(employee.cancelledCount),
                      formatMoney(employee.estimatedRevenue),
                    ])}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-xl-6">
              <div className="card h-100">
                <div className="card-header">
                  Clientes recorrentes
                  <span className="text-muted small fw-normal ms-2">
                    {formatInteger(clients.totalClients)} clientes ativos no período,{" "}
                    {formatInteger(clients.recurringCount)} recorrentes
                  </span>
                </div>
                <div className="card-body table-responsive">
                  <RankingTable
                    emptyMessage="Nenhum cliente neste período."
                    headers={[
                      "Cliente",
                      "Agend.",
                      "Concl.",
                      "Valor estimado",
                    ]}
                    rows={clients.topClients.map((client) => [
                      client.name ?? "—",
                      formatInteger(client.count),
                      formatInteger(client.completedCount),
                      formatMoney(client.estimatedRevenue),
                    ])}
                  />
                </div>
              </div>
            </div>
            <div className="col-xl-6">
              <div className="card h-100">
                <div className="card-header">Cancelamentos</div>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Cancelados</span>
                    <strong>{formatInteger(cancellations.cancelledCount)}</strong>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Total de agendamentos</span>
                    <strong>{formatInteger(cancellations.total)}</strong>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Percentual de cancelamentos</span>
                    <strong data-testid="cancellation-rate">
                      {formatPercent(cancellations.cancellationRate)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

const STATUSES_HEADERS: Record<AppointmentStatus, string> = {
  scheduled: "Agendados",
  confirmed: "Confirmados",
  completed: "Concluídos",
  cancelled: "Cancelados",
  "no-show": "Não compareceu",
};

function RankingTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p className="text-muted small mb-0">{emptyMessage}</p>;
  }
  return (
    <table className="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th scope="col" className="small text-muted">
            #
          </th>
          {headers.map((header) => (
            <th scope="col" className="small text-muted" key={header}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, index) => (
          <tr key={index}>
            <td className="text-muted">{index + 1}</td>
            {cells.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}