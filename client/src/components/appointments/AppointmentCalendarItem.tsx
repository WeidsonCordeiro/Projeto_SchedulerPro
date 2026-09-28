import { useAppSelector } from "../../store";
import { selectCompanyTimezone } from "../../store/slices/companySlice";
import { formatAppointmentTime } from "../../config/appointmentTime";
import type { Appointment } from "../../types/appointment";

interface AppointmentCalendarItemProps {
  appointment: Appointment;
  clientName?: string;
  serviceName?: string;
  onClick: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  scheduled: "status-scheduled", confirmed: "status-confirmed", completed: "status-completed", cancelled: "status-cancelled", "no-show": "status-no-show",
};

export default function AppointmentCalendarItem({ appointment, clientName, serviceName, onClick }: AppointmentCalendarItemProps) {
  const timezone = useAppSelector(selectCompanyTimezone);
  return (
    <button type="button" className={`calendar-item btn btn-sm w-100 text-start p-1 mb-1 border-0 ${STATUS_BADGE[appointment.status] ?? "status-default"}`} onClick={(event) => { event.stopPropagation(); onClick(); }} title={`${clientName ?? "Cliente"} — ${serviceName ?? "Serviço"}`}>
      <span className="calendar-item-time d-block">{formatAppointmentTime(appointment.startAt, timezone)}</span>
      <span className="calendar-item-client text-truncate d-block">{clientName ?? "—"}</span>
      <span className="calendar-item-service text-truncate d-block">{serviceName ?? "Serviço"}</span>
    </button>
  );
}
