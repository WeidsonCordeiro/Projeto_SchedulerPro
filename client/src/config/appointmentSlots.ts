import { DateTime } from "luxon";
import { APPOINTMENT_TIMEZONE } from "./appointmentTime";
import type { Appointment } from "../types/appointment";
import type { Availability, DayOfWeek } from "../types/availability";
import type { AvailabilityException } from "../types/availabilityException";

/**
 * Gerador de horários livres (slots) para a agenda inteligente de
 * agendamentos.
 *
 * Este módulo é uma PREVISÃO de disponibilidade: o backend continua sendo a
 * autoridade final (AppointmentService.create/update revalidam na hora do
 * envio). A função é pura - não faz chamadas HTTP e não cria appointments.
 *
 * Regras replicadas do backend (server/src):
 * - AvailabilityService.ensureEmployeeAvailable: o appointment precisa caber
 *   inteiro dentro do período da manhã OU inteiro dentro do período da tarde,
 *   comparando os horários locais como strings "HH:mm";
 * - AvailabilityService.ensureNoException: uma exceção (bloqueio/férias/
 *   feriado) de dia inteiro invalida o dia; uma exceção parcial bloqueia
 *   qualquer slot que sobreponha o período (início < fim do slot && fim >
 *   início do slot);
 * - AppointmentRepository.hasEmployeeConflict: apenas os status
 *   "scheduled"/"confirmed" bloqueiam, pelo critério de sobreposição de
 *   instantes (start < outro.end && end > outro.start);
 * - AppointmentService: endAt = startAt (instante) + duration * 60 * 1000ms.
 *
 * Granularidade: o passo entre slots candidatos é a própria duração do
 * serviço, ancorada no início do período. Ex.: 30min em 09:00-12:00 gera
 * 09:00, 09:30, 10:00, 10:30, 11:00, 11:30; 60min gera 09:00, 10:00, 11:00.
 */

export interface AvailableSlot {
  /** Instante inicial do slot em ISO 8601 UTC ("...Z"). */
  start: string;
  /** Instante final do slot em ISO 8601 UTC ("...Z"). */
  end: string;
  /** Horário local da empresa para exibição ("HH:mm"). */
  localTime: string;
}

/** Status que realmente bloqueiam horário (backend). */
const BLOCKING_STATUSES: Appointment["status"][] = ["scheduled", "confirmed"];

/**
 * Número máximo de slots candidatos por período. O limite existe apenas como
 * salvaguarda contra períodos inválidos/circuito infinito; os períodos
 * legítimos (HH:mm de um único dia) nunca alcançam esse número.
 */
const MAX_SLOTS_PER_PERIOD = 300;

function dayOfWeekOf(
  dateKey: string,
  timezone: string,
): DayOfWeek | null {
  const date = DateTime.fromISO(dateKey, { zone: timezone });
  if (!date.isValid) {
    return null;
  }
  // Luxon: 1=Segunda ... 7=Domingo -> DayOfWeek: 0=Domingo ... 6=Sábado.
  return (date.weekday === 7 ? 0 : date.weekday) as DayOfWeek;
}

function isCompletePeriod(start: string | null, end: string | null): boolean {
  // Comparação léxica de "HH:mm" espelha o string-compare do backend.
  return Boolean(start && end && start < end);
}

/**
 * Exceções que bloqueiam o dia inteiro na data informada (dateKey do
 * calendário local da empresa).
 */
export function hasAllDayException(
  exceptions: AvailabilityException[],
  dateKey: string,
): boolean {
  return exceptions.some(
    (exception) => exception.date === dateKey && exception.allDay,
  );
}

/**
 * Indica se um slot local ("HH:mm" até "HH:mm") entra em alguma exceção do
 * funcionário na data informada, espelhando AvailabilityService.ensureNoException:
 *
 *   exceção.inicio < slot.fim && exceção.fim > slot.inicio
 *
 * Exceções de dia inteiro são verificadas por hasAllDayException.
 */
export function exceptionBlocksSlot(
  exceptions: AvailabilityException[],
  dateKey: string,
  localStart: string,
  localEnd: string,
): boolean {
  return exceptions.some((exception) => {
    if (exception.date !== dateKey || exception.allDay) {
      return false;
    }
    const start = exception.startTime;
    const end = exception.endTime;
    if (!start || !end) {
      return false;
    }
    return start < localEnd && end > localStart;
  });
}

/**
 * Indica se o funcionário trabalha no dia (dateKey do calendário local da
 * empresa), ou seja, se existe um registro de disponibilidade com pelo menos
 * um período completo (manhã ou tarde) para o dia da semana correspondente e
 * não há exceção de dia inteiro bloqueando a data.
 */
export function hasAvailabilityOnDay(
  availability: Availability[],
  dateKey: string,
  timezone: string = APPOINTMENT_TIMEZONE,
  exceptions: AvailabilityException[] = [],
): boolean {
  if (hasAllDayException(exceptions, dateKey)) {
    return false;
  }
  const dayOfWeek = dayOfWeekOf(dateKey, timezone);
  if (dayOfWeek === null) {
    return false;
  }
  const record = availability.find((entry) => entry.dayOfWeek === dayOfWeek);
  if (!record) {
    return false;
  }
  return (
    isCompletePeriod(record.morningStart, record.morningEnd) ||
    isCompletePeriod(record.afternoonStart, record.afternoonEnd)
  );
}

export interface GetAvailableSlotsParams {
  /** Dia no calendário local da empresa ("AAAA-MM-DD"). */
  dateKey: string;
  employeeId: string;
  /** Registros semanais de disponibilidade do funcionário. */
  availability: Availability[];
  /** Duração do serviço em minutos (Service.duration da API). */
  durationMinutes: number;
  /** Agendamentos da empresa usados para calcular conflitos de funcionário. */
  appointments?: Appointment[];
  /** Exceções de disponibilidade do funcionário (bloqueios/férias/feriados). */
  exceptions?: AvailabilityException[];
  /** Em edição, ignora o próprio agendamento como conflito (backend também). */
  excludeAppointmentId?: string;
  timezone?: string;
}

function overlaps(
  slotStartMs: number,
  slotEndMs: number,
  existing: Appointment,
): boolean {
  const existingStart = DateTime.fromISO(existing.startAt).toMillis();
  const existingEnd = DateTime.fromISO(existing.endAt).toMillis();
  if (Number.isNaN(existingStart) || Number.isNaN(existingEnd)) {
    return false;
  }
  return existingStart < slotEndMs && existingEnd > slotStartMs;
}

export function getAvailableSlots({
  dateKey,
  employeeId,
  availability,
  durationMinutes,
  appointments = [],
  exceptions = [],
  excludeAppointmentId,
  timezone = APPOINTMENT_TIMEZONE,
}: GetAvailableSlotsParams): AvailableSlot[] {
  if (durationMinutes <= 0) {
    return [];
  }

  const dayOfWeek = dayOfWeekOf(dateKey, timezone);
  if (dayOfWeek === null) {
    return [];
  }
  const record = availability.find((entry) => entry.dayOfWeek === dayOfWeek);
  if (!record) {
    return [];
  }

  /**
   * Exceção de dia inteiro invalida o dia por completo.
   */
  if (hasAllDayException(exceptions, dateKey)) {
    return [];
  }

  const blocking = appointments.filter(
    (appointment) =>
      appointment.employeeId === employeeId &&
      appointment.id !== excludeAppointmentId &&
      BLOCKING_STATUSES.includes(appointment.status),
  );

  const periods: Array<[string, string]> = [];
  const morning = isCompletePeriod(record.morningStart, record.morningEnd)
    ? ([record.morningStart, record.morningEnd] as [string, string])
    : null;
  if (morning) {
    periods.push(morning);
  }
  const afternoon = isCompletePeriod(record.afternoonStart, record.afternoonEnd)
    ? ([record.afternoonStart, record.afternoonEnd] as [string, string])
    : null;
  if (afternoon) {
    periods.push(afternoon);
  }

  const slots: AvailableSlot[] = [];
  const durationMs = durationMinutes * 60 * 1000;

  for (const [periodStart, periodEnd] of periods) {
    const periodStartLocal = DateTime.fromISO(`${dateKey}T${periodStart}`, {
      zone: timezone,
    });
    if (!periodStartLocal.isValid) {
      continue;
    }
    const periodEndLocal = DateTime.fromISO(`${dateKey}T${periodEnd}`, {
      zone: timezone,
    });
    if (!periodEndLocal.isValid) {
      continue;
    }
    const periodEndTime = periodEndLocal.toFormat("HH:mm");

    let cursor = periodStartLocal.toUTC();
    let generated = 0;

    while (generated < MAX_SLOTS_PER_PERIOD) {
      const slotStart = cursor;
      const slotEnd = cursor.plus({ milliseconds: durationMs });
      const slotStartTime = slotStart.setZone(timezone).toFormat("HH:mm");
      const slotEndTime = slotEnd.setZone(timezone).toFormat("HH:mm");

      // O slot deve caber inteiro dentro do período (comparação "HH:mm",
      // idêntica ao string-compare de AvailabilityService).
      if (slotStartTime < periodStart || slotEndTime > periodEndTime) {
        break;
      }

      // Exceção parcial (bloqueio/férias/feriado) invalida o slot.
      if (exceptionBlocksSlot(exceptions, dateKey, slotStartTime, slotEndTime)) {
        cursor = slotEnd;
        generated += 1;
        continue;
      }

      const startIso = slotStart.toISO();
      const endIso = slotEnd.toISO();
      if (startIso && endIso) {
        slots.push({ start: startIso, end: endIso, localTime: slotStartTime });
      }
      cursor = slotEnd;
      generated += 1;
    }
  }

  return slots.filter((slot) => {
    const slotStart = DateTime.fromISO(slot.start).toMillis();
    const slotEnd = DateTime.fromISO(slot.end).toMillis();
    if (Number.isNaN(slotStart) || Number.isNaN(slotEnd)) {
      return false;
    }
    return !blocking.some((appointment) =>
      overlaps(slotStart, slotEnd, appointment),
    );
  });
}