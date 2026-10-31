import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useAppSelector } from "../../store";
import { selectCompany, selectCompanyTimezone } from "../../store/slices/companySlice";
import type { Appointment } from "../../types/appointment";
import type { Client } from "../../types/client";
import type { Service } from "../../types/service";
import type { Employee, EmployeeRole } from "../../types/employee";
import type { DashboardSummary } from "../../types/dashboard";
import DashboardCard from "../../components/common/DashboardCard";
import DashboardAppointments from "./DashboardAppointments";
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

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorRetryable, setLoadErrorRetryable] = useState(true);
  const [relatedError, setRelatedError] = useState<string | null>(null);

  const todayRange = useMemo(
    () => buildReportRange("today", timezone),
    [timezone],
  );

  const loadSummary = useCallback(async () => {
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
    setSummary(response.data ?? null);
  }, [todayRange]);

  const loadClients = useCallback(async () => {
    const response = await clientsApi.getClients();
    setClients(response.data ?? []);
  }, []);

  const loadServices = useCallback(async () => {
    const response = await servicesApi.getServices();
    setServices(response.data ?? []);
  }, []);

  const loadEmployees = useCallback(async () => {
    const response = await employeesApi.getEmployees();
    setEmployees(
      (response.data ?? []).filter((employee) => employee.role !== "CLIENT"),
    );
  }, []);

  const loadRelated = useCallback(async () => {
    const failures: string[] = [];

    try {
      await loadClients();
    } catch (error) {
      collectRelatedFailureMessages(failures, error, companyIsActive);
    }

    try {
      await loadServices();
    } catch (error) {
      collectRelatedFailureMessages(failures, error, companyIsActive);
    }

    if (canListEmployees) {
      try {
        await loadEmployees();
      } catch (error) {
        collectRelatedFailureMessages(failures, error, companyIsActive);
      }
    }

    setRelatedError(
      formatRelatedFailuresMessage(
        failures,
        "Não foi possível carregar alguns nomes.",
      ),
    );
  }, [loadClients, loadServices, loadEmployees, canListEmployees, companyIsActive]);

  const loadAll = useCallback(async () => {
    if (staffCompanyAccessSuspended) {
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    setRelatedError(null);

    try {
      await loadSummary();
    } catch (error) {
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

    await loadRelated();
    setIsLoading(false);
  }, [loadSummary, loadRelated, staffCompanyAccessSuspended, companyIsActive]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

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

  const greeting = currentUser ? `Olá, ${currentUser.name}` : "Bem-vindo";

  const pageHeader = (
    <PageHeader
      title="Bem-vindo ao SchedulerPro"
      description={greeting}
      eyebrow="Visão geral"
      actions={
        <Link className="btn btn-primary" to="/appointments">
          Abrir agenda
        </Link>
      }
    />
  );

  if (isLoading) {
    return (
      <section>
        {pageHeader}
        <LoadingState label="A carregar o painel…" />
      </section>
    );
  }

  if (loadError) {
    return (
      <section>
        {pageHeader}
        <ErrorState
          message={loadError}
          onRetry={loadErrorRetryable ? () => void loadAll() : undefined}
        />
      </section>
    );
  }

  return (
    <section>
      {pageHeader}
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
        </div>
      </div>
      <div className="row g-3 dashboard-kpis">
        <div className="col-12 col-md-4">
          <DashboardCard
            title="Hoje"
            value={todayAppointments.length}
            icon="bi-calendar-check"
          />
        </div>
        <div className="col-12 col-md-4">
          <DashboardCard
            title="Pendentes"
            value={scheduledCount}
            icon="bi-clock"
          />
        </div>
        <div className="col-12 col-md-4">
          <DashboardCard
            title="Confirmados"
            value={confirmedCount}
            icon="bi-check-circle"
          />
        </div>
      </div>

      <div className="dashboard-agenda-grid">
        <DashboardAppointments
          appointments={todayAppointments}
          clientNames={clientNames}
          serviceNames={serviceNames}
          employeeNames={employeeNames}
          timezone={timezone}
          title="Agenda do dia"
          emptyMessage="Nenhum agendamento para hoje."
        />
        <DashboardAppointments
          appointments={upcomingAppointments}
          clientNames={clientNames}
          serviceNames={serviceNames}
          employeeNames={employeeNames}
          timezone={timezone}
          title="Próximos agendamentos"
          emptyMessage="Nenhum agendamento próximo."
        />
      </div>
    </section>
  );
}
