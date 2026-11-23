import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildReportRange,
  formatDashboardSummaryDay,
  formatReportDate,
} from "./reportPeriod";

const TZ = "Europe/Lisbon";
const NOW = new Date("2026-09-16T10:00:00.000Z");

describe("buildReportRange", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calcula o intervalo de hoje no fuso horário da empresa", () => {
    expect(buildReportRange("today", TZ)).toEqual({
      startAt: "2026-09-15T23:00:00.000Z",
      endAt: "2026-09-16T23:00:00.000Z",
    });
  });

  it("calcula a semana corrente a partir de segunda-feira", () => {
    expect(buildReportRange("week", TZ)).toEqual({
      startAt: "2026-09-13T23:00:00.000Z",
      endAt: "2026-09-20T23:00:00.000Z",
    });
  });

  it("calcula o mês corrente com intervalo semiaberto [início, primeiro dia seguinte)", () => {
    expect(buildReportRange("month", TZ)).toEqual({
      startAt: "2026-08-31T23:00:00.000Z",
      endAt: "2026-09-30T23:00:00.000Z",
    });
  });

  it("calcula período personalizado incluindo o último dia completo", () => {
    expect(buildReportRange("custom", TZ, "2026-09-01", "2026-09-30")).toEqual({
      startAt: "2026-08-31T23:00:00.000Z",
      endAt: "2026-09-30T23:00:00.000Z",
    });
  });

  it("devolve null quando o período personalizado está incompleto", () => {
    expect(buildReportRange("custom", TZ, "", "2026-09-30")).toBeNull();
    expect(buildReportRange("custom", TZ, "2026-09-01", "")).toBeNull();
    expect(buildReportRange("custom", TZ)).toBeNull();
  });

  it("devolve null quando o início é posterior ao fim", () => {
    expect(buildReportRange("custom", TZ, "2026-09-30", "2026-09-01")).toBeNull();
  });

  it("ignora datas inválidas retornando null", () => {
    expect(buildReportRange("custom", TZ, "not-a-date", "2026-09-30")).toBeNull();
    expect(
      buildReportRange("custom", TZ, "2026-09-01", "2026-99-99"),
    ).toBeNull();
  });
});

describe("formatReportDate", () => {
  it("formata uma data válida como DD/MM/AAAA", () => {
    expect(formatReportDate("2026-09-01", TZ)).toBe("01/09/2026");
  });

  it("devolve o valor original quando a data é inválida", () => {
    expect(formatReportDate("invalida", TZ)).toBe("invalida");
  });
});

describe("formatDashboardSummaryDay", () => {
  const LISBON = "Europe/Lisbon";
  const SAO_PAULO = "America/Sao_Paulo";
  const SEP_16_NOON_UTC = new Date("2026-09-16T12:00:00.000Z");

  it("formata o dia civil em português no timezone da empresa (16 set 2026 = quarta-feira)", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(SEP_16_NOON_UTC);
    expect(formatDashboardSummaryDay(LISBON)).toBe(
      "Quarta-feira, 16 de setembro de 2026",
    );
    vi.useRealTimers();
  });

  it("alinha o dia ao mesmo intervalo que buildReportRange(today)", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(SEP_16_NOON_UTC);
    const range = buildReportRange("today", LISBON);
    const label = formatDashboardSummaryDay(LISBON);
    expect(range).not.toBeNull();
    expect(label).toMatch(/16 de setembro de 2026/);
    vi.useRealTimers();
  });

  it("usa o fuso da empresa e não assume Europe/Lisbon", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(SEP_16_NOON_UTC);
    const lisbon = formatDashboardSummaryDay(LISBON);
    const saoPaulo = formatDashboardSummaryDay(SAO_PAULO);
    expect(lisbon).toBe("Quarta-feira, 16 de setembro de 2026");
    expect(saoPaulo).toBe("Quarta-feira, 16 de setembro de 2026");
    vi.useRealTimers();
  });

  it("devolve null para timezone inválido", () => {
    expect(formatDashboardSummaryDay("Invalid/Zone")).toBeNull();
  });
});