import type { Appointment } from "../../types/appointment";
import {
  APPOINTMENT_STATUS_BADGE_CLASS,
  APPOINTMENT_STATUS_LABELS,
} from "../../config/appointmentStatus";
import { formatAppointmentTime } from "../../config/appointmentTime";

interface Props {
  appointments: Appointment[];
  clientNames: Map<string, string>;
  serviceNames: Map<string, string>;
  employeeNames: Map<string, string>;
  timezone?: string;
  title: string;
  emptyMessage: string;
}

function nameFor(map: Map<string, string>, id: string): string {
  return map.get(id) ?? "—";
}

export default function DashboardAppointments({
  appointments,
  clientNames,
  serviceNames,
  employeeNames,
  timezone,
  title,
  emptyMessage,
}: Props) {
  return (
    <div className="card mb-4">
      <div className="card-header">
        <h2 className="h6 mb-0">{title}</h2>
      </div>
      {appointments.length === 0 ? (
        <div className="card-body text-center text-muted py-5">
          {emptyMessage}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th scope="col">Horário</th>
                <th scope="col">Cliente</th>
                <th scope="col">Serviço</th>
                <th scope="col">Profissional</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((apt) => (
                <tr key={apt.id}>
                  <td className="text-nowrap">
                    {formatAppointmentTime(apt.startAt, timezone)}
                  </td>
                  <td>{nameFor(clientNames, apt.clientId)}</td>
                  <td>{nameFor(serviceNames, apt.serviceId)}</td>
                  <td>{nameFor(employeeNames, apt.employeeId)}</td>
                  <td>
                    <span
                      className={`badge ${APPOINTMENT_STATUS_BADGE_CLASS[apt.status]}`}
                    >
                      {APPOINTMENT_STATUS_LABELS[apt.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
