import { useAppSelector } from "../../store";
import { selectCompanyTimezone } from "../../store/slices/companySlice";
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

interface AppointmentCalendarItemProps {
  appointment: Appointment;
  clientName?: string;
  serviceName?: string;
  /** Lista diária mobile: mostrar rótulo de estado visível (grelha mês usa só texto oculto). */
  showStatusText?: boolean;
  onClick: () => void;
}

export default function AppointmentCalendarItem({
  appointment,
  clientName,
  serviceName,
  showStatusText = false,
  onClick,
}: AppointmentCalendarItemProps) {
  const timezone = useAppSelector(selectCompanyTimezone);
  const timeLabel = formatAppointmentTime(appointment.startAt, timezone);
  const clientLabel = clientName ?? "—";
  const serviceLabel = serviceName ?? "Serviço";
  const statusLabel = APPOINTMENT_STATUS_LABELS[appointment.status];
  const ariaLabel = `${timeLabel}, ${clientLabel}, ${serviceLabel}, ${statusLabel}`;
  const serviceStyle = getServiceCalendarStyle(appointment.serviceId);
  const muted = isTerminalAppointmentStatus(appointment.status);

  return (
    <button
      type="button"
      className={`calendar-item ${APPOINTMENT_CALENDAR_EVENT_SURFACE_CLASS} btn btn-sm w-100 text-start mb-1 border-0${muted ? " calendar-event--muted" : ""}`}
      style={{
        backgroundColor: serviceStyle.backgroundColor,
        color: serviceStyle.color,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      title={`${clientLabel} — ${serviceLabel}`}
      aria-label={ariaLabel}
    >
      <AppointmentCalendarEventBody
        timeLabel={timeLabel}
        clientLabel={clientLabel}
        serviceLabel={serviceLabel}
        statusLabel={statusLabel}
        showStatusText={showStatusText}
      />
    </button>
  );
}
