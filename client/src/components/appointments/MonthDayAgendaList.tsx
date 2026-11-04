import { useMemo } from "react";
import { appointmentsForDay } from "../../config/appointmentCalendar";
import { formatWeekdayDate } from "../../config/appointmentTime";
import { useAppSelector } from "../../store";
import { selectCompanyTimezone } from "../../store/slices/companySlice";
import AppointmentCalendarItem from "./AppointmentCalendarItem";
import EmptyState from "../common/EmptyState";
import type { Appointment } from "../../types/appointment";

interface MonthDayAgendaListProps {
  dateKey: string;
  appointments: Appointment[];
  clientNames: Map<string, string>;
  serviceNames: Map<string, string>;
  todayKey: string;
  canCreate: boolean;
  onAppointmentClick: (appointment: Appointment) => void;
  onCreateForDay: (dateKey: string) => void;
}

export default function MonthDayAgendaList({
  dateKey,
  appointments,
  clientNames,
  serviceNames,
  todayKey,
  canCreate,
  onAppointmentClick,
  onCreateForDay,
}: MonthDayAgendaListProps) {
  const timezone = useAppSelector(selectCompanyTimezone);
  const headingId = "month-day-agenda-heading";

  const dayAppointments = useMemo(() => {
    const list = appointmentsForDay(appointments, dateKey, timezone);
    return [...list].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  }, [appointments, dateKey, timezone]);

  const showCreateAction = canCreate && dateKey >= todayKey;

  return (
    <section
      id="month-day-agenda-panel"
      className="month-day-agenda-list"
      aria-labelledby={headingId}
    >
      <div className="month-day-agenda-list-header d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h2 className="h6 mb-0" id={headingId}>
          {formatWeekdayDate(dateKey, timezone)}
        </h2>
        {showCreateAction && (
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => onCreateForDay(dateKey)}
          >
            Agendar neste dia
          </button>
        )}
      </div>

      {dayAppointments.length === 0 ? (
        <EmptyState
          title="Sem marcações neste dia"
          description="Selecione outro dia na grelha ou crie um novo agendamento."
        />
      ) : (
        <div className="month-day-agenda-list-items">
          {dayAppointments.map((appt) => (
            <AppointmentCalendarItem
              key={appt.id}
              appointment={appt}
              clientName={clientNames.get(appt.clientId)}
              serviceName={serviceNames.get(appt.serviceId)}
              showStatusText
              onClick={() => onAppointmentClick(appt)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
