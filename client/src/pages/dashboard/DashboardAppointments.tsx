import { useState } from "react";
import type { Appointment } from "../../types/appointment";
import {
  APPOINTMENT_STATUS_BADGE_CLASS,
  APPOINTMENT_STATUS_LABELS,
} from "../../config/appointmentStatus";
import {
  formatAppointmentTime,
  formatAppointmentDate,
} from "../../config/appointmentTime";

interface Props {
  appointments: Appointment[];
  clientNames: Map<string, string>;
  serviceNames: Map<string, string>;
  employeeNames: Map<string, string>;
  timezone?: string;
  title: string;
  emptyMessage: string;
  listTestIdBase: string;
}

function nameFor(map: Map<string, string>, id: string): string {
  return map.get(id) ?? "—";
}

interface AppointmentDisplay {
  id: string;
  dateLabel: string;
  timeLabel: string;
  clientLabel: string;
  serviceLabel: string;
  employeeLabel: string;
  statusLabel: string;
  statusBadgeClass: string;
}

function buildAppointmentDisplay(
  apt: Appointment,
  clientNames: Map<string, string>,
  serviceNames: Map<string, string>,
  employeeNames: Map<string, string>,
  timezone?: string,
): AppointmentDisplay {
  return {
    id: apt.id,
    dateLabel: formatAppointmentDate(apt.startAt, timezone),
    timeLabel: formatAppointmentTime(apt.startAt, timezone),
    clientLabel: nameFor(clientNames, apt.clientId),
    serviceLabel: nameFor(serviceNames, apt.serviceId),
    employeeLabel: nameFor(employeeNames, apt.employeeId),
    statusLabel: APPOINTMENT_STATUS_LABELS[apt.status],
    statusBadgeClass: APPOINTMENT_STATUS_BADGE_CLASS[apt.status],
  };
}

function AppointmentTable({
  rows,
}: {
  rows: AppointmentDisplay[];
}) {
  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0 dashboard-table">
        <colgroup>
          <col style={{ width: "13%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "31%" }} />
          <col style={{ width: "19%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "11%" }} />
        </colgroup>
        <thead className="table-light">
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Horário</th>
            <th scope="col">Cliente</th>
            <th scope="col">Serviço</th>
            <th scope="col">Profissional</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="text-nowrap">{row.dateLabel}</td>
              <td className="text-nowrap">{row.timeLabel}</td>
              <td>{row.clientLabel}</td>
              <td>{row.serviceLabel}</td>
              <td>{row.employeeLabel}</td>
              <td>
                <span
                  className={`badge status-badge-80 ${row.statusBadgeClass}`}
                >
                  {row.statusLabel}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AppointmentMobileList({
  rows,
  listTestIdBase,
}: {
  rows: AppointmentDisplay[];
  listTestIdBase: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  return (
    <div
      className="dashboard-appointment-mobile-list"
      data-testid={`${listTestIdBase}-mobile-scroll`}
    >
      {rows.map((row) => {
        const isExpanded = expandedId === row.id;
        const panelId = `${listTestIdBase}-panel-${row.id}`;

        return (
          <div key={row.id} className="dashboard-appointment-mobile-item">
            <button
              type="button"
              className="dashboard-appointment-mobile-row"
              aria-expanded={isExpanded}
              aria-controls={panelId}
              onClick={() => toggleRow(row.id)}
            >
              <div className="dashboard-appointment-mobile-primary">
                <span className="dashboard-appointment-mobile-time">
                  {row.timeLabel}
                </span>
                <span className="dashboard-appointment-mobile-client">
                  {row.clientLabel}
                </span>
              </div>
              <div className="dashboard-appointment-mobile-meta">
                <span className={`badge ${row.statusBadgeClass}`}>
                  {row.statusLabel}
                </span>
                <span
                  className={`dashboard-appointment-mobile-chevron bi ${
                    isExpanded ? "bi-chevron-up" : "bi-chevron-down"
                  }`}
                  aria-hidden
                />
              </div>
            </button>
            <div
              id={panelId}
              className="dashboard-appointment-mobile-panel"
              hidden={!isExpanded}
            >
              <dl>
                <dt>Dia</dt>
                <dd>{row.dateLabel}</dd>
                <dt>Serviço</dt>
                <dd>{row.serviceLabel}</dd>
                <dt>Profissional</dt>
                <dd>{row.employeeLabel}</dd>
              </dl>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardAppointments({
  appointments,
  clientNames,
  serviceNames,
  employeeNames,
  timezone,
  title,
  emptyMessage,
  listTestIdBase,
}: Props) {
  const rows = appointments.map((apt) =>
    buildAppointmentDisplay(
      apt,
      clientNames,
      serviceNames,
      employeeNames,
      timezone,
    ),
  );

  return (
    <div className="card dashboard-agenda-card table-card mb-4">
      <div className="card-header">
        <h2 className="h6 mb-0">{title}</h2>
        {appointments.length > 0 && (
          <span className="dashboard-agenda-count">{appointments.length}</span>
        )}
      </div>
      {appointments.length === 0 ? (
        <div className="card-body text-center text-muted py-5">
          {emptyMessage}
        </div>
      ) : (
        <>
          <div
            className="d-none d-md-block"
            data-testid={`${listTestIdBase}-desktop`}
          >
            <AppointmentTable rows={rows} />
          </div>
          <div
            className="entity-list-mobile d-md-none mt-3 px-3 pb-3"
            data-testid={`${listTestIdBase}-mobile`}
          >
            <AppointmentMobileList rows={rows} listTestIdBase={listTestIdBase} />
          </div>
        </>
      )}
    </div>
  );
}
