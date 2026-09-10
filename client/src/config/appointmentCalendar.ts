import { DateTime } from "luxon";
import { APPOINTMENT_TIMEZONE } from "./appointmentTime";

/**
 * Grade mensal do calendário da agenda inteligente, em semanas de Segunda a
 * Domingo, com 6 linhas (42 células) incluindo dias de meses adjacentes
 * (exibidos atenuados e não selecionáveis pelo componente).
 *
 * Funções puras/isoláveis para facilitar os testes unitários.
 */

export interface CalendarDayCell {
  /** Data no calendário local da empresa ("AAAA-MM-DD"). */
  date: string;
  dayOfMonth: number;
  /** true quando o dia pertence ao mês em exibição. */
  isCurrentMonth: boolean;
  isToday: boolean;
}

export const WEEKDAYS_SHORT = [
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
  "Dom",
];

export function buildMonthGrid(
  year: number,
  month: number,
  timezone: string = APPOINTMENT_TIMEZONE,
  todayKey?: string,
): CalendarDayCell[] {
  const monthStart = DateTime.fromObject({ year, month, day: 1 }, { zone: timezone });
  if (!monthStart.isValid) {
    return [];
  }

  // Segunda-feira da primeira semana do mês (Luxon: weekday 1 = segunda).
  const gridStart = monthStart.minus({ days: monthStart.weekday - 1 });
  const referenceToday =
    todayKey ?? DateTime.now().setZone(timezone).toISODate();

  const cells: CalendarDayCell[] = [];
  for (let index = 0; index < 42; index += 1) {
    const day = gridStart.plus({ days: index });
    cells.push({
      date: day.toISODate() ?? "",
      dayOfMonth: day.day,
      isCurrentMonth: day.month === month,
      isToday: (day.toISODate() ?? "") === referenceToday,
    });
  }
  return cells;
}