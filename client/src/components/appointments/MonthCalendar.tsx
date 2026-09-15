import { useCallback, useMemo } from "react";
import {
  buildMonthGrid,
  WEEKDAYS_SHORT,
  appointmentsForDay,
} from "../../config/appointmentCalendar";
import { formatMonthYear } from "../../config/appointmentTime";
import { useAppSelector } from "../../store";
import { selectCompanyTimezone } from "../../store/slices/companySlice";
import AppointmentCalendarItem from "./AppointmentCalendarItem";
import type { Appointment } from "../../types/appointment";

/**
 * Calendário mensal: grade 7x6 com indicadores de agendamento por dia.
 */
interface MonthCalendarProps {
  year: number;
  month: number;
  appointments: Appointment[];
  clientNames: Map<string, string>;
  serviceNames: Map<string, string>;
  onDayClick: (dateKey: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  todayKey?: string;
}

const MAX_VISIBLE_ITEMS = 4;

export default function MonthCalendar({
  year,
  month,
  appointments,
  clientNames,
  serviceNames,
  onDayClick,
  onAppointmentClick,
  todayKey,
}: MonthCalendarProps) {
  const timezone = useAppSelector(selectCompanyTimezone);

  const cells = useMemo(
    () => buildMonthGrid(year, month, timezone),
    [year, month, timezone],
  );

  const handleDayClick = useCallback(
    (dateKey: string) => {
      onDayClick(dateKey);
    },
    [onDayClick],
  );

  return (
    <div className="month-calendar">
      <h2 className="h5 mb-3 d-sm-none">
        {formatMonthYear(year, month, timezone)}
      </h2>

      <div className="row g-0 border-bottom">
        {WEEKDAYS_SHORT.map((day) => (
          <div key={day} className="col text-center py-2 fw-semibold small border-end last-border-0 text-muted">
            {day}
          </div>
        ))}
      </div>

      <div className="row g-0">
        {cells.map((cell) => {
          const dayAppts = appointmentsForDay(appointments, cell.date, timezone);
          const overflow = dayAppts.length - MAX_VISIBLE_ITEMS;
          // Dias anteriores a hoje seguem visíveis (consulta histórica) mas não
          // permitem iniciar a criação de um novo agendamento.
          const isPastDay = Boolean(todayKey && cell.date < todayKey);

          return (
            <div
              key={cell.date}
              className={`col border-end border-bottom p-1 calendar-day-cell ${cell.isCurrentMonth ? "" : "bg-light text-muted"} ${cell.isToday ? "bg-primary-subtle" : ""} ${isPastDay ? "calendar-day-cell-past" : ""}`}
              style={{ minHeight: 90, cursor: isPastDay ? "default" : "pointer" }}
              onClick={() => {
                if (!isPastDay) {
                  handleDayClick(cell.date);
                }
              }}
              role="button"
              aria-disabled={isPastDay || undefined}
              tabIndex={0}
              onKeyDown={(e) => {
                if (!isPastDay && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleDayClick(cell.date);
                }
              }}
            >
              <span
                className={`d-inline-block small fw-semibold ${cell.isToday ? "badge bg-primary rounded-circle" : ""}`}
                style={cell.isToday ? { width: 26, height: 26, lineHeight: "26px" } : {}}
              >
                {cell.dayOfMonth}
              </span>

              {dayAppts.slice(0, MAX_VISIBLE_ITEMS).map((appt) => (
                <AppointmentCalendarItem
                  key={appt.id}
                  appointment={appt}
                  clientName={clientNames.get(appt.clientId)}
                  serviceName={serviceNames.get(appt.serviceId)}
                  onClick={() => onAppointmentClick(appt)}
                />
              ))}

              {overflow > 0 && (
                <div className="small text-muted text-center">
                  +{overflow} mais
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
