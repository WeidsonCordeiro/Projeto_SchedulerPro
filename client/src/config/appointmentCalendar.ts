import { DateTime } from "luxon";
import { APPOINTMENT_TIMEZONE } from "./appointmentTime";
import type { Appointment } from "../types/appointment";

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

export type CalendarViewType = "month" | "week" | "day" | "list";

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

/* ------------------------------------------------------------------ */
/*  Janela de tempo (ranges)                                          */
/* ------------------------------------------------------------------ */

export interface CalendarRange {
  startAt: string;
  endAt: string;
}

/**
 * Informa se um instante ISO 8601 já passou (startAt <= agora), na mesma
 * régua usada pelo backend (APPOINTMENT_START_IN_PAST). Recebe um instante de
 * referência opcional ("nowISO") para testes; quando omitido usa DateTime.now().
 */
export function isInstantInPast(startAt: string, nowISO?: string): boolean {
  const start = DateTime.fromISO(startAt);
  if (!start.isValid) {
    return false;
  }
  const now = nowISO ? DateTime.fromISO(nowISO) : DateTime.now();
  return start <= now;
}

/**
 * Informa se o intervalo "dateKey HH:00" (hora cheia, como as células dos
 * calendários Semana/Dia) já passou. Usa o fuso local da empresa para montar
 * o instante do slot. O slot é considerado passado quando seu início não é
 * estritamente futuro (início <= agora), espelhando a validação do backend.
 */
export function isSlotHourInPast(
  dateKey: string,
  hour: number,
  timezone: string = APPOINTMENT_TIMEZONE,
  nowISO?: string,
): boolean {
  const slotStart = DateTime.fromISO(
    `${dateKey}T${String(hour).padStart(2, "0")}:00`,
    { zone: timezone },
  );
  if (!slotStart.isValid) {
    return false;
  }
  const now = nowISO ? DateTime.fromISO(nowISO) : DateTime.now();
  return slotStart <= now;
}

function weekStart(dateKey: string, timezone: string): DateTime {
  const anchor = DateTime.fromISO(dateKey, { zone: timezone });
  return anchor.minus({ days: anchor.weekday - 1 }).startOf("day");
}

/**
 * Janela UTC do grid mensal (42 dias, incluindo dias de meses adjacentes).
 */
export function getMonthGridRange(
  year: number,
  month: number,
  timezone: string = APPOINTMENT_TIMEZONE,
): CalendarRange {
  const monthStart = DateTime.fromObject({ year, month, day: 1 }, { zone: timezone });
  if (!monthStart.isValid) {
    return { startAt: "", endAt: "" };
  }
  const gridStart = monthStart.minus({ days: monthStart.weekday - 1 });
  const gridEnd = gridStart.plus({ days: 42 });
  return {
    startAt: gridStart.toUTC().toISO() ?? "",
    endAt: gridEnd.toUTC().toISO() ?? "",
  };
}

/**
 * Janela UTC de uma semana (segunda a domingo) que contém dateKey.
 */
export function getWeekRange(
  dateKey: string,
  timezone: string = APPOINTMENT_TIMEZONE,
): CalendarRange {
  const ws = weekStart(dateKey, timezone);
  const we = ws.plus({ days: 7 });
  return {
    startAt: ws.toUTC().toISO() ?? "",
    endAt: we.toUTC().toISO() ?? "",
  };
}

/**
 * Janela UTC de um dia (início ao fim do dia no timezone da empresa).
 */
export function getDayRange(
  dateKey: string,
  timezone: string = APPOINTMENT_TIMEZONE,
): CalendarRange {
  const ds = DateTime.fromISO(dateKey, { zone: timezone }).startOf("day");
  const de = ds.plus({ days: 1 });
  return {
    startAt: ds.toUTC().toISO() ?? "",
    endAt: de.toUTC().toISO() ?? "",
  };
}

/**
 * Chaves de 7 dias de uma semana (segunda a domingo) que contém dateKey.
 */
export function getWeekDayKeys(
  dateKey: string,
  timezone: string = APPOINTMENT_TIMEZONE,
): string[] {
  const ws = weekStart(dateKey, timezone);
  return Array.from({ length: 7 }, (_, i) =>
    ws.plus({ days: i }).toISODate() ?? "",
  );
}

/* ------------------------------------------------------------------ */
/*  Navegação entre períodos                                          */
/* ------------------------------------------------------------------ */

/**
 * Desloca uma data por um número de meses, mantendo-se no mesmo dia
 * quando possível (ou ajustando para o último dia do mês destino).
 */
export function navigateMonth(
  dateKey: string,
  offset: number,
  timezone: string = APPOINTMENT_TIMEZONE,
): string {
  const dt = DateTime.fromISO(dateKey, { zone: timezone });
  return dt.plus({ months: offset }).toISODate() ?? "";
}

/**
 * Desloca uma data por um número de semanas (7 dias).
 */
export function navigateWeek(
  dateKey: string,
  offset: number,
  timezone: string = APPOINTMENT_TIMEZONE,
): string {
  const dt = DateTime.fromISO(dateKey, { zone: timezone });
  return dt.plus({ weeks: offset }).toISODate() ?? "";
}

/**
 * Desloca uma data por um número de dias.
 */
export function navigateDay(
  dateKey: string,
  offset: number,
  timezone: string = APPOINTMENT_TIMEZONE,
): string {
  const dt = DateTime.fromISO(dateKey, { zone: timezone });
  return dt.plus({ days: offset }).toISODate() ?? "";
}

/* ------------------------------------------------------------------ */
/*  Agrupamento e formatos para exibição                               */
/* ------------------------------------------------------------------ */

/**
 * Filtra agendamentos que se sobrepõem ao dia (dateKey) e ordena por startAt.
 */
export function appointmentsForDay(
  appointments: Appointment[],
  dateKey: string,
  timezone: string = APPOINTMENT_TIMEZONE,
): Appointment[] {
  const dayStart = DateTime.fromISO(dateKey, { zone: timezone }).startOf("day");
  const dayEnd = dayStart.plus({ days: 1 });
  const startMs = dayStart.toMillis();
  const endMs = dayEnd.toMillis();

  return appointments
    .filter((a) => {
      const aStart = DateTime.fromISO(a.startAt).toMillis();
      const aEnd = DateTime.fromISO(a.endAt).toMillis();
      return aStart < endMs && aEnd > startMs;
    })
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

/**
 * Extrai a hora local do agendamento em minutos desde meia-noite.
 * Usado para posicionamento no eixo de hora dos dias/semanas.
 */
export function toMinutesSinceMidnight(
  isoInstant: string,
  timezone: string = APPOINTMENT_TIMEZONE,
): number {
  const dt = DateTime.fromISO(isoInstant, { zone: timezone });
  if (!dt.isValid) {
    return 0;
  }
  return dt.hour * 60 + dt.minute;
}

/* ------------------------------------------------------------------ */
/*  Algoritmo de sobreposição (overlap layout)                         */
/* ------------------------------------------------------------------ */

export interface AppointmentLayoutItem {
  appointment: Appointment;
  column: number;
  totalColumns: number;
  topPercent: number;
  heightPercent: number;
}

/**
 * Calcula a grade de posicionamento para agendamentos sobrepostos em um dia.
 *
 * Usa coloração gulosa (first-fit) do grafo de intervalos: cada
 * agendamento recebe a primeira coluna disponível que não conflita
 * com agendamentos já posicionados. O número total de colunas é a
 * chromatic number (óptima para grafos de intervalos).
 *
 * @param dayStartMinutes Início da janela visível em minutos (0-1440)
 * @param dayEndMinutes   Fim da janela visível em minutos (0-1440)
 */
export function computeDayLayout(
  appointments: Appointment[],
  timezone: string = APPOINTMENT_TIMEZONE,
  dayStartMinutes: number = 0,
  dayEndMinutes: number = 1440,
): AppointmentLayoutItem[] {
  const totalMinutes = Math.max(dayEndMinutes - dayStartMinutes, 1);

  const items = appointments.map((appointment) => {
    const startMin = Math.max(
      toMinutesSinceMidnight(appointment.startAt, timezone),
      dayStartMinutes,
    );
    const endMin = Math.min(
      toMinutesSinceMidnight(appointment.endAt, timezone),
      dayEndMinutes,
    );
    return { appointment, startMin, endMin, column: 0, totalColumns: 1 };
  });

  // Atribuição gulosa de colunas
  const columns: number[][] = [];

  for (const item of items) {
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      const lastEnd = columns[col][columns[col].length - 1];
      if (item.startMin >= lastEnd) {
        columns[col].push(item.endMin);
        item.column = col;
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([item.endMin]);
      item.column = columns.length - 1;
    }
  }

  const numCols = Math.max(columns.length, 1);

  // Calcular totalColumns por grupo de sobreposição.
  // Agrupamento: dois items estão no mesmo grupo se são sobrepostos.
  const groups: number[][] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let groupId = groups.length;
    for (let g = 0; g < groups.length; g++) {
      const overlapsGroup = groups[g].some((j) => {
        const other = items[j];
        return item.startMin < other.endMin && item.endMin > other.startMin;
      });
      if (overlapsGroup) {
        groupId = g;
        break;
      }
    }
    if (groupId >= groups.length) {
      groups.push([]);
    }
    groups[groupId].push(i);
  }

  // Atribui totalColumns = max(colunas + 1) em cada grupo.
  for (const group of groups) {
    const maxCol = Math.max(...group.map((i) => items[i].column)) + 1;
    for (const i of group) {
      items[i].totalColumns = Math.max(maxCol, 1);
    }
  }

  return items.map((item) => ({
    appointment: item.appointment,
    column: item.column,
    totalColumns: numCols > 1 ? item.totalColumns : 1,
    topPercent:
      ((item.startMin - dayStartMinutes) / totalMinutes) * 100,
    heightPercent:
      Math.max(((item.endMin - item.startMin) / totalMinutes) * 100, 1.5),
  }));
}

/* ------------------------------------------------------------------ */
/*  Intervalo visível da grade diária/semanal                          */
/* ------------------------------------------------------------------ */

export interface DayHourRange {
  startHour: number;
  endHour: number;
}

/**
 * Calcula o intervalo de horas visível no dia com base nos agendamentos.
 * Se não houver agendamentos, retorna 08:00–20:00.
 * Caso contrário, calcula início/fim arredondado com padding de 1h.
 */
export function computeDayHourRange(
  appointments: Appointment[],
  timezone: string = APPOINTMENT_TIMEZONE,
): DayHourRange {
  if (appointments.length === 0) {
    return { startHour: 8, endHour: 20 };
  }

  let earliest = 1440;
  let latest = 0;

  for (const a of appointments) {
    const s = toMinutesSinceMidnight(a.startAt, timezone);
    const e = toMinutesSinceMidnight(a.endAt, timezone);
    if (s < earliest) earliest = s;
    if (e > latest) latest = e;
  }

  const startHour = Math.max(0, Math.floor(earliest / 60) - 1);
  const endHour = Math.min(24, Math.ceil(latest / 60) + 1);

  return { startHour, endHour: Math.max(endHour, startHour + 2) };
}