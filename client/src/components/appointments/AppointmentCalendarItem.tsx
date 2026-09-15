import { useAppSelector } from "../../store";
import { selectCompanyTimezone } from "../../store/slices/companySlice";
import { formatAppointmentTime } from "../../config/appointmentTime";
import type { Appointment } from "../../types/appointment";

/**
 * Indicador visual de um agendamento na célula de um dia (vista mensal).
 * Mostra hora + status como badge e abre o formulário de edição ao clicar.
 */
interface AppointmentCalendarItemProps {
  appointment: Appointment;
  clientName?: string;
  serviceName?: string;
  onClick: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-primary",
  confirmed: "bg-success",
  completed: "bg-secondary",
  cancelled: "bg-danger",
  "no-show": "bg-warning text-dark",
};

export default function AppointmentCalendarItem({
  appointment,
  clientName,
  serviceName,
  onClick,
}: AppointmentCalendarItemProps) {
  const timezone = useAppSelector(selectCompanyTimezone);

  return (
    <button
      type="button"
      className={`calendar-item btn btn-sm w-100 text-start p-1 mb-1 border-0 ${STATUS_BADGE[appointment.status] ?? "bg-light"}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={`${clientName ?? "Cliente"} — ${serviceName ?? "Serviço"}`}
    >
      <span className="text-truncate d-block text-white small">
        {formatAppointmentTime(appointment.startAt, timezone)}{" "}
        {clientName ?? "—"}
      </span>
    </button>
  );
}
