import { useMemo } from "react";
import { DateTime } from "luxon";
import {
  appointmentsForDay,
  getWeekDayKeys,
} from "../../config/appointmentCalendar";
import { formatWeekdayDate } from "../../config/appointmentTime";
import { useAppSelector } from "../../store";
import { selectCompanyTimezone } from "../../store/slices/companySlice";
import AppointmentCalendarItem from "./AppointmentCalendarItem";
import EmptyState from "../common/EmptyState";
import type { Appointment } from "../../types/appointment";

export interface WeekMobileAgendaProps {
  currentDateKey: string;
  appointments: Appointment[];
  clientNames: Map<string, string>;
  serviceNames: Map<string, string>;
  todayKey: string;
  canCreate: boolean;
  onAppointmentClick: (appointment: Appointment) => void;
  onCreateForDay: (dateKey: string) => void;
}

export default function WeekMobileAgenda({
  currentDateKey,
  appointments,
  clientNames,
  serviceNames,
  todayKey,
  canCreate,
  onAppointmentClick,
  onCreateForDay,
}: WeekMobileAgendaProps) {
  const timezone = useAppSelector(selectCompanyTimezone);
  const todayKeyResolved = useMemo(
    () => todayKey || (DateTime.now().setZone(timezone).toISODate() ?? ""),
    [todayKey, timezone],
  );

  const dayKeys = useMemo(
    () => getWeekDayKeys(currentDateKey, timezone),
    [currentDateKey, timezone],
  );

  const daySections = useMemo(
    () =>
      dayKeys.map((dateKey) => {
        const list = appointmentsForDay(appointments, dateKey, timezone);
        const sorted = [...list].sort(
          (a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        );
        return { dateKey, appointments: sorted };
      }),
    [dayKeys, appointments, timezone],
  );

  return (
    <div className="week-mobile-agenda" data-testid="week-mobile-agenda">
      {daySections.map(({ dateKey, appointments: dayAppointments }) => {
        const isToday = dateKey === todayKeyResolved;
        const showCreateAction = canCreate && dateKey >= todayKeyResolved;
        const headingId = `week-mobile-day-${dateKey}`;

        return (
          <section
            key={dateKey}
            className={`week-mobile-agenda-day${isToday ? " week-mobile-agenda-day--today" : ""}`}
            aria-labelledby={headingId}
            data-date-key={dateKey}
          >
            <div className="week-mobile-agenda-day-header d-flex flex-wrap align-items-center justify-content-between gap-2">
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
                description="Utilize o botão acima para criar um agendamento ou escolha outro dia da semana."
              />
            ) : (
              <div className="week-mobile-agenda-day-items">
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
      })}
    </div>
  );
}
