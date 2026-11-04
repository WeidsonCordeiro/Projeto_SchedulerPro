import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import {
  DEFAULT_TIMEZONE,
  formatLocalTime,
  luxonWeekdayToDayOfWeek,
  resolveCompanyTimezone,
  toCompanyDateTime,
} from "../../src/utils/timezone";

describe("timezone", () => {
  it("converte UTC para horário local com DST", () => { const local = toCompanyDateTime(new Date("2026-08-30T17:00:00Z"), "Europe/Lisbon"); expect(formatLocalTime(local)).toBe("18:00"); });
  it("converte domingo do Luxon para DayOfWeek 0", () => { expect(luxonWeekdayToDayOfWeek(DateTime.fromISO("2026-08-30").weekday)).toBe(0); });
  it("não depende do timezone do servidor", () => { expect(formatLocalTime(toCompanyDateTime(new Date("2026-08-30T17:00:00Z"), "America/Sao_Paulo"))).toBe("14:00"); });

  it("resolveCompanyTimezone devolve IANA válido", () => {
    expect(resolveCompanyTimezone("America/Sao_Paulo")).toBe("America/Sao_Paulo");
  });

  it("resolveCompanyTimezone usa Lisboa quando ausente ou inválido", () => {
    expect(resolveCompanyTimezone(undefined)).toBe(DEFAULT_TIMEZONE);
    expect(resolveCompanyTimezone(null)).toBe(DEFAULT_TIMEZONE);
    expect(resolveCompanyTimezone("")).toBe(DEFAULT_TIMEZONE);
    expect(resolveCompanyTimezone("Invalid/Zone")).toBe(DEFAULT_TIMEZONE);
  });
});
