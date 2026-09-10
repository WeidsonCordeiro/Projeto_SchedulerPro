import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import { buildMonthGrid, WEEKDAYS_SHORT } from "../../config/appointmentCalendar";
import { hasAvailabilityOnDay } from "../../config/appointmentSlots";
import { formatMonthYear } from "../../config/appointmentTime";
import { APPOINTMENT_TIMEZONE } from "../../config/appointmentTime";
import type { Availability } from "../../types/availability";

/**
 * Janela de navegação do calendário: hoje ± 12 meses, garantindo que a edição
 * de um agendamento antigo (selecionado na data original) continue acessível
 * mesmo fora dessa janela. Regra de apresentação (UX) para impedir navegação
 * infinita; o backend não possui restrição de datas passadas/futuras.
 */
const MONTH_NAVIGATION_RANGE = 12;

interface AppointmentCalendarProps {
  availability: Availability[];
  selectedDate: string | null;
  onSelectDay: (dateKey: string) => void;
  timezone?: string;
}

export default function AppointmentCalendar({
  availability,
  selectedDate,
  onSelectDay,
  timezone = APPOINTMENT_TIMEZONE,
}: AppointmentCalendarProps) {
  const today = useMemo(
    () => DateTime.now().setZone(timezone).startOf("month"),
    [timezone],
  );

  const boundaries = useMemo(() => {
    const selectedMonth = selectedDate
      ? DateTime.fromISO(selectedDate, { zone: timezone }).startOf("month")
      : null;
    const min = today.minus({ months: MONTH_NAVIGATION_RANGE });
    const max = today.plus({ months: MONTH_NAVIGATION_RANGE });
    return {
      min: selectedMonth && selectedMonth < min ? selectedMonth : min,
      max: selectedMonth && selectedMonth > max ? selectedMonth : max,
    };
  }, [today, selectedDate, timezone]);

  const [viewMonth, setViewMonth] = useState<DateTime>(() => {
    const initial = selectedDate
      ? DateTime.fromISO(selectedDate, { zone: timezone }).startOf("month")
      : today;
    return initial.isValid ? initial : today;
  });

  const cells = useMemo(
    () => buildMonthGrid(viewMonth.year, viewMonth.month, timezone),
    [viewMonth, timezone],
  );

  const goToMonth = (offset: number) => {
    const next = viewMonth.plus({ months: offset }).startOf("month");
    if (next < boundaries.min || next > boundaries.max) {
      return;
    }
    setViewMonth(next);
  };

  const atMinMonth = viewMonth <= boundaries.min;
  const atMaxMonth = viewMonth >= boundaries.max;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          aria-label="Mês anterior"
          disabled={atMinMonth}
          onClick={() => goToMonth(-1)}
        >
          ‹
        </button>
        <span className="fw-semibold" aria-live="polite">
          {formatMonthYear(viewMonth.year, viewMonth.month, timezone)}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          aria-label="Próximo mês"
          disabled={atMaxMonth}
          onClick={() => goToMonth(1)}
        >
          ›
        </button>
      </div>

      <div className="calendar-grid">
        <div className="row g-0 text-center small text-muted border-bottom pb-1 mb-1">
          {WEEKDAYS_SHORT.map((weekday) => (
            <div className="col" key={weekday}>
              <span className="visually-hidden">
                {weekday === "Sáb" ? "sábado" : weekday === "Dom" ? "domingo" : ""}
              </span>
              {weekday}
            </div>
          ))}
        </div>

        {Array.from({ length: 7 }, (_, weekIndex) => (
          <div className="row g-1" key={weekIndex}>
            {cells.slice(weekIndex * 7, weekIndex * 7 + 7).map((cell) => {
              const isAvailable =
                cell.isCurrentMonth &&
                hasAvailabilityOnDay(availability, cell.date, timezone);
              const isSelected = cell.date === selectedDate;
              return (
                <div className="col" key={cell.date}>
                  <button
                    type="button"
                    className={`calendar-day w-100 btn btn-sm ${
                      isSelected
                        ? "btn-primary"
                        : isAvailable
                          ? "btn-outline-success"
                          : "btn-outline-secondary text-muted"
                    }`}
                    aria-label={cell.date}
                    aria-pressed={isSelected}
                    aria-current={cell.isToday ? "date" : undefined}
                    disabled={!isAvailable}
                    onClick={() => onSelectDay(cell.date)}
                  >
                    {cell.dayOfMonth}
                  </button>
                </div>
              );
            })}
          </div>
        ))}

        <div className="small text-muted mt-2 calendar-legend">
          <span className="me-3">
            <span aria-hidden="true" className="text-success">
              ●
            </span>{" "}
            Disponível
          </span>
          <span>
            <span aria-hidden="true" className="text-secondary">
              ●
            </span>{" "}
            Sem expediente
          </span>
        </div>
      </div>
    </div>
  );
}