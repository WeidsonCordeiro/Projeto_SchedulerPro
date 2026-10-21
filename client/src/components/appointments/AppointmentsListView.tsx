import { isInstantInPast } from "../../config/appointmentCalendar";
import {
  APPOINTMENT_ACTION_LABELS,
  APPOINTMENT_STATUS_BADGE_CLASS,
  APPOINTMENT_STATUS_LABELS,
  getAppointmentStatusActions,
} from "../../config/appointmentStatus";
import type { AppointmentStatusAction } from "../../config/appointmentStatus";
import {
  formatAppointmentDate,
  formatAppointmentTime,
} from "../../config/appointmentTime";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import LoadingState from "../common/LoadingState";
import type { Appointment } from "../../types/appointment";

export interface AppointmentsListViewProps {
  isLoading: boolean;
  loadError: string | null;
  onRetry: () => void;
  appointments: Appointment[];
  timezone: string;
  clientNames: Map<string, string>;
  serviceNames: Map<string, string>;
  employeeNames: Map<string, string>;
  canCreate: boolean;
  canUpdate: boolean;
  canStatus: boolean;
  canDelete: boolean;
  pendingStatusAction: { id: string; action: AppointmentStatusAction } | null;
  onCreate: () => void;
  onViewDetails: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
  onStatusAction: (appointment: Appointment, action: AppointmentStatusAction) => void;
  onDeleteRequest: (appointment: Appointment) => void;
}

function nameFor(map: Map<string, string>, id: string): string {
  return map.get(id) ?? "—";
}

export default function AppointmentsListView({
  isLoading,
  loadError,
  onRetry,
  appointments,
  timezone,
  clientNames,
  serviceNames,
  employeeNames,
  canCreate,
  canUpdate,
  canStatus,
  canDelete,
  pendingStatusAction,
  onCreate,
  onViewDetails,
  onEdit,
  onStatusAction,
  onDeleteRequest,
}: AppointmentsListViewProps) {
  const hasActions = canUpdate || canStatus || canDelete;

  if (isLoading) {
    return <LoadingState label="A carregar agendamentos…" />;
  }

  if (loadError) {
    return <ErrorState message={loadError} onRetry={onRetry} />;
  }

  if (appointments.length === 0) {
    return (
      <EmptyState
        title="Nenhum agendamento encontrado"
        description="Crie o primeiro agendamento para começar a organizar a agenda."
        action={
          canCreate && (
            <button type="button" className="btn btn-primary" onClick={onCreate}>
              Cadastrar primeiro agendamento
            </button>
          )
        }
      />
    );
  }

  return (
    <div className="card table-card">
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
                    <span className="table-subline">
                      até {formatAppointmentTime(appointment.endAt, timezone)}
                    </span>
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
                      <div className="table-actions">
                        {canUpdate &&
                          (isInstantInPast(appointment.startAt) ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => onViewDetails(appointment)}
                              disabled={pending !== null}
                            >
                              Visualizar
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => onEdit(appointment)}
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
                            onClick={() => onStatusAction(appointment, action)}
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
                            onClick={() => onDeleteRequest(appointment)}
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
    </div>
  );
}
