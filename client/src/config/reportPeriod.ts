import { DateTime } from "luxon";

export type ReportPeriodKey = "today" | "week" | "month" | "custom";

export const REPORT_PERIOD_LABELS: Record<ReportPeriodKey, string> = {
  today: "Hoje",
  week: "Esta semana",
  month: "Este mês",
  custom: "Personalizado",
};

export interface ReportRangeISO {
  startAt: string;
  endAt: string;
}

const LUXON_UNIT: Record<ReportPeriodKey, "day" | "week" | "month"> = {
  today: "day",
  week: "week",
  month: "month",
  custom: "day",
};

/**
 * Calcula a janela [startAt, endAt) em UTC para um período de relatório,
 * no timezone da empresa.
 *
 * O backend considera um agendamento se startAt está no intervalo
 * [start, end). Por isso o fim é sempre a meia-noite do dia seguinte
 * (ou o próximo período), nunca inclusivo.
 *
 * Períodos pré-definidos:
 * • today  → do início do dia de hoje até a meia-noite seguinte;
 * • week   → da segunda-feira da semana atual até a segunda-feira seguinte;
 * • month  → do primeiro dia do mês atual até o primeiro dia do mês seguinte;
 * • custom → de customStartDate (yyyy-MM-dd) até customEndDate + 1 dia,
 *            ambas interpretadas no timezone da empresa.
 */
export function buildReportRange(
  period: ReportPeriodKey,
  timezone: string,
  customStartDate?: string,
  customEndDate?: string,
  now: Date = new Date(),
): ReportRangeISO | null {
  const base = DateTime.fromJSDate(now, { zone: timezone });

  if (period === "custom") {
    if (!customStartDate || !customEndDate) {
      return null;
    }
    const start = DateTime.fromISO(customStartDate, { zone: timezone }).startOf(
      "day",
    );
    const end = DateTime.fromISO(customEndDate, { zone: timezone })
      .startOf("day")
      .plus({ days: 1 });
    if (!start.isValid || !end.isValid || start >= end) {
      return null;
    }
    return { startAt: toIsoUtc(start), endAt: toIsoUtc(end) };
  }

  const start = base.startOf(LUXON_UNIT[period]);
  const end =
    period === "today"
      ? start.plus({ days: 1 })
      : period === "month"
        ? start.plus({ months: 1 })
        : start.plus({ weeks: 1 });

  return { startAt: toIsoUtc(start), endAt: toIsoUtc(end) };
}

function toIsoUtc(value: DateTime): string {
  return value.toUTC().toISO() ?? "";
}

/**
 * Formata a data (yyyy-MM-dd) para DD/MM/AAAA no timezone da empresa.
 * Usada para exibir períodos personalizados.
 */
export function formatReportDate(dateText: string, timezone: string): string {
  const date = DateTime.fromISO(dateText, { zone: timezone });
  if (!date.isValid) {
    return dateText;
  }
  return date.toFormat("dd/MM/yyyy");
}