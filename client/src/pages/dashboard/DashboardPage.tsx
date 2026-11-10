import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dashboardApi from "../../api/endpoints/dashboard.api";
import clientsApi from "../../api/endpoints/clients.api";
import servicesApi from "../../api/endpoints/services.api";
import employeesApi from "../../api/endpoints/employees.api";
import {
  collectRelatedFailureMessages,
  formatRelatedFailuresMessage,
  getApiError,
  getPageLoadErrorPresentation,
} from "../../api/errors";
import { buildReportRange } from "../../config/reportPeriod";
import { DASHBOARD_REFRESH_WARNING_MESSAGE } from "../../config/dashboardRefresh";
import { useDashboardVisibilityRefresh } from "../../hooks/useDashboardVisibilityRefresh";
import { useAppSelector } from "../../store";
import { selectCompany, selectCompanyTimezone } from "../../store/slices/companySlice";
import type { Appointment } from "../../types/appointment";
import type { Client } from "../../types/client";
import type { Service } from "../../types/service";
import type { Employee, EmployeeRole } from "../../types/employee";
import type { DashboardSummary } from "../../types/dashboard";
import DashboardCard from "../../components/common/DashboardCard";
import DashboardAppointments from "./DashboardAppointments";
import DashboardStatusDistribution from "./DashboardStatusDistribution";
import PageHeader from "../../components/common/PageHeader";
import ErrorState from "../../components/common/ErrorState";
import LoadingState from "../../components/common/LoadingState";
import { Link } from "react-router-dom";

/**
 * Apenas OWNER e ADMIN possuem USER_READ (server/src/constants/rbac.ts), a
 * permissão exigida por GET /users. As demais roles não conseguem carregar a
 * lista de funcionários; nesses casos o card de Funcionários não é exibido.
 */
const CAN_LIST_EMPLOYEES_ROLES: EmployeeRole[] = ["OWNER", "ADMIN"];

const UPCOMING_LIMIT = 5;

interface FetchedRelatedData {
  clients: Client[];
  services: Service[];
  employees: Employee[];
  relatedError: string | null;
}

export default function DashboardPage() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const staffCompanyAccessSuspended = useAppSelector(
    (state) => state.auth.staffCompanyAccessSuspended,
  );
  const company = useAppSelector(selectCompany);
  const companyIsActive = company?.isActive;
  const timezone = useAppSelector(selectCompanyTimezone);

  const canListEmployees =
    currentUser?.role != null &&
    CAN_LIST_EMPLOYEES_ROLES.includes(currentUser.role);

  const showActiveClientsKpi = currentUser?.role !== "EMPLOYEE";
  const kpiColClass = showActiveClientsKpi
    ? "col-12 col-md-6 col-lg-3"
    : "col-12 col-md-6 col-lg-4";

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorRetryable, setLoadErrorRetryable] = useState(true);
  const [relatedError, setRelatedError] = useState<string | null>(null);
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const loadGenerationRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const hasInitialLoadCompletedRef = useRef(false);

  const todayRange = useMemo(
    () => buildReportRange("today", timezone),
    [timezone],
  );

  const fetchSummary = useCallback(async (): Promise<DashboardSummary | null> => {
    if (!todayRange) {
      throw new Error(
        "Não foi possível calcular o período do dia no timezone da empresa.",
      );
    }

    const response = await dashboardApi.getSummary({
      startAt: todayRange.startAt,
      endAt: todayRange.endAt,
      upcomingLimit: UPCOMING_LIMIT,
    });
    return response.data ?? null;
  }, [todayRange]);

  const fetchRelatedData = useCallback(async (): Promise<FetchedRelatedData> => {
    const failures: string[] = [];
    let nextClients: Client[] = [];
    let nextServices: Service[] = [];
    let nextEmployees: Employee[] = [];

    try {
      const response = await clientsApi.getClients();
      nextClients = response.data ?? [];
    } catch (error) {
      collectRelatedFailureMessages(failures, error, companyIsActive);
    }

    try {
      const response = await servicesApi.getServices();
      nextServices = response.data ?? [];
    } catch (error) {
      collectRelatedFailureMessages(failures, error, companyIsActive);
    }

    if (canListEmployees) {
      try {
        const response = await employeesApi.getEmployees();
        nextEmployees = (response.data ?? []).filter(
          (employee) => employee.role !== "CLIENT",
        );
      } catch (error) {
        collectRelatedFailureMessages(failures, error, companyIsActive);
      }
    }

    return {
      clients: nextClients,
      services: nextServices,
      employees: nextEmployees,
      relatedError: formatRelatedFailuresMessage(
        failures,
        "Não foi possível carregar alguns nomes.",
      ),
    };
  }, [canListEmployees, companyIsActive]);

  const applyRelatedData = useCallback((related: FetchedRelatedData) => {
    setClients(related.clients);
    setServices(related.services);
    setEmployees(related.employees);
    setRelatedError(related.relatedError);
  }, []);

  const loadAll = useCallback(async () => {
    if (staffCompanyAccessSuspended) {
      return;
    }

    const generation = ++loadGenerationRef.current;
    refreshInFlightRef.current = false;
    hasInitialLoadCompletedRef.current = false;

    setIsLoading(true);
    setLoadError(null);
    setRelatedError(null);
    setRefreshWarning(null);

    try {
      const summaryData = await fetchSummary();
      if (!isMountedRef.current || generation !== loadGenerationRef.current) {
        return;
      }
      setSummary(summaryData);
    } catch (error) {
      if (!isMountedRef.current || generation !== loadGenerationRef.current) {
        return;
      }
      const presentation = getPageLoadErrorPresentation(
        getApiError(error),
        companyIsActive,
      );
      if (presentation.message) {
        setLoadError(presentation.message);
        setLoadErrorRetryable(presentation.retryable);
        setIsLoading(false);
        return;
      }
    }

    try {
      const relatedData = await fetchRelatedData();
      if (!isMountedRef.current || generation !== loadGenerationRef.current) {
        return;
      }
      applyRelatedData(relatedData);
    } catch {
      if (!isMountedRef.current || generation !== loadGenerationRef.current) {
        return;
      }
      setRelatedError("Não foi possível carregar alguns nomes.");
    }

    if (!isMountedRef.current || generation !== loadGenerationRef.current) {
      return;
    }
    setIsLoading(false);
    hasInitialLoadCompletedRef.current = true;
  }, [
    applyRelatedData,
    companyIsActive,
    fetchRelatedData,
    fetchSummary,
    staffCompanyAccessSuspended,
  ]);

  const refreshDashboard = useCallback(async () => {
    if (staffCompanyAccessSuspended) {
      return;
    }
    if (refreshInFlightRef.current) {
      return;
    }
    if (!hasInitialLoadCompletedRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    const generation = ++loadGenerationRef.current;
    setIsRefreshing(true);
    setRefreshWarning(null);

    let refreshFailed = false;

    try {
      const summaryData = await fetchSummary();
      if (!isMountedRef.current || generation !== loadGenerationRef.current) {
        return;
      }
      setSummary(summaryData);

      const relatedData = await fetchRelatedData();
      if (!isMountedRef.current || generation !== loadGenerationRef.current) {
        return;
      }
      applyRelatedData(relatedData);
    } catch {
      refreshFailed = true;
    } finally {
      if (generation === loadGenerationRef.current) {
        refreshInFlightRef.current = false;
        if (isMountedRef.current) {
          setIsRefreshing(false);
          if (refreshFailed) {
            setRefreshWarning(DASHBOARD_REFRESH_WARNING_MESSAGE);
          }
        }
      }
    }
  }, [
    applyRelatedData,
    fetchRelatedData,
    fetchSummary,
    staffCompanyAccessSuspended,
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useDashboardVisibilityRefresh({
    enabled: !staffCompanyAccessSuspended,
    isInitialLoading: isLoading,
    onRefresh: () => {
      void refreshDashboard();
    },
  });

  const clientNames = useMemo(
    () => new Map(clients.map((c) => [c.id, c.name])),
    [clients],
  );
  const serviceNames = useMemo(
    () => new Map(services.map((s) => [s.id, s.name])),
    [services],
  );
  const employeeNames = useMemo(
    () => new Map(employees.map((e) => [e.id, e.name])),
    [employees],
  );

  const todayAppointments: Appointment[] = summary?.todayAppointments ?? [];
  const upcomingAppointments: Appointment[] =
    summary?.upcomingAppointments ?? [];

  const scheduledCount = summary?.period.byStatus.scheduled ?? 0;
  const confirmedCount = summary?.period.byStatus.confirmed ?? 0;
  const activeClientsCount = summary?.activeClientsCount;

  const greeting = currentUser ? `Olá, ${currentUser.name}` : "Bem-vindo";

  const pageHeader = (
    <PageHeader
      title="Bem-vindo ao SchedulerPro"
      description={greeting}
      eyebrow="Visão geral"
      actions={
        <Link
          className="btn btn-primary"
          to="/appointments"
          data-testid="dashboard-open-agenda"
        >
          Abrir agenda
        </Link>
      }
    />
  );

  if (isLoading) {
    return (
      <section className="dashboard-page">
        {pageHeader}
        <LoadingState label="A carregar o painel…" />
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="dashboard-page">
        {pageHeader}
        <ErrorState
          message={loadError}
          onRetry={loadErrorRetryable ? () => void loadAll() : undefined}
        />
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      {pageHeader}
      {refreshWarning && (
        <div
          className="alert alert-warning mt-3"
          role="alert"
          data-testid="dashboard-refresh-warning"
        >
          {refreshWarning}
        </div>
      )}
      {relatedError && (
        <div className="alert alert-warning mt-3" role="alert">
          {relatedError}
        </div>
      )}

      <div className="dashboard-section-heading">
        <div>
          <span className="section-kicker mb-2">Operação</span>
          <h2 className="h5 mb-2">Resumo do dia</h2>
          <span className="text-muted small">
            Atualizado com os dados da sua agenda
          </span>
          {isRefreshing && (
            <span
              className="text-muted small d-block mt-1"
              data-testid="dashboard-refreshing"
            >
              <span
                className="spinner-border spinner-border-sm me-1"
                aria-hidden
              />
              A atualizar…
            </span>
          )}
        </div>
      </div>
      <div className="row g-3 dashboard-kpis">
        <div className={kpiColClass}>
          <DashboardCard
            title="Hoje"
            value={todayAppointments.length}
            icon="bi-calendar-check"
          />
        </div>
        <div className={kpiColClass}>
          <DashboardCard
            title="Pendentes"
            value={scheduledCount}
            icon="bi-clock"
          />
        </div>
        <div className={kpiColClass}>
          <DashboardCard
            title="Confirmados"
            value={confirmedCount}
            icon="bi-check-circle"
          />
        </div>
        {showActiveClientsKpi && activeClientsCount !== undefined && (
          <div className={kpiColClass}>
            <DashboardCard
              title="Clientes ativos"
              value={activeClientsCount}
              icon="bi-people"
            />
          </div>
        )}
      </div>

      {summary && <DashboardStatusDistribution period={summary.period} />}

      <div className="dashboard-agenda-grid">
        <DashboardAppointments
          appointments={todayAppointments}
          clientNames={clientNames}
          serviceNames={serviceNames}
          employeeNames={employeeNames}
          timezone={timezone}
          title="Agenda do dia"
          emptyMessage="Nenhum agendamento para hoje."
          listTestIdBase="dashboard-today-agenda"
        />
        <DashboardAppointments
          appointments={upcomingAppointments}
          clientNames={clientNames}
          serviceNames={serviceNames}
          employeeNames={employeeNames}
          timezone={timezone}
          title="Próximos agendamentos"
          emptyMessage="Nenhum agendamento próximo."
          listTestIdBase="dashboard-upcoming-agenda"
        />
      </div>
    </section>
  );
}
