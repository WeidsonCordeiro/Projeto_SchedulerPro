import { useCallback, useMemo, type KeyboardEvent, type MouseEvent } from "react";
import {
  buildMonthGrid,
  WEEKDAYS_SHORT,
  appointmentsForDay,
} from "../../config/appointmentCalendar";
import { formatWeekdayDate } from "../../config/appointmentTime";
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
  onOverflowClick: (dateKey: string) => void;
  onMonthDaySelect: (dateKey: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  selectedDateKey?: string;
  layoutMode?: "default" | "compact";
  todayKey?: string;
  className?: string;
}

const MAX_VISIBLE_ITEMS = 4;

export default function MonthCalendar({
  year,
  month,
  appointments,
  clientNames,
  serviceNames,
  onDayClick,
  onOverflowClick,
  onMonthDaySelect,
  onAppointmentClick,
  selectedDateKey,
  layoutMode = "default",
  todayKey,
  className,
}: MonthCalendarProps) {
  const timezone = useAppSelector(selectCompanyTimezone);
  const isCompact = layoutMode === "compact";

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

  const handleMonthDaySelect = useCallback(
    (dateKey: string) => {
      onMonthDaySelect(dateKey);
    },
    [onMonthDaySelect],
  );

  const handleOverflowActivate = useCallback(
    (dateKey: string, event: MouseEvent | KeyboardEvent) => {
      event.stopPropagation();
      onOverflowClick(dateKey);
    },
    [onOverflowClick],
  );

  const activateCell = useCallback(
    (dateKey: string, isPastDay: boolean) => {
      if (isCompact) {
        handleMonthDaySelect(dateKey);
        return;
      }
      if (!isPastDay) {
        handleDayClick(dateKey);
      }
    },
    [isCompact, handleMonthDaySelect, handleDayClick],
  );

  const rootClassName = ["month-calendar", className].filter(Boolean).join(" ");

  return (
    <div className={rootClassName}>
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
          const isPastDay = Boolean(todayKey && cell.date < todayKey);
          const isSelected = selectedDateKey === cell.date;
          const hasEvents = dayAppts.length > 0;

          return (
            <div
              key={cell.date}
              className={`col border-end border-bottom p-1 calendar-day-cell ${cell.isCurrentMonth ? "" : "bg-light text-muted"} ${cell.isToday ? "bg-primary-subtle today" : ""} ${isPastDay ? "calendar-day-cell-past" : ""} ${hasEvents ? "calendar-day-has-events" : ""} ${isSelected ? "calendar-day-cell-selected" : ""}`}
              style={{
                minHeight: 90,
                cursor: isCompact || !isPastDay ? "pointer" : "default",
              }}
              onClick={() => activateCell(cell.date, isPastDay)}
              role="button"
              aria-disabled={!isCompact && isPastDay ? true : undefined}
              aria-selected={isCompact ? isSelected : undefined}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  activateCell(cell.date, isPastDay);
                }
              }}
            >
              <span
                className={`calendar-day-number small fw-semibold ${cell.isToday ? "today" : ""}`}
              >
                {cell.dayOfMonth}
              </span>

              {isCompact && hasEvents && (
                <span
                  className="calendar-day-event-count"
                  aria-label={`${dayAppts.length} marcações`}
                >
                  {dayAppts.length}
                </span>
              )}

              {!isCompact &&
                dayAppts.slice(0, MAX_VISIBLE_ITEMS).map((appt) => (
                  <AppointmentCalendarItem
                    key={appt.id}
                    appointment={appt}
                    clientName={clientNames.get(appt.clientId)}
                    serviceName={serviceNames.get(appt.serviceId)}
                    onClick={() => onAppointmentClick(appt)}
                  />
                ))}

              {overflow > 0 && (
                <button
                  type="button"
                  className="calendar-overflow"
                  aria-label={`Ver todas as marcações de ${formatWeekdayDate(cell.date, timezone)}`}
                  title={`+${overflow} mais`}
                  onClick={(e) => handleOverflowActivate(cell.date, e)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOverflowActivate(cell.date, e);
                    }
                  }}
                >
                  <span aria-hidden="true">+</span>
                  {overflow} mais <span aria-hidden="true">›</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
