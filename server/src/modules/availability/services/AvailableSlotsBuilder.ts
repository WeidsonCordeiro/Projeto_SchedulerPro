/**

* ==========================================================
* Arquivo: AvailableSlotsBuilder.ts
* ---
* Responsabilidade:
*
* Gerar a LISTA de horários realmente disponíveis para um
* profissional, serviço e data.
*
* Esta função é PURA: recebe os dados já lidos da base de
* dados e devolve slots. Não consulta nada e não decide
* quem tem permissão para ver o quê — essa decisão é do
* serviço público que a invoca.
*
* ==========================================================
* PORQUÊ EXISTE
* ==========================================================
*
* O backend nunca enumerou slots: apenas VALIDAVA um horário
* pedido (`AvailabilityService.ensureEmployeeAvailable` +
* `AppointmentRepository.hasEmployeeConflict`). A enumeração
* vivia só no cliente (`client/src/config/appointmentSlots.ts`),
* como previsão. Esta função passa a ser a implementação de
* referência no servidor, com as MESMAS regras do validador:
*
* • `AvailabilityService.ensureEmployeeAvailable`
*   - o slot tem de caber INTEIRO dentro do período da manhã
*     OU do período da tarde;
*   - a comparação é léxica de "HH:mm", como no servidor;
*   - `localStart.toISODate() !== localEnd.toISODate()` é
*     rejeitado, ou seja, um slot nunca atravessa a meia-noite;
*   - exceções de dia inteiro invalidam o dia;
*   - exceção parcial bloqueia por sobreposição
*     (`ex.inicio < slot.fim && ex.fim > slot.inicio`).
* • `AppointmentRepository.hasEmployeeConflict`
*   - só `scheduled` e `confirmed` bloqueiam;
*   - sobreposição por instantes
*     (`ocupado.inicio < slot.fim && ocupado.fim > slot.inicio`).
* • `AppointmentService.schedule`
*   - `endAt = startAt + durationMinutes`;
*   - `startAt <= now` é rejeitado, logo só se oferece o que
*     é estritamente posterior a `now`.
*
* O servidor continua a ser a autoridade: `schedule()` e
* `update()` revalidam no momento da escrita. O que regressa
* é um slot só quando outro pedido, entretanto, ocupou o
* horário.
* ==========================================================
 */

import { DateTime } from "luxon";

import { formatLocalTime, toCompanyDateTime } from "../../../utils/timezone";

/**
 * ==========================================================
* Savaguarda contra períodos inválidos (loop infinito).
*
* Um período legítimo tem no máximo 1440 minutos e o passo é
* a duração mínima do serviço (5 minutos, pelo schema), o que
* dá no máximo ~288 candidatos. 300 dá folga sem que um
* período real o alcance.
* ==========================================================
 */
const MAX_SLOTS_PER_PERIOD = 300;

/** Períodos do dia, em "HH:mm" local da empresa. */
export interface WeeklyPeriods {
  morningStart?: string | null;
  morningEnd?: string | null;
  afternoonStart?: string | null;
  afternoonEnd?: string | null;
}

/**
 * Exceção já filtrada para a data pedida.
 *
 * Só interessam `allDay`, `startTime` e `endTime`: o `type`
 * (BLOCK/VACATION/HOLIDAY) e o `reason` não alteram o cálculo,
 * exatamente como em `ensureNoException`.
 */
export interface SlotException {
  allDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
}

/** Intervalo ocupado por um agendamento que bloqueia o horário. */
export interface BusyInterval {
  startAt: Date;
  endAt: Date;
}

export interface BuildAvailableSlotsInput {
  /** Dia no calendário local da empresa ("AAAA-MM-DD"). */
  dateKey: string;
  /** Timezone IANA da empresa. */
  timezone: string;
  /** Duração do serviço em minutos (`Service.duration`). */
  durationMinutes: number;
  /** Disponibilidade semanal do profissional para o dia da semana. */
  periods: WeeklyPeriods;
  /** Exceções do profissional NA DATA pedida. */
  exceptions: SlotException[];
  /** Agendamentos que bloqueiam dentro do dia. */
  busy: BusyInterval[];
  /** Instante de referência; injetável para testes. */
  now: Date;
}

export interface AvailableSlot {
  /** Instante inicial, ISO 8601 com o offset da empresa. */
  startAt: string;
  /** Instante final, ISO 8601 com o offset da empresa. */
  endAt: string;
}

/**
 * Período completo (`inicio < fim`).
 *
 * A comparação léxica de "HH:mm" é segura porque o formato tem
 * comprimento fixo e zeros à esquerda — e é o mesmo critério
 * usado por `AvailabilityService`.
 */
function isCompletePeriod(
  start: string | null | undefined,
  end: string | null | undefined,
): boolean {
  return Boolean(start && end && start < end);
}

/**
 * ==========================================================
* Exceções de dia inteiro invalidam o dia completo.
*
* `ensureNoException` lança em qualquer exceção com
* `allDay`, sem olhar para horários.
* ==========================================================
 */
function hasAllDayException(exceptions: SlotException[]): boolean {
  return exceptions.some((exception) => exception.allDay);
}

/**
 * ==========================================================
* Sobreposição entre exceção parcial e slot.
*
*   ex.inicio < slot.fim && ex.fim > slot.inicio
*
* É o mesmo critério de `ensureNoException`. Uma exceção sem
* `allDay` e sem ambos os horários é ignorada pelo validador
* (e ignorada aqui), para que o catálogo não ofereça nem um
* slot a mais nem a menos do que o agendamento aceitaria.
* ==========================================================
*/
function exceptionBlocksSlot(
  exceptions: SlotException[],
  localStart: string,
  localEnd: string,
): boolean {
  return exceptions.some((exception) => {
    if (exception.allDay) {
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

/** Sobreposição por instantes absolutos. */
function overlapsBusy(busy: BusyInterval[], startMs: number, endMs: number) {
  return busy.some((interval) => {
    const busyStart = interval.startAt.getTime();
    const busyEnd = interval.endAt.getTime();

    if (Number.isNaN(busyStart) || Number.isNaN(busyEnd)) {
      return false;
    }

    return busyStart < endMs && busyEnd > startMs;
  });
}

/**
 * ==========================================================
* Gera os slots disponíveis.
* ==========================================================
*/
export function buildAvailableSlots({
  dateKey,
  timezone,
  durationMinutes,
  periods,
  exceptions,
  busy,
  now,
}: BuildAvailableSlotsInput): AvailableSlot[] {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return [];
  }

  const nowMs = now.getTime();

  if (Number.isNaN(nowMs)) {
    return [];
  }

  const dayStart = DateTime.fromISO(dateKey, { zone: timezone });

  /**
   * Data impossível para o fuso da empresa ("2027-02-30",
   * "2027-13-01"). O pedido é recusado antes de chegar aqui,
   * mas a função não deve devolver um dia inventado.
   */
  if (!dayStart.isValid || dayStart.toISODate() !== dateKey) {
    return [];
  }

  /**
   * ==========================================================
   * Passado.
   *
   * A comparação é feita em TEXTO entre chaves "AAAA-MM-DD",
   * o que coincide com a comparação cronológica. Um dia
   * anterior ao dia corrente da empresa não oferece slots.
   * ==========================================================
   */
  const todayKey = toCompanyDateTime(now, timezone).toISODate();

  if (todayKey === null || dateKey < todayKey) {
    return [];
  }

  /**
   * No dia corrente só se oferece o que ainda não começou:
   * `schedule()` rejeita `startAt <= now`.
   */
  const isToday = dateKey === todayKey;

  /**
   * Exceção de dia inteiro invalida o dia por completo.
   */
  if (hasAllDayException(exceptions)) {
    return [];
  }

  /**
   * Só interessam períodos completos. Um período a meio
   * preencher não é aceito por `ensureEmployeeAvailable`,
   * logo também não gera slots.
   */
  const completePeriods: Array<[string, string]> = [];

  if (isCompletePeriod(periods.morningStart, periods.morningEnd)) {
    completePeriods.push([periods.morningStart!, periods.morningEnd!]);
  }

  if (
    isCompletePeriod(periods.afternoonStart, periods.afternoonEnd)
  ) {
    completePeriods.push([periods.afternoonStart!, periods.afternoonEnd!]);
  }

  const slots: AvailableSlot[] = [];
  const durationMs = durationMinutes * 60 * 1000;

  for (const [periodStart, periodEnd] of completePeriods) {
    const periodStartLocal = DateTime.fromISO(`${dateKey}T${periodStart}`, {
      zone: timezone,
    });

    if (!periodStartLocal.isValid) {
      continue;
    }

    let cursor = periodStartLocal.toUTC();
    let generated = 0;

    while (generated < MAX_SLOTS_PER_PERIOD) {
      const slotStart = cursor;
      const slotEnd = cursor.plus({ milliseconds: durationMs });

      /**
       * Um slot que atravessa a meia-noite é rejeitado por
       * `ensureEmployeeAvailable` (`localStart.toISODate() !==
       * localEnd.toISODate()`). A comparação de "HH:mm" não
       * deteta isso sozinha — "00:00" ordena antes de "23:30"
       * —, por isso a data local é comparada explicitamente.
       */
      if (slotEnd.setZone(timezone).toISODate() !== dateKey) {
        break;
      }

      const localStart = formatLocalTime(slotStart.setZone(timezone));
      const localEnd = formatLocalTime(slotEnd.setZone(timezone));

      /**
       * O slot tem de caber INTEIRO no período. Passo = duração
       * do serviço, ancorada no início do período.
       */
      if (localStart < periodStart || localEnd > periodEnd) {
        break;
      }

      generated += 1;

      /**
       * ==========================================================
       * O cursor avança SEMPRE, ANTES de qualquer filtro.
       * ==========================================================
       *
       * O passo é a duração do serviço e é independente do
       * que acontece ao candidato: um slot no passado, coberto
       * por uma exceção ou ocupado por outro agendamento é
       * DESCARTADO, não repetido.
       *
       * A ordem é deliberada. Avançar só no fim do laço — depois
       * de `push` — faria cada `continue` devolver o cursor ao
       * mesmo instante e o mesmo candidato ser reavaliado até
       * `generated` atingir o limite: um período totalmente
       * ocupado devolveria 300 cópias de um único slot em vez de
       * uma lista vazia. Os dois `break` acima não têm esse
       * problema, porque saem do laço.
       */
      cursor = slotEnd;

      if (isToday && slotStart.toMillis() <= nowMs) {
        continue;
      }

      if (exceptionBlocksSlot(exceptions, localStart, localEnd)) {
        continue;
      }

      if (overlapsBusy(busy, slotStart.toMillis(), slotEnd.toMillis())) {
        continue;
      }

      /**
       * ==========================================================
       * Serialização no fuso da EMPRESA.
       * ==========================================================
       *
       * O cursor aritmético vive em UTC (somar duração em UTC
       * não depende de transições de DST), mas a resposta é
       * serializada com o offset da empresa.
       *
       * Não é cosmético: `DateTime.toISO()` devolve `Z` quando o
       * objeto está em UTC, e o cliente receberia "08:00Z"
       * para um horário que é "09:00" em Lisboa. Como o browser
       * do visitante pode estar noutro fuso, o único lado que
       * sabe converter é a resposta — daí o `setZone(timezone)`
       * e o campo `timezone` no mesmo payload.
       */
      const startAt = slotStart.setZone(timezone).toISO();
      const endAt = slotEnd.setZone(timezone).toISO();

      if (startAt && endAt) {
        slots.push({ startAt, endAt });
      }
    }
  }

  return slots;
}