import { DateTime } from "luxon";
import type {
  AvailabilityException,
  AvailabilityExceptionType,
} from "../types/availabilityException";

export const EXCEPTION_TYPE_LABELS: Record<AvailabilityExceptionType, string> = {
  BLOCK: "Bloqueio",
  VACATION: "Férias",
  HOLIDAY: "Feriado",
};

export const EXCEPTION_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface AvailabilityExceptionForm {
  date: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  type: AvailabilityExceptionType;
  reason: string;
}

export const EMPTY_EXCEPTION_FORM: AvailabilityExceptionForm = {
  date: "",
  allDay: false,
  startTime: "",
  endTime: "",
  type: "BLOCK",
  reason: "",
};

function isValidDateOnly(value: string): boolean {
  const parsed = DateTime.fromISO(value);
  return parsed.isValid && parsed.toISODate() === value;
}

/**
 * Exceção "AAAA-MM-DD" -> exibição "dd/MM/yyyy".
 */
export function formatExceptionDate(dateKey: string): string {
  const date = DateTime.fromISO(dateKey);
  if (!date.isValid) {
    return dateKey;
  }
  return date.toFormat("dd/MM/yyyy");
}

/**
 * Resumo curto do período da exceção para exibição:
 * - dia inteiro: "Dia inteiro"
 * - parcial: "10:00 – 11:00"
 */
export function formatExceptionPeriod(exception: AvailabilityException): string {
  if (exception.allDay) {
    return "Dia inteiro";
  }
  if (exception.startTime && exception.endTime) {
    return `${exception.startTime} – ${exception.endTime}`;
  }
  return "";
}

/**
 * Valida o formulário de exceção espelhando as regras do backend:
 * - data obrigatória em "AAAA-MM-DD";
 * - dia inteiro não exige horários;
 * - período exige início e fim (HH:mm) com início < fim;
 * - motivo opcional com no máximo 500 caracteres.
 *
 * Retorna a primeira mensagem de erro ou null quando válido.
 */
export function validateExceptionForm(
  form: AvailabilityExceptionForm,
): string | null {
  if (!form.date) {
    return "Informe a data da exceção.";
  }
  if (!isValidDateOnly(form.date)) {
    return "Data inválida. Use o formato AAAA-MM-DD.";
  }

  if (form.reason && form.reason.length > 500) {
    return "O motivo deve ter no máximo 500 caracteres.";
  }

  if (form.allDay) {
    return null;
  }

  if (!form.startTime || !form.endTime) {
    return "Informe o horário inicial e final do bloqueio.";
  }

  if (
    !EXCEPTION_TIME_PATTERN.test(form.startTime) ||
    !EXCEPTION_TIME_PATTERN.test(form.endTime)
  ) {
    return "Horário inválido. Use HH:mm.";
  }

  if (form.startTime >= form.endTime) {
    return "O horário inicial deve ser anterior ao horário final.";
  }

  return null;
}

/**
 * Converte o formulário em payload de criação (horários são limpos quando o
 * bloqueio é de dia inteiro, igual ao backend).
 */
export function toExceptionPayload(
  form: AvailabilityExceptionForm,
): Pick<
  AvailabilityException,
  "date" | "allDay" | "startTime" | "endTime" | "type" | "reason"
> {
  return {
    date: form.date,
    allDay: form.allDay,
    startTime: form.allDay ? null : form.startTime,
    endTime: form.allDay ? null : form.endTime,
    type: form.type,
    reason: form.reason || null,
  };
}