import { useCallback, useEffect, useMemo, useState } from "react";
import appointmentsApi from "../../api/endpoints/appointments.api";
import clientsApi from "../../api/endpoints/clients.api";
import servicesApi from "../../api/endpoints/services.api";
import employeesApi from "../../api/endpoints/employees.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import { formatAppointmentDate } from "../../config/appointmentTime";
import { useAppSelector } from "../../store";
import { selectCompanyTimezone } from "../../store/slices/companySlice";
import type { Appointment, AppointmentStatus } from "../../types/appointment";
import type { Client } from "../../types/client";
import type { Service } from "../../types/service";
import type { Employee, EmployeeRole } from "../../types/employee";
import DashboardCard from "./DashboardCard";
import DashboardAppointments from "./DashboardAppointments";
import { DateTime } from "luxon";

/**
 * Apenas OWNER e ADMIN possuem USER_READ (server/src/constants/rbac.ts), a
 * permissão exigida por GET /users. As demais roles não conseguem carregar a
 * lista de funcionários; nesses casos o card de Funcionários não é exibido.
 */
const CAN_LIST_EMPLOYEES_ROLES: EmployeeRole[] = ["OWNER", "ADMIN"];

const UPCOMING_STATUSES: AppointmentStatus[] = ["scheduled", "confirmed"];
const MAX_UPCOMING = 5;

export default function DashboardPage() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const timezone = useAppSelector(selectCompanyTimezone);

  const canListEmployees =
    currentUser?.role != null &&
    CAN_LIST_EMPLOYEES_ROLES.includes(currentUser.role);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [relatedError, setRelatedError] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    const response = await appointmentsApi.getAppointments();
    setAppointments(response.data ?? []);
  }, []);

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
      failures.push(getFriendlyErrorMessage(getApiError(error)));
    }

    try {
      await loadServices();
    } catch (error) {
      failures.push(getFriendlyErrorMessage(getApiError(error)));
    }

    if (canListEmployees) {
      try {
        await loadEmployees();
      } catch (error) {
        failures.push(getFriendlyErrorMessage(getApiError(error)));
      }
    }

    setRelatedError(
      failures.length > 0
        ? `Não foi possível carregar alguns nomes. ${failures.join(" ")}`
        : null,
    );
  }, [loadClients, loadServices, loadEmployees, canListEmployees]);

  useEffect(() => {
    async function loadAll() {
      setIsLoading(true);
      setLoadError(null);
      setRelatedError(null);

      try {
        await loadAppointments();
      } catch (error) {
        setLoadError(getFriendlyErrorMessage(getApiError(error)));
        setIsLoading(false);
        return;
      }

      void loadRelated();
      setIsLoading(false);
    }

    void loadAll();
  }, [loadAppointments, loadRelated]);

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

  const todayKey = useMemo(
    () => formatAppointmentDate(DateTime.now().toISO(), timezone),
    [timezone],
  );

  const todayAppointments = useMemo(
    () =>
      appointments.filter(
        (apt) => formatAppointmentDate(apt.startAt, timezone) === todayKey,
      ),
    [appointments, timezone, todayKey],
  );

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter(
          (apt) =>
            UPCOMING_STATUSES.includes(apt.status) &&
            new Date(apt.startAt).getTime() > Date.now(),
        )
        .slice(0, MAX_UPCOMING),
    [appointments],
  );

  if (isLoading) {
    return (
      <section>
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section>
        <div className="alert alert-danger" role="alert">
          {loadError}
          <div className="mt-2">
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => window.location.reload()}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </section>
    );
  }

  const greeting = currentUser ? `Olá, ${currentUser.name}` : "Bem-vindo";

  return (
    <section>
      <h1 className="h3 mb-1">Bem-vindo ao SchedulerPro</h1>
      {currentUser && <p className="text-muted">{greeting}</p>}

      {relatedError && (
        <div className="alert alert-warning mt-3" role="alert">
          {relatedError}
        </div>
      )}

      <h2 className="h5 mt-4 mb-3">Resumo</h2>
      <div className="row g-3">
        <div className="col-6 col-md-4 col-lg-2">
          <DashboardCard
            title="Hoje"
            value={todayAppointments.length}
            icon="bi-calendar-check"
          />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <DashboardCard
            title="Pendentes"
            value={
              appointments.filter((a) => a.status === "scheduled").length
            }
            icon="bi-clock"
          />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <DashboardCard
            title="Confirmados"
            value={
              appointments.filter((a) => a.status === "confirmed").length
            }
            icon="bi-check-circle"
          />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <DashboardCard title="Clientes" value={clients.length} icon="bi-people" />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <DashboardCard
            title="Serviços"
            value={services.length}
            icon="bi-gear"
          />
        </div>
        {canListEmployees && (
          <div className="col-6 col-md-4 col-lg-2">
            <DashboardCard
              title="Funcionários"
              value={employees.length}
              icon="bi-person-badge"
            />
          </div>
        )}
      </div>

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
    </section>
  );
}