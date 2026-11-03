import { useMemo } from "react";
import { DateTime } from "luxon";
import {
  appointmentsForDay,
  computeDayHourRange,
  isSlotHourInPast,
} from "../../config/appointmentCalendar";
import { formatWeekdayDate } from "../../config/appointmentTime";
import { useAppSelector } from "../../store";
import { selectCompanyTimezone } from "../../store/slices/companySlice";
import AppointmentCalendarItem from "./AppointmentCalendarItem";
import EmptyState from "../common/EmptyState";
import type { Appointment } from "../../types/appointment";

export interface DayMobileAgendaProps {
  currentDateKey: string;
  appointments: Appointment[];
  clientNames: Map<string, string>;
  serviceNames: Map<string, string>;
  todayKey: string;
  canCreate: boolean;
  onAppointmentClick: (appointment: Appointment) => void;
  onSlotClick: (dateKey: string, hour: number) => void;
}

export default function DayMobileAgenda({
  currentDateKey,
  appointments,
  clientNames,
  serviceNames,
  todayKey,
  canCreate,
  onAppointmentClick,
  onSlotClick,
}: DayMobileAgendaProps) {
  const timezone = useAppSelector(selectCompanyTimezone);
  const todayKeyResolved = useMemo(
    () => todayKey || (DateTime.now().setZone(timezone).toISODate() ?? ""),
    [todayKey, timezone],
  );

  const dayAppointments = useMemo(() => {
    const list = appointmentsForDay(appointments, currentDateKey, timezone);
    return [...list].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  }, [appointments, currentDateKey, timezone]);

  const hourRange = useMemo(
    () => computeDayHourRange(dayAppointments, timezone),
    [dayAppointments, timezone],
  );

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let h = hourRange.startHour; h < hourRange.endHour; h++) {
      list.push(h);
    }
    return list;
  }, [hourRange]);

  const showHourSection = canCreate && currentDateKey >= todayKeyResolved;

  return (
    <div className="day-mobile-agenda" data-testid="day-mobile-agenda">
      <div className="day-mobile-agenda-header">
        <h2 className="h6 mb-0">{formatWeekdayDate(currentDateKey, timezone)}</h2>
      </div>

      <div className="day-mobile-agenda-appointments">
        {dayAppointments.length === 0 ? (
          <EmptyState
            title="Sem marcações neste dia"
            description={
              showHourSection
                ? "Escolha um horário abaixo para criar um agendamento."
                : "Não existem agendamentos para este dia."
            }
          />
        ) : (
          dayAppointments.map((appt) => (
            <AppointmentCalendarItem
              key={appt.id}
              appointment={appt}
              clientName={clientNames.get(appt.clientId)}
              serviceName={serviceNames.get(appt.serviceId)}
              showStatusText
              onClick={() => onAppointmentClick(appt)}
            />
          ))
        )}
      </div>

      {showHourSection && (
        <div className="day-mobile-agenda-hours">
          <div className="day-mobile-agenda-hours-title">Horários</div>
          {hours.map((hour) => {
            const past = isSlotHourInPast(currentDateKey, hour, timezone);
            const label = `${String(hour).padStart(2, "0")}:00`;

            if (past) {
              return (
                <div
                  key={hour}
                  className="day-mobile-hour-slot btn btn-sm btn-outline-secondary disabled opacity-50"
                  aria-disabled="true"
                  data-hour={hour}
                >
                  {label}
                </div>
              );
            }

            return (
              <button
                key={hour}
                type="button"
                className="day-mobile-hour-slot btn btn-sm btn-outline-primary"
                data-hour={hour}
                onClick={() => onSlotClick(currentDateKey, hour)}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
