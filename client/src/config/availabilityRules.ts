export interface DayDraft {
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
}

export const EMPTY_DAY_DRAFT: DayDraft = {
  morningStart: "",
  morningEnd: "",
  afternoonStart: "",
  afternoonEnd: "",
};

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Regras espelhadas da validação do backend (create/update validators e
 * AvailabilityService.validatePeriods). Os horários são strings locais "HH:mm"
 * e não sofrem qualquer conversão de timezone no frontend.
 */
export function validateDayDraft(draft: DayDraft): string | null {
  const morningStart = draft.morningStart.trim();
  const morningEnd = draft.morningEnd.trim();
  const afternoonStart = draft.afternoonStart.trim();
  const afternoonEnd = draft.afternoonEnd.trim();

  const hasMorning = Boolean(morningStart) || Boolean(morningEnd);
  const hasAfternoon = Boolean(afternoonStart) || Boolean(afternoonEnd);

  if (morningStart && !TIME_PATTERN.test(morningStart)) {
    return "Horário inicial da manhã inválido. Use HH:mm.";
  }
  if (morningEnd && !TIME_PATTERN.test(morningEnd)) {
    return "Horário final da manhã inválido. Use HH:mm.";
  }
  if (afternoonStart && !TIME_PATTERN.test(afternoonStart)) {
    return "Horário inicial da tarde inválido. Use HH:mm.";
  }
  if (afternoonEnd && !TIME_PATTERN.test(afternoonEnd)) {
    return "Horário final da tarde inválido. Use HH:mm.";
  }

  if (!hasMorning && !hasAfternoon) {
    return "Informe pelo menos um período de disponibilidade.";
  }

  if ((morningStart && !morningEnd) || (!morningStart && morningEnd)) {
    return "Informe o horário inicial e final da manhã.";
  }

  if ((afternoonStart && !afternoonEnd) || (!afternoonStart && afternoonEnd)) {
    return "Informe o horário inicial e final da tarde.";
  }

  if (morningStart && morningEnd && morningStart >= morningEnd) {
    return "O horário inicial da manhã deve ser anterior ao horário final.";
  }

  if (afternoonStart && afternoonEnd && afternoonStart >= afternoonEnd) {
    return "O horário inicial da tarde deve ser anterior ao horário final.";
  }

  if (morningEnd && afternoonStart && morningEnd > afternoonStart) {
    return "O período da manhã não pode sobrepor o período da tarde.";
  }

  return null;
}

/**
 * Converte um rascunho de dia no payload de períodos aceite pelo backend.
 * Períodos vazios são enviados como null (limpeza no PATCH, ausência no POST).
 */
export function toPeriodPayload(draft: DayDraft): {
  morningStart: string | null;
  morningEnd: string | null;
  afternoonStart: string | null;
  afternoonEnd: string | null;
} {
  return {
    morningStart: draft.morningStart.trim() || null,
    morningEnd: draft.morningEnd.trim() || null,
    afternoonStart: draft.afternoonStart.trim() || null,
    afternoonEnd: draft.afternoonEnd.trim() || null,
  };
}