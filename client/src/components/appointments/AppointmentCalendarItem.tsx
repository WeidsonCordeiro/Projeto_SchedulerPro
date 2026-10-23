import { useAppSelector } from "../../store";
import { selectCompanyTimezone } from "../../store/slices/companySlice";
import { formatAppointmentTime } from "../../config/appointmentTime";
import { APPOINTMENT_STATUS_LABELS } from "../../config/appointmentStatus";
import {
  APPOINTMENT_STATUS_STRIPE_CLASS,
  getServiceCalendarStyle,
  isTerminalAppointmentStatus,
} from "../../config/appointmentServiceColor";
import type { Appointment } from "../../types/appointment";

interface AppointmentCalendarItemProps {
  appointment: Appointment;
  clientName?: string;
  serviceName?: string;
  onClick: () => void;
}

export default function AppointmentCalendarItem({ appointment, clientName, serviceName, onClick }: AppointmentCalendarItemProps) {
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
      className={`calendar-item btn btn-sm w-100 text-start p-1 mb-1 border-0 calendar-status-stripe ${APPOINTMENT_STATUS_STRIPE_CLASS[appointment.status]}${muted ? " calendar-event--muted" : ""}`}
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
      <span className="calendar-item-time d-block">{timeLabel}</span>
      <span className="calendar-item-client text-truncate d-block">{clientLabel}</span>
      <span className="calendar-item-service text-truncate d-block">{serviceLabel}</span>
      <span className="calendar-item-status text-truncate d-block">{statusLabel}</span>
    </button>
  );
}
