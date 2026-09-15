import { useCallback, useMemo } from "react";
import { DateTime } from "luxon";
import {
  getWeekDayKeys,
  appointmentsForDay,
  computeDayLayout,
  computeDayHourRange,
  isSlotHourInPast,
  WEEKDAYS_SHORT,
} from "../../config/appointmentCalendar";
import { formatAppointmentTime } from "../../config/appointmentTime";
import { useAppSelector } from "../../store";
import { selectCompanyTimezone } from "../../store/slices/companySlice";
import type { Appointment } from "../../types/appointment";

/**
 * Calendário semanal: eixo de horas + colunas de agendamento lado a lado.
 */
interface WeekCalendarProps {
  currentDateKey: string;
  appointments: Appointment[];
  clientNames: Map<string, string>;
  onDayClick: (dateKey: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onSlotClick: (dateKey: string, hour: number) => void;
  /** Data de hoje no calendário local da empresa ("AAAA-MM-DD"). */
  todayKey?: string;
}

const HOUR_HEIGHT = 48;

export default function WeekCalendar({
  currentDateKey,
  appointments,
  clientNames,
  onDayClick,
  onAppointmentClick,
  onSlotClick,
  todayKey,
}: WeekCalendarProps) {
  const timezone = useAppSelector(selectCompanyTimezone);
  const todayKeyInternal = useMemo(
    () => todayKey ?? (DateTime.now().setZone(timezone).toISODate() ?? ""),
    [todayKey, timezone],
  );
  const dayKeys = useMemo(
    () => getWeekDayKeys(currentDateKey, timezone),
    [currentDateKey, timezone],
  );

  const dayAppts = useMemo(
    () => dayKeys.map((k) => appointmentsForDay(appointments, k, timezone)),
    [dayKeys, appointments, timezone],
  );

  const hourRange = useMemo(
    () => computeDayHourRange(appointments, timezone),
    [appointments, timezone],
  );

  const layoutPerDay = useMemo(
    () =>
      dayAppts.map((appts) =>
        computeDayLayout(appts, timezone, hourRange.startHour * 60, hourRange.endHour * 60),
      ),
    [dayAppts, timezone, hourRange],
  );

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let h = hourRange.startHour; h < hourRange.endHour; h++) {
      list.push(h);
    }
    return list;
  }, [hourRange]);

  const handleSlotClick = useCallback(
    (dateKey: string, hour: number) => {
      // Horários que já passaram não iniciam a criação; agendamentos do
      // passado na mesma trilha continuam visíveis (clique abre leitura).
      onSlotClick(dateKey, hour);
    },
    [onSlotClick],
  );

  return (
    <div className="week-calendar d-flex flex-column" style={{ position: "relative" }}>
      {/* Header: day labels */}
      <div className="d-flex border-bottom">
        <div style={{ width: 56, flexShrink: 0 }} />
        {dayKeys.map((dk, idx) => {
          const dt = DateTime.fromISO(dk, { zone: timezone });
          const isToday = dk === todayKeyInternal;
          return (
            <div
              key={dk}
              className={`flex-fill text-center py-2 border-start ${isToday ? "bg-primary-subtle fw-bold" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={() => onDayClick(dk)}
            >
              <div className="small text-muted">{WEEKDAYS_SHORT[idx]}</div>
              <div className={`small ${isToday ? "badge bg-primary rounded-circle" : ""}`}>
                {dt.day}
              </div>
            </div>
          );
        })}
      </div>

      {/* Body: time axis + columns */}
      <div className="d-flex flex-grow-1 overflow-auto" style={{ position: "relative" }}>
        {/* Time axis */}
        <div style={{ width: 56, flexShrink: 0 }}>
          {hours.map((h) => (
            <div
              key={h}
              className="text-end pe-2 text-muted small"
              style={{ height: HOUR_HEIGHT }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {dayKeys.map((dk, dayIdx) => {
          const layout = layoutPerDay[dayIdx];
          const isToday = dk === todayKey;

          return (
            <div
              key={dk}
              className={`flex-fill border-start ${isToday ? "bg-primary-subtle" : ""}`}
              style={{ position: "relative" }}
            >
              {/* Hour grid lines */}
              {hours.map((h) => (
                <div
                  key={h}
                  className="border-bottom week-slot"
                  style={{
                    height: HOUR_HEIGHT,
                    cursor: isSlotHourInPast(dk, h, timezone)
                      ? "default"
                      : "pointer",
                  }}
                  onClick={() => {
                    if (!isSlotHourInPast(dk, h, timezone)) {
                      handleSlotClick(dk, h);
                    }
                  }}
                  role={isSlotHourInPast(dk, h, timezone) ? undefined : "button"}
                  aria-disabled={isSlotHourInPast(dk, h, timezone) || undefined}
                  tabIndex={isSlotHourInPast(dk, h, timezone) ? -1 : 0}
                />
              ))}

              {/* Appointment blocks */}
              {layout.map((item) => {
                const colWidth = 100 / item.totalColumns;
                const left = item.column * colWidth;
                const topPx = (item.topPercent / 100) * (hours.length * HOUR_HEIGHT);
                const heightPx = Math.max(
                  (item.heightPercent / 100) * (hours.length * HOUR_HEIGHT),
                  24,
                );

                return (
                  <div
                    key={item.appointment.id}
                    className="position-absolute rounded border"
                    style={{
                      top: topPx,
                      left: `${left}%`,
                      width: `${colWidth}%`,
                      height: heightPx,
                      zIndex: 10,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick(item.appointment);
                    }}
                    role="button"
                  >
                    <div className="h-100 overflow-hidden p-1 small bg-primary bg-opacity-75 text-white rounded">
                      <div className="fw-semibold">
                        {formatAppointmentTime(item.appointment.startAt, timezone)} –{" "}
                        {formatAppointmentTime(item.appointment.endAt, timezone)}
                      </div>
                      <div className="text-truncate">
                        {clientNames.get(item.appointment.clientId) ?? "Cliente"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
