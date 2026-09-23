import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";
import appointmentsApi from "../../api/endpoints/appointments.api";
import clientsApi from "../../api/endpoints/clients.api";
import servicesApi from "../../api/endpoints/services.api";
import employeesApi from "../../api/endpoints/employees.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import AppointmentForm from "../../components/appointments/AppointmentForm";
import DeleteAppointmentModal from "../../components/appointments/DeleteAppointmentModal";
import CalendarView from "../../components/appointments/CalendarView";
import { getAppointmentAbilities } from "../../config/appointmentPermissions";
import {
  getMonthGridRange,
  getWeekRange,
  getDayRange,
  isInstantInPast,
  isSlotHourInPast,
} from "../../config/appointmentCalendar";
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
import type { CalendarViewType } from "../../config/appointmentCalendar";

const CAN_LIST_EMPLOYEES_ROLES: EmployeeRole[] = ["OWNER", "ADMIN", "MANAGER"];

function canLoadNames(role: string | undefined | null): boolean {
  return Boolean(role) && role !== "CLIENT";
}

function computeRange(
  viewType: CalendarViewType,
  currentDateKey: string,
  timezone: string,
): { startAt: string; endAt: string } {
  switch (viewType) {
    case "month": {
      const dt = DateTime.fromISO(currentDateKey, { zone: timezone });
      return getMonthGridRange(dt.year, dt.month, timezone);
    }
    case "week":
      return getWeekRange(currentDateKey, timezone);
    case "day":
      return getDayRange(currentDateKey, timezone);
    case "list":
      return { startAt: "", endAt: "" };
    default:
      return { startAt: "", endAt: "" };
  }
}

export default function AppointmentsPage() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const timezone = useAppSelector(selectCompanyTimezone);
  const actorRole = currentUser?.role ?? null;
  const { canList, canCreate, canUpdate, canStatus, canDelete } =
    getAppointmentAbilities(actorRole);

  const canListEmployees =
    currentUser?.role != null &&
    CAN_LIST_EMPLOYEES_ROLES.includes(currentUser.role);

  const todayKey = useMemo(
    () => DateTime.now().setZone(timezone).toISODate() ?? "",
    [timezone],
  );

  const [viewType, setViewType] = useState<CalendarViewType>("month");
  const [currentDateKey, setCurrentDateKey] = useState(todayKey);

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
  const [formReadOnly, setFormReadOnly] = useState(false);
  const [deletingAppointment, setDeletingAppointment] =
    useState<Appointment | null>(null);

  // Prefill: dados de criação rápida a partir do calendário
  const [prefillDate, setPrefillDate] = useState<string | undefined>(undefined);
  const [prefillTime, setPrefillTime] = useState<string | undefined>(undefined);
  const [prefillEmployeeId, setPrefillEmployeeId] = useState<
    string | undefined
  >(undefined);

  const range = useMemo(
    () => computeRange(viewType, currentDateKey, timezone),
    [viewType, currentDateKey, timezone],
  );

  const requestIdRef = useRef(0);

  const loadAppointments = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const params =
        range.startAt && range.endAt
          ? { startAt: range.startAt, endAt: range.endAt }
          : undefined;
      const response = await appointmentsApi.getAppointments(params);
      if (requestId === requestIdRef.current) {
        setAppointments(response.data ?? []);
      }
    } catch (error) {
      if (requestId === requestIdRef.current) {
        const failure = getApiError(error);
        setLoadError(getFriendlyErrorMessage(failure));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [range.startAt, range.endAt]);

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
          (response.data ?? []).filter(
            (employee) => employee.role !== "CLIENT",
          ),
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
    if (!canList) return;
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

  function openCreate(date?: string, time?: string, employeeId?: string) {
    setEditingAppointment(null);
    setFormReadOnly(false);
    setPrefillDate(date);
    setPrefillTime(time);
    setPrefillEmployeeId(employeeId);
    setFormOpen(true);
  }

  function openEdit(appointment: Appointment) {
    setEditingAppointment(appointment);
    setFormReadOnly(false);
    setPrefillDate(undefined);
    setPrefillTime(undefined);
    setPrefillEmployeeId(undefined);
    setFormOpen(true);
  }

  /** Detalhes somente leitura de um agendamento histórico (startAt no passado). */
  function openDetails(appointment: Appointment) {
    setEditingAppointment(appointment);
    setFormReadOnly(true);
    setPrefillDate(undefined);
    setPrefillTime(undefined);
    setPrefillEmployeeId(undefined);
    setFormOpen(true);
  }

  function handleFormClose() {
    setFormOpen(false);
    setEditingAppointment(null);
    setFormReadOnly(false);
    setPrefillDate(undefined);
    setPrefillTime(undefined);
    setPrefillEmployeeId(undefined);
  }

  function handleSaved(_appointment: Appointment) {
    setSuccessMessage(
      editingAppointment
        ? "Agendamento atualizado com sucesso."
        : "Agendamento criado com sucesso.",
    );
    handleFormClose();
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

  function handleCalendarDayClick(dateKey: string) {
    // Dias passados seguem visíveis (consulta histórica) mas não iniciam a
    // criação de um novo agendamento.
    if (dateKey >= todayKey) {
      openCreate(dateKey);
    }
  }

  function handleCalendarSlotClick(dateKey: string, hour: number) {
    if (!isSlotHourInPast(dateKey, hour, timezone)) {
      openCreate(dateKey, `${String(hour).padStart(2, "0")}:00`);
    }
  }

  function handleCalendarAppointmentClick(appointment: Appointment) {
    if (isInstantInPast(appointment.startAt)) {
      openDetails(appointment);
    } else {
      openEdit(appointment);
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
  const showCalendar = viewType !== "list";

  return (
    <section>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">Agendamentos</h1>
        {canCreate && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openCreate()}
          >
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

      {showCalendar && (
        <CalendarView
          appointments={appointments}
          clientNames={clientNames}
          serviceNames={serviceNames}
          viewType={viewType}
          onViewTypeChange={setViewType}
          currentDateKey={currentDateKey}
          onDateChange={setCurrentDateKey}
          onDayClick={handleCalendarDayClick}
          onSlotClick={handleCalendarSlotClick}
          onAppointmentClick={handleCalendarAppointmentClick}
          todayKey={todayKey}
        />
      )}

      {/* Toolbar do calendário (também para view Lista) */}
      {!showCalendar && (
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <h2 className="h5 mb-0">Lista de agendamentos</h2>
          </div>
          <div
            className="btn-group btn-group-sm"
            role="group"
            aria-label="Visualização"
          >
            {(["month", "week", "day", "list"] as const).map((vt) => (
              <button
                key={vt}
                type="button"
                className={`btn ${viewType === vt ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setViewType(vt)}
              >
                {vt === "month"
                  ? "Mês"
                  : vt === "week"
                    ? "Semana"
                    : vt === "day"
                      ? "Dia"
                      : "Lista"}
              </button>
            ))}
          </div>
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

      {!isLoading &&
        !loadError &&
        viewType === "list" &&
        appointments.length === 0 && (
          <div className="card">
            <div className="card-body text-center py-5">
              <p className="mb-3 text-muted">Nenhum agendamento encontrado.</p>
              {canCreate && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => openCreate()}
                >
                  Cadastrar primeiro agendamento
                </button>
              )}
            </div>
          </div>
        )}

      {!isLoading &&
        !loadError &&
        viewType === "list" &&
        appointments.length > 0 && (
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
                      <td>
                        {formatAppointmentDate(appointment.startAt, timezone)}
                      </td>
                      <td>
                        {formatAppointmentTime(appointment.startAt, timezone)}
                        <div className="small text-muted">
                          até{" "}
                          {formatAppointmentTime(appointment.endAt, timezone)}
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
                            {canUpdate &&
                              (isInstantInPast(appointment.startAt) ? (
                                // Agendamento histórico: somente leitura.
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => openDetails(appointment)}
                                  disabled={pending !== null}
                                >
                                  Visualizar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => openEdit(appointment)}
                                  disabled={pending !== null}
                                >
                                  Editar
                                </button>
                              ))}
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
                                onClick={() =>
                                  setDeletingAppointment(appointment)
                                }
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

      {!isLoading &&
        !loadError &&
        viewType !== "list" &&
        appointments.length === 0 && (
          <div className="text-center py-5 text-muted">
            <p>Nenhum agendamento encontrado para este período.</p>
            {canCreate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openCreate()}
              >
                Cadastrar agendamento
              </button>
            )}
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
          initialDate={prefillDate}
          initialTime={prefillTime}
          initialEmployeeId={prefillEmployeeId}
          readOnly={formReadOnly}
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
