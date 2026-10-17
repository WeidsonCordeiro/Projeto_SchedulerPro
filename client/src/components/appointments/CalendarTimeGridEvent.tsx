import { formatAppointmentTime } from "../../config/appointmentTime";
import {
  APPOINTMENT_STATUS_CALENDAR_CLASS,
  APPOINTMENT_STATUS_LABELS,
} from "../../config/appointmentStatus";
import type { Appointment } from "../../types/appointment";

const SERVICE_VISIBLE_MIN_HEIGHT_PX = 56;

interface CalendarTimeGridEventProps {
  appointment: Appointment;
  clientName: string;
  serviceName?: string;
  timezone: string;
  heightPx: number;
}

export default function CalendarTimeGridEvent({
  appointment,
  clientName,
  serviceName,
  timezone,
  heightPx,
}: CalendarTimeGridEventProps) {
  const statusLabel = APPOINTMENT_STATUS_LABELS[appointment.status];
  const showService =
    Boolean(serviceName) && heightPx >= SERVICE_VISIBLE_MIN_HEIGHT_PX;
  const ariaLabel = `${formatAppointmentTime(appointment.startAt, timezone)}, ${clientName}, ${serviceName ?? "Serviço"}, ${statusLabel}`;

  return (
    <div
      className={`calendar-week-event h-100 overflow-hidden p-1 rounded ${APPOINTMENT_STATUS_CALENDAR_CLASS[appointment.status]}`}
      aria-label={ariaLabel}
    >
      <div className="calendar-event-time">
        {formatAppointmentTime(appointment.startAt, timezone)} –{" "}
        {formatAppointmentTime(appointment.endAt, timezone)}
      </div>
      <div className="calendar-event-client text-truncate">{clientName}</div>
      {showService && (
        <div className="calendar-event-service text-truncate">
          {serviceName}
        </div>
      )}
      <div className="calendar-event-status text-truncate">{statusLabel}</div>
    </div>
  );
}
