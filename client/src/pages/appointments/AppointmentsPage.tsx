import { useCallback, useState } from "react";
import appointmentsApi from "../../api/endpoints/appointments.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import AppointmentForm from "../../components/appointments/AppointmentForm";
import DeleteAppointmentModal from "../../components/appointments/DeleteAppointmentModal";
import AppointmentsListView from "../../components/appointments/AppointmentsListView";
import AppointmentsViewSwitcher from "../../components/appointments/AppointmentsViewSwitcher";
import AppointmentQuickDetails from "../../components/appointments/AppointmentQuickDetails";
import CalendarView from "../../components/appointments/CalendarView";
import { getAppointmentAbilities } from "../../config/appointmentPermissions";
import { isInstantInPast } from "../../config/appointmentCalendar";
import { useAppointmentsNavigation } from "../../hooks/useAppointmentsNavigation";
import { useAppointmentsSchedule } from "../../hooks/useAppointmentsSchedule";
import { APPOINTMENT_ACTION_SUCCESS_MESSAGES } from "../../config/appointmentStatus";
import type { AppointmentStatusAction } from "../../config/appointmentStatus";
import { useAppSelector } from "../../store";
import { selectCompanyTimezone } from "../../store/slices/companySlice";
import type { Appointment } from "../../types/appointment";
import PageHeader from "../../components/common/PageHeader";
import type { EmployeeRole } from "../../types/employee";

const CAN_LIST_EMPLOYEES_ROLES: EmployeeRole[] = ["OWNER", "ADMIN", "MANAGER"];

export default function AppointmentsPage() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const timezone = useAppSelector(selectCompanyTimezone);
  const actorRole = currentUser?.role ?? null;
  const { canList, canCreate, canUpdate, canStatus, canDelete } =
    getAppointmentAbilities(actorRole);

  const canListEmployees =
    currentUser?.role != null &&
    CAN_LIST_EMPLOYEES_ROLES.includes(currentUser.role);

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

  const [prefillDate, setPrefillDate] = useState<string | undefined>(undefined);
  const [prefillTime, setPrefillTime] = useState<string | undefined>(undefined);
  const [prefillEmployeeId, setPrefillEmployeeId] = useState<
    string | undefined
  >(undefined);

  const [quickDetails, setQuickDetails] = useState<{
    appointment: Appointment;
    anchorRect: DOMRect;
  } | null>(null);

  const openCreate = useCallback(
    (date?: string, time?: string, employeeId?: string) => {
      setEditingAppointment(null);
      setFormReadOnly(false);
      setPrefillDate(date);
      setPrefillTime(time);
      setPrefillEmployeeId(employeeId);
      setFormOpen(true);
    },
    [],
  );

  const {
    viewType,
    setViewType,
    currentDateKey,
    monthFocusedDateKey,
    todayKey,
    isMobileCalendar,
    showCalendar,
    handleMonthDaySelect,
    handleCalendarDayClick,
    handleCalendarOverflowDayClick,
    handleCreateForMonthDay,
    handleCalendarSlotClick,
    periodLabel,
    handleToolbarPrev,
    handleToolbarNext,
    handleToolbarToday,
  } = useAppointmentsNavigation({
    timezone,
    onOpenCreate: openCreate,
  });

  const {
    appointments,
    clients,
    services,
    employees,
    clientNames,
    serviceNames,
    employeeNames,
    isLoading,
    loadError,
    relatedError,
    loadAppointments,
  } = useAppointmentsSchedule({
    canList,
    viewType,
    currentDateKey,
    timezone,
    actorRole,
    canListEmployees,
  });

  function nameFor(map: Map<string, string>, id: string): string {
    return map.get(id) ?? "—";
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

  function handleCalendarAppointmentClick(appointment: Appointment) {
    if (isInstantInPast(appointment.startAt)) {
      openDetails(appointment);
    } else {
      openEdit(appointment);
    }
  }

  const openQuickDetails = useCallback(
    (appointment: Appointment, anchor: HTMLElement) => {
      setQuickDetails({
        appointment,
        anchorRect: anchor.getBoundingClientRect(),
      });
    },
    [],
  );

  const closeQuickDetails = useCallback(() => {
    setQuickDetails(null);
  }, []);

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

  return (
    <section>
      <PageHeader title="Agendamentos" description="Consulte a agenda e acompanhe o estado de cada atendimento." actions={canCreate && <button type="button" className="btn btn-primary" onClick={() => openCreate()}>Novo agendamento</button>} />

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

      <AppointmentsViewSwitcher
        viewType={viewType}
        onViewTypeChange={setViewType}
        label={periodLabel}
        onPrev={handleToolbarPrev}
        onNext={handleToolbarNext}
        onToday={handleToolbarToday}
      />

      {showCalendar && (
        <div className="appointments-calendar-panel">
          <CalendarView
            appointments={appointments}
            clientNames={clientNames}
            serviceNames={serviceNames}
            viewType={viewType}
            currentDateKey={currentDateKey}
            onDayClick={handleCalendarDayClick}
            onSlotClick={handleCalendarSlotClick}
            onAppointmentClick={handleCalendarAppointmentClick}
            onTimeGridAppointmentClick={openQuickDetails}
            todayKey={todayKey}
            month={{
              monthFocusedDateKey,
              onMonthDaySelect: handleMonthDaySelect,
              onOverflowDayClick: handleCalendarOverflowDayClick,
              onCreateForDay: handleCreateForMonthDay,
              canCreate,
              isMobileViewport: isMobileCalendar,
            }}
            isLoading={isLoading}
            loadError={loadError}
            onLoadRetry={() => void loadAppointments()}
          />
        </div>
      )}

      {!showCalendar && (
        <AppointmentsListView
          isLoading={isLoading}
          loadError={loadError}
          onRetry={() => void loadAppointments()}
          appointments={appointments}
          timezone={timezone}
          clientNames={clientNames}
          serviceNames={serviceNames}
          employeeNames={employeeNames}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canStatus={canStatus}
          canDelete={canDelete}
          pendingStatusAction={pendingStatusAction}
          onCreate={() => openCreate()}
          onViewDetails={openDetails}
          onEdit={openEdit}
          onStatusAction={(appointment, action) =>
            void handleStatusAction(appointment, action)
          }
          onDeleteRequest={setDeletingAppointment}
        />
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

      {quickDetails && (
        <AppointmentQuickDetails
          appointment={quickDetails.appointment}
          clientName={nameFor(
            clientNames,
            quickDetails.appointment.clientId,
          )}
          serviceName={nameFor(
            serviceNames,
            quickDetails.appointment.serviceId,
          )}
          employeeName={employeeNames.get(quickDetails.appointment.employeeId)}
          servicePrice={services.find(
            (service) => service.id === quickDetails.appointment.serviceId,
          )?.price}
          timezone={timezone}
          anchorRect={quickDetails.anchorRect}
          isMobilePanel={isMobileCalendar}
          onClose={closeQuickDetails}
        />
      )}
    </section>
  );
}
