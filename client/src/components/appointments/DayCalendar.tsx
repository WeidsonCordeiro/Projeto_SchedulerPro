import { useCallback, useMemo } from "react";
import { DateTime } from "luxon";
import {
  appointmentsForDay,
  computeDayLayout,
  computeDayHourRange,
  isSlotHourInPast,
} from "../../config/appointmentCalendar";
import { formatAppointmentTime, formatWeekdayDate } from "../../config/appointmentTime";
import { useAppSelector } from "../../store";
import { selectCompanyTimezone } from "../../store/slices/companySlice";
import type { Appointment } from "../../types/appointment";

/**
 * Calendário diário: eixo de horas + agendamentos posicionados.
 */
interface DayCalendarProps {
  currentDateKey: string;
  appointments: Appointment[];
  clientNames: Map<string, string>;
  serviceNames: Map<string, string>;
  onAppointmentClick: (appointment: Appointment) => void;
  onSlotClick: (dateKey: string, hour: number) => void;
  /** Data de hoje no calendário local da empresa ("AAAA-MM-DD"). */
  todayKey?: string;
}

const HOUR_HEIGHT = 48;

export default function DayCalendar({
  currentDateKey,
  appointments,
  clientNames,
  serviceNames,
  onAppointmentClick,
  onSlotClick,
  todayKey,
}: DayCalendarProps) {
  const timezone = useAppSelector(selectCompanyTimezone);
  const todayKeyInternal = useMemo(
    () => todayKey ?? (DateTime.now().setZone(timezone).toISODate() ?? ""),
    [todayKey, timezone],
  );
  const isToday = currentDateKey === todayKeyInternal;

  const dayAppts = useMemo(
    () => appointmentsForDay(appointments, currentDateKey, timezone),
    [appointments, currentDateKey, timezone],
  );

  const hourRange = useMemo(
    () => computeDayHourRange(dayAppts, timezone),
    [dayAppts, timezone],
  );

  const layout = useMemo(
    () =>
      computeDayLayout(
        dayAppts,
        timezone,
        hourRange.startHour * 60,
        hourRange.endHour * 60,
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
    (hour: number) => {
      onSlotClick(currentDateKey, hour);
    },
    [currentDateKey, onSlotClick],
  );

  return (
    <div className="day-calendar">
      <div className={`text-center py-2 border-bottom ${isToday ? "bg-primary-subtle" : ""}`}>
        <div className="fw-semibold">{formatWeekdayDate(currentDateKey, timezone)}</div>
      </div>

      <div className="d-flex overflow-auto" style={{ position: "relative" }}>
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

        {/* Day column */}
        <div
          className={`flex-grow-1 border-start ${isToday ? "bg-primary-subtle" : ""}`}
          style={{ position: "relative" }}
        >
          {/* Hour grid lines */}
          {hours.map((h) => (
            <div
              key={h}
              className="border-bottom day-slot"
              style={{
                height: HOUR_HEIGHT,
                cursor: isSlotHourInPast(currentDateKey, h, timezone)
                  ? "default"
                  : "pointer",
              }}
              onClick={() => {
                if (!isSlotHourInPast(currentDateKey, h, timezone)) {
                  handleSlotClick(h);
                }
              }}
              role={isSlotHourInPast(currentDateKey, h, timezone) ? undefined : "button"}
              aria-disabled={isSlotHourInPast(currentDateKey, h, timezone) || undefined}
              tabIndex={isSlotHourInPast(currentDateKey, h, timezone) ? -1 : 0}
            />
          ))}

          {/* Appointment blocks */}
          {layout.map((item) => {
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
                  left: 0,
                  width: `${Math.min(100 / item.totalColumns, 95)}%`,
                  height: heightPx,
                  zIndex: 10,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onAppointmentClick(item.appointment);
                }}
                role="button"
              >
                <div className="h-100 overflow-hidden p-2 small bg-primary bg-opacity-75 text-white rounded">
                  <div className="fw-semibold">
                    {formatAppointmentTime(item.appointment.startAt, timezone)} –{" "}
                    {formatAppointmentTime(item.appointment.endAt, timezone)}
                  </div>
                  <div className="text-truncate">
                    {clientNames.get(item.appointment.clientId) ?? "Cliente"} —{" "}
                    {serviceNames.get(item.appointment.serviceId) ?? "Serviço"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
