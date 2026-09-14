import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import { buildMonthGrid, WEEKDAYS_SHORT } from "../../config/appointmentCalendar";
import { hasAvailabilityOnDay } from "../../config/appointmentSlots";
import { formatMonthYear } from "../../config/appointmentTime";
import { APPOINTMENT_TIMEZONE } from "../../config/appointmentTime";
import type { Availability } from "../../types/availability";
import type { AvailabilityException } from "../../types/availabilityException";

/**
 * Janela de navegação do calendário: hoje ± 12 meses, garantindo que a edição
 * de um agendamento antigo (selecionado na data original) continue acessível
 * mesmo fora dessa janela. Regra de apresentação (UX) para impedir navegação
 * infinita; o backend não possui restrição de datas passadas/futuras.
 */
const MONTH_NAVIGATION_RANGE = 12;

interface AppointmentCalendarProps {
  availability: Availability[];
  /** Exceções de disponibilidade do funcionário (bloqueios/férias/feriados). */
  exceptions?: AvailabilityException[];
  selectedDate: string | null;
  onSelectDay: (dateKey: string) => void;
  timezone?: string;
  /**
   * Data mínima navegável/selecionável ("AAAA-MM-DD"), usada no fluxo de
   * criação para não oferecer/abrir dias passados. Quando informada, o
   * calendário não navega para meses anteriores ao mês desta data e desabilita
   * os dias anteriores a ela (sem mexer no comportamento de edição, que não
   * informa esta prop e continua permitindo abrir agendamentos antigos).
   */
  minDate?: string;
}

export default function AppointmentCalendar({
  availability,
  exceptions = [],
  selectedDate,
  onSelectDay,
  timezone = APPOINTMENT_TIMEZONE,
  minDate,
}: AppointmentCalendarProps) {
  const today = useMemo(
    () => DateTime.now().setZone(timezone).startOf("month"),
    [timezone],
  );

  const boundaries = useMemo(() => {
    const selectedMonth = selectedDate
      ? DateTime.fromISO(selectedDate, { zone: timezone }).startOf("month")
      : null;

    // No fluxo de criação (minDate informado), o mês mínimo é o mês da data
    // mínima (hoje): não se navega para meses anteriores.
    const minDateMonth = minDate
      ? DateTime.fromISO(minDate, { zone: timezone }).startOf("month")
      : null;
    const minByRange = today.minus({ months: MONTH_NAVIGATION_RANGE });

    // Edição de agendamento antigo: só alarga o mínimo para ATRÁS quando o mês
    // selecionado é anterior ao mínimo de navegação (não se mexe no fluxo de
    // criação, que usa minDate).
    const minCandidates = [minByRange];
    if (selectedMonth && selectedMonth < minByRange) {
      minCandidates.push(selectedMonth);
    }
    if (minDateMonth) {
      minCandidates.push(minDateMonth);
    }

    const max = today.plus({ months: MONTH_NAVIGATION_RANGE });
    return {
      min: DateTime.max(...minCandidates) ?? minByRange,
      max: selectedMonth && selectedMonth > max ? selectedMonth : max,
    };
  }, [today, selectedDate, minDate, timezone]);

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
                hasAvailabilityOnDay(availability, cell.date, timezone, exceptions);
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