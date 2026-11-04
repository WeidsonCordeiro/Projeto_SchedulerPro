import { formatAppointmentTime } from "../../config/appointmentTime";
import { APPOINTMENT_STATUS_LABELS } from "../../config/appointmentStatus";
import {
  getServiceCalendarStyle,
  isTerminalAppointmentStatus,
} from "../../config/appointmentServiceColor";
import type { Appointment } from "../../types/appointment";
import AppointmentCalendarEventBody, {
  APPOINTMENT_CALENDAR_EVENT_SURFACE_CLASS,
} from "./AppointmentCalendarEventBody";

/** Status visível só em blocos altos (≥72px; com 120px/hora, 1h ≈ 120px). Mês usa só texto oculto. */
export const TIME_GRID_STATUS_TEXT_MIN_PX = 72;

export function shouldShowTimeGridStatusText(heightPx: number): boolean {
  return heightPx >= TIME_GRID_STATUS_TEXT_MIN_PX;
}

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
  const timeLabel = formatAppointmentTime(appointment.startAt, timezone);
  const clientLabel = clientName;
  const serviceLabel = serviceName ?? "Serviço";
  const title = `${timeLabel}, ${clientLabel}, ${serviceLabel}, ${statusLabel}`;
  const ariaLabel = title;
  const serviceStyle = getServiceCalendarStyle(appointment.serviceId);
  const muted = isTerminalAppointmentStatus(appointment.status);
  const showStatusText = shouldShowTimeGridStatusText(heightPx);

  return (
    <div
      className={`calendar-item ${APPOINTMENT_CALENDAR_EVENT_SURFACE_CLASS} h-100 w-100 overflow-hidden border-0${muted ? " calendar-event--muted" : ""}`}
      style={{
        backgroundColor: serviceStyle.backgroundColor,
        color: serviceStyle.color,
      }}
      aria-label={ariaLabel}
      title={title}
    >
      <AppointmentCalendarEventBody
        timeLabel={timeLabel}
        clientLabel={clientLabel}
        serviceLabel={serviceLabel}
        statusLabel={statusLabel}
        showStatusText={showStatusText}
      />
    </div>
  );
}
