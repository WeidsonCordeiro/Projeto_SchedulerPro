import { useCallback, useEffect, useMemo, useState } from "react";
import appointmentsApi from "../../api/endpoints/appointments.api";
import clientsApi from "../../api/endpoints/clients.api";
import servicesApi from "../../api/endpoints/services.api";
import employeesApi from "../../api/endpoints/employees.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import AppointmentForm from "../../components/appointments/AppointmentForm";
import DeleteAppointmentModal from "../../components/appointments/DeleteAppointmentModal";
import { getAppointmentAbilities } from "../../config/appointmentPermissions";
import {
  APPOINTMENT_ACTION_LABELS,
  APPOINTMENT_ACTION_SUCCESS_MESSAGES,
  APPOINTMENT_STATUS_BADGE_CLASS,
  APPOINTMENT_STATUS_LABELS,
  getAppointmentStatusActions,
} from "../../config/appointmentStatus";
import type { AppointmentStatusAction } from "../../config/appointmentStatus";
import {
  formatAppointmentDate,
  formatAppointmentTime,
} from "../../config/appointmentTime";
import { useAppSelector } from "../../store";
import { selectCompanyTimezone } from "../../store/slices/companySlice";
import type { Appointment } from "../../types/appointment";
import type { Client } from "../../types/client";
import type { Service } from "../../types/service";
import type { Employee, EmployeeRole } from "../../types/employee";

/**
 * Apenas OWNER e ADMIN possuem USER_READ (server/src/constants/rbac.ts), a
 * permissão exigida por GET /users. As demais roles não conseguem carregar a
 * lista de funcionários; nesses casos o funcionário é exibido como "—".
 */
const CAN_LIST_EMPLOYEES_ROLES: EmployeeRole[] = ["OWNER", "ADMIN"];

/**
 * Todos, exceto CLIENT (que só possui APPOINTMENT_READ), conseguem carregar
 * Clients e Services para exibir os nomes referenciados pelos agendamentos.
 */
function canLoadNames(role: string | undefined | null): boolean {
  return Boolean(role) && role !== "CLIENT";
}

export default function AppointmentsPage() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const timezone = useAppSelector(selectCompanyTimezone);
  const actorRole = currentUser?.role ?? null;
  const { canList, canCreate, canUpdate, canStatus, canDelete } =
    getAppointmentAbilities(actorRole);

  const canListEmployees =
    currentUser?.role != null && CAN_LIST_EMPLOYEES_ROLES.includes(currentUser.role);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [relatedError, setRelatedError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingStatusAction, setPendingStatusAction] = useState<{
    id: string;
    action: AppointmentStatusAction;
  } | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);
  const [deletingAppointment, setDeletingAppointment] =
    useState<Appointment | null>(null);

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await appointmentsApi.getAppointments();
      setAppointments(response.data ?? []);
    } catch (error) {
      const failure = getApiError(error);
      setLoadError(getFriendlyErrorMessage(failure));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadRelated = useCallback(async () => {
    const failures: string[] = [];

    if (canLoadNames(actorRole)) {
      try {
        const response = await clientsApi.getClients();
        setClients(response.data ?? []);
      } catch (error) {
        failures.push(getFriendlyErrorMessage(getApiError(error)));
      }
    }

    if (canLoadNames(actorRole)) {
      try {
        const response = await servicesApi.getServices();
        setServices(response.data ?? []);
      } catch (error) {
        failures.push(getFriendlyErrorMessage(getApiError(error)));
      }
    }

    if (canListEmployees) {
      try {
        const response = await employeesApi.getEmployees();
        setEmployees(
          (response.data ?? []).filter((employee) => employee.role !== "CLIENT"),
        );
      } catch (error) {
        failures.push(getFriendlyErrorMessage(getApiError(error)));
      }
    }

    setRelatedError(
      failures.length > 0
        ? `Não foi possível carregar alguns nomes. ${failures.join(" ")}`
        : null,
    );
  }, [actorRole, canListEmployees]);

  useEffect(() => {
    if (!canList) {
      return;
    }
    void loadAppointments();
    void loadRelated();
  }, [canList, loadAppointments, loadRelated]);

  const clientNames = useMemo(
    () => new Map(clients.map((client) => [client.id, client.name])),
    [clients],
  );
  const serviceNames = useMemo(
    () => new Map(services.map((service) => [service.id, service.name])),
    [services],
  );
  const employeeNames = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee.name])),
    [employees],
  );

  function nameFor(map: Map<string, string>, id: string): string {
    return map.get(id) ?? "—";
  }

  function openCreate() {
    setEditingAppointment(null);
    setFormOpen(true);
  }

  function openEdit(appointment: Appointment) {
    setEditingAppointment(appointment);
    setFormOpen(true);
  }

  function handleFormClose() {
    setFormOpen(false);
    setEditingAppointment(null);
  }

  function handleSaved(_appointment: Appointment) {
    setSuccessMessage(
      editingAppointment
        ? "Agendamento atualizado com sucesso."
        : "Agendamento criado com sucesso.",
    );
    setFormOpen(false);
    setEditingAppointment(null);
    void loadAppointments();
  }

  function handleDeleted() {
    setSuccessMessage("Agendamento removido com sucesso.");
    setDeletingAppointment(null);
    void loadAppointments();
  }

  async function handleStatusAction(
    appointment: Appointment,
    action: AppointmentStatusAction,
  ) {
    setActionError(null);
    setPendingStatusAction({ id: appointment.id, action });
    try {
      switch (action) {
        case "confirm":
          await appointmentsApi.confirmAppointment(appointment.id);
          break;
        case "complete":
          await appointmentsApi.completeAppointment(appointment.id);
          break;
        case "cancel":
          await appointmentsApi.cancelAppointment(appointment.id);
          break;
        case "no-show":
          await appointmentsApi.markAppointmentAsNoShow(appointment.id);
          break;
      }
      setSuccessMessage(APPOINTMENT_ACTION_SUCCESS_MESSAGES[action]);
      void loadAppointments();
    } catch (error) {
      const failure = getApiError(error);
      setActionError(getFriendlyErrorMessage(failure));
    } finally {
      setPendingStatusAction(null);
    }
  }

  if (!canList) {
    return (
      <section>
        <div className="mb-3">
          <h1 className="h3 mb-0">Agendamentos</h1>
        </div>
        <div className="alert alert-warning" role="alert">
          Você não tem permissão para acessar esta página.
        </div>
      </section>
    );
  }

  const hasActions = canUpdate || canStatus || canDelete;

  return (
    <section>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">Agendamentos</h1>
        {canCreate && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Novo agendamento
          </button>
        )}
      </div>

      {successMessage && (
        <div className="alert alert-success" role="alert">
          {successMessage}
        </div>
      )}

      {actionError && (
        <div className="alert alert-danger" role="alert">
          {actionError}
        </div>
      )}

      {relatedError && (
        <div className="alert alert-warning" role="alert">
          {relatedError}
        </div>
      )}

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
              onClick={() => void loadAppointments()}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {!isLoading && !loadError && appointments.length === 0 && (
        <div className="card">
          <div className="card-body text-center py-5">
            <p className="mb-3 text-muted">Nenhum agendamento encontrado.</p>
            {canCreate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={openCreate}
              >
                Cadastrar primeiro agendamento
              </button>
            )}
          </div>
        </div>
      )}

      {!isLoading && !loadError && appointments.length > 0 && (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Hora</th>
                <th scope="col">Cliente</th>
                <th scope="col">Serviço</th>
                <th scope="col">Funcionário</th>
                <th scope="col">Status</th>
                <th scope="col">Observações</th>
                {hasActions && <th scope="col">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => {
                const statusActions = canStatus
                  ? getAppointmentStatusActions(appointment.status)
                  : [];
                const pending =
                  pendingStatusAction?.id === appointment.id
                    ? pendingStatusAction.action
                    : null;

                return (
                  <tr key={appointment.id}>
                    <td>{formatAppointmentDate(appointment.startAt, timezone)}</td>
                    <td>
                      {formatAppointmentTime(appointment.startAt, timezone)}
                      <div className="small text-muted">
                        até {formatAppointmentTime(appointment.endAt, timezone)}
                      </div>
                    </td>
                    <td>{nameFor(clientNames, appointment.clientId)}</td>
                    <td>{nameFor(serviceNames, appointment.serviceId)}</td>
                    <td>{nameFor(employeeNames, appointment.employeeId)}</td>
                    <td>
                      <span
                        className={`badge ${APPOINTMENT_STATUS_BADGE_CLASS[appointment.status]}`}
                      >
                        {APPOINTMENT_STATUS_LABELS[appointment.status]}
                      </span>
                    </td>
                    <td>{appointment.notes || "—"}</td>
                    {hasActions && (
                      <td>
                        <div className="d-flex flex-wrap gap-2">
                          {canUpdate && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openEdit(appointment)}
                              disabled={pending !== null}
                            >
                              Editar
                            </button>
                          )}
                          {statusActions.map((action) => (
                            <button
                              key={action}
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() =>
                                void handleStatusAction(appointment, action)
                              }
                              disabled={pending !== null}
                            >
                              {pending === action
                                ? "Aguarde..."
                                : APPOINTMENT_ACTION_LABELS[action]}
                            </button>
                          ))}
                          {canDelete && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => setDeletingAppointment(appointment)}
                              disabled={pending !== null}
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <AppointmentForm
          isOpen
          appointment={editingAppointment}
          clients={clients}
          services={services}
          employees={employees}
          appointments={appointments}
          onClose={handleFormClose}
          onSaved={handleSaved}
          onConflict={() => void loadAppointments()}
          timezone={timezone}
        />
      )}

      {deletingAppointment && (
        <DeleteAppointmentModal
          isOpen
          appointment={deletingAppointment}
          clientName={nameFor(clientNames, deletingAppointment.clientId)}
          onClose={() => setDeletingAppointment(null)}
          onDeleted={handleDeleted}
        />
      )}
    </section>
  );
}