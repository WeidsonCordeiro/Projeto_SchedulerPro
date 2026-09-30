import { DateTime } from "luxon";

/**
 * Fuso horário assumido para converter horários de agendamentos.
 *
 * O backend obtém o timezone da empresa (company.timezone) e usa as funções de
 * server/src/utils/timezone.ts (Luxon) para interpretar startAt/endAt e validar
 * a disponibilidade do funcionário contra períodos locais "HH:mm".
 *
 * O frontend, neste Stage, não possui fonte autenticada de company.timezone
 * (AuthUser e as listas de Users/Clients/Services não a expõem e apenas
 * OWNER/ADMIN possuem COMPANY_READ). Por isso usamos o mesmo valor padrão do
 * backend (DEFAULT_TIMEZONE = "Europe/Lisbon"), que é aplicado a toda empresa
 * que não informou timezone próprio no cadastro.
 *
 * Contrato seguido: o payload envia startAt como instante ISO 8601 em UTC
 * (ex.: "2026-08-30T09:00:00.000Z"), conforme docs/api-contract.md, e a tela
 * converte esse instante de volta para o horário local da empresa.
 */
export const APPOINTMENT_TIMEZONE = "Europe/Lisbon";

/**
 * Converte o valor de um campo datetime-local ("AAAA-MM-DDTHH:mm") no instante
 * ISO 8601 UTC que representa o mesmo horário local da empresa.
 *
 * Retorna "" quando o valor não é uma data/hora válida.
 */
export function toIsoUtc(
  datetimeLocal: string,
  timezone: string = APPOINTMENT_TIMEZONE,
): string {
  const local = DateTime.fromISO(datetimeLocal, { zone: timezone });
  if (!local.isValid) {
    return "";
  }
  return local.toUTC().toISO() ?? "";
}

/**
 * Converte um instante ISO 8601 (UTC) no valor "AAAA-MM-DDTHH:mm" do horário
 * local da empresa, adequado para um input datetime-local.
 *
 * Retorna "" quando o instante é inválido.
 */
export function toLocalDateTimeInputValue(
  iso: string,
  timezone: string = APPOINTMENT_TIMEZONE,
): string {
  const datetime = DateTime.fromISO(iso, { zone: timezone });
  if (!datetime.isValid) {
    return "";
  }
  return datetime.toFormat("yyyy-MM-dd'T'HH:mm");
}

/**
 * Data de um instante no horário local da empresa: "dd/MM/aaaa".
 */
export function formatAppointmentDate(
  iso: string,
  timezone: string = APPOINTMENT_TIMEZONE,
): string {
  const datetime = DateTime.fromISO(iso, { zone: timezone });
  if (!datetime.isValid) {
    return "";
  }
  return datetime.toFormat("dd/MM/yyyy");
}

/**
 * Hora de um instante no horário local da empresa: "HH:mm".
 */
export function formatAppointmentTime(
  iso: string,
  timezone: string = APPOINTMENT_TIMEZONE,
): string {
  const datetime = DateTime.fromISO(iso, { zone: timezone });
  if (!datetime.isValid) {
    return "";
  }
  return datetime.toFormat("HH:mm");
}

/**
 * Hora de término do agendamento, exibida apenas como previsão no formulário.
 *
 * O backend calcula endAt como startAt (instante) + service.duration minutos
 * (AppointmentService) e depois converte para o horário local da empresa.
 * O frontend não envia endAt; este preview repete a mesma operação para
 * informação do usuário. Retorna "" quando startAt é inválido.
 */
export function formatAppointmentEndTime(
  datetimeLocal: string,
  durationMinutes: number,
  timezone: string = APPOINTMENT_TIMEZONE,
): string {
  const start = DateTime.fromISO(datetimeLocal, { zone: timezone });
  if (!start.isValid) {
    return "";
  }
  return start.plus({ minutes: durationMinutes }).toFormat("HH:mm");
}

function capitalize(text: string): string {
  return text ? text.charAt(0).toLocaleUpperCase("pt") + text.slice(1) : text;
}

/**
 * Dia selecionado no calendário da agenda inteligente, no horário local da
 * empresa, em português: "Terça-feira, 15 de setembro".
 *
 * dateKey é o calendário local do dia ("AAAA-MM-DD"). Retorna "" se inválido.
 */
export function formatWeekdayDate(
  dateKey: string,
  timezone: string = APPOINTMENT_TIMEZONE,
): string {
  const date = DateTime.fromISO(dateKey, { zone: timezone, locale: "pt" });
  if (!date.isValid) {
    return "";
  }
  return capitalize(date.toFormat("cccc, d 'de' LLLL"));
}

/**
 * Cabeçalho do calendário da agenda inteligente: "Setembro 2026".
 * month é 1-based (1 = janeiro). Retorna "" se inválido.
 */
export function formatMonthYear(
  year: number,
  month: number,
  timezone: string = APPOINTMENT_TIMEZONE,
): string {
  const date = DateTime.fromObject({ year, month, day: 1 }, { zone: timezone, locale: "pt" });
  if (!date.isValid) {
    return "";
  }
  return capitalize(date.toFormat("LLLL yyyy"));
}