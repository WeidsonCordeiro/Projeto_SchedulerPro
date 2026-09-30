import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import Company from "../../src/modules/companies/models/Company.model";
import {
  DEFAULT_TIMEZONE,
  formatLocalTime,
  isValidIanaTimezone,
  luxonWeekdayToDayOfWeek,
  toCompanyDateTime,
} from "../../src/utils/timezone";

describe("timezone: contrato IANA e conversão local", () => {
  it("usa Europe/Lisbon como timezone padrão no utilitário e no schema Company", () => {
    expect(DEFAULT_TIMEZONE).toBe("Europe/Lisbon");
    expect(Company.schema.path("timezone").defaultValue).toBe(DEFAULT_TIMEZONE);
  });

  it.each([
    "Europe/Lisbon", "Europe/London", "America/Sao_Paulo",
    "America/New_York", "UTC", "Asia/Tokyo",
  ])("aceita timezone IANA válido: %s", (timezone) => {
    expect(isValidIanaTimezone(timezone)).toBe(true);
  });

  it.each(["Invalid/Timezone", "Europe/Invalid", "NotATimezone"]) (
    "rejeita timezone inválido: %s",
    (timezone) => expect(isValidIanaTimezone(timezone)).toBe(false),
  );

  it("mantém o mesmo instante absoluto e altera data/hora local por empresa", () => {
    const instant = new Date("2026-08-30T23:30:00.000Z");
    const lisbon = toCompanyDateTime(instant, "Europe/Lisbon");
    const saoPaulo = toCompanyDateTime(instant, "America/Sao_Paulo");
    const newYork = toCompanyDateTime(instant, "America/New_York");
    const tokyo = toCompanyDateTime(instant, "Asia/Tokyo");

    expect(lisbon.zoneName).toBe("Europe/Lisbon");
    expect(lisbon.toISO()).toBe("2026-08-31T00:30:00.000+01:00");
    expect(saoPaulo.toISO()).toBe("2026-08-30T20:30:00.000-03:00");
    expect(newYork.toISO()).toBe("2026-08-30T19:30:00.000-04:00");
    expect(tokyo.toISO()).toBe("2026-08-31T08:30:00.000+09:00");
    expect(lisbon.toUTC().toMillis()).toBe(instant.getTime());
    expect(formatLocalTime(lisbon)).toBe("00:30");
    expect(formatLocalTime(saoPaulo)).toBe("20:30");
  });

  it("mapeia todos os dias do Luxon para o domínio", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(luxonWeekdayToDayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it("usa o dia local quando a conversão atravessa meia-noite", () => {
    const local = toCompanyDateTime(new Date("2026-08-30T23:30:00.000Z"), "Europe/Lisbon");
    expect(local.toISODate()).toBe("2026-08-31");
    expect(local.weekday).toBe(1);
    expect(luxonWeekdayToDayOfWeek(local.weekday)).toBe(1);
    expect(formatLocalTime(local)).toBe("00:30");
  });

  it("formata horários normais e próximos da meia-noite sem depender do timezone da máquina", () => {
    expect(formatLocalTime(toCompanyDateTime(new Date("2026-08-30T23:59:00.000Z"), "UTC"))).toBe("23:59");
    expect(formatLocalTime(toCompanyDateTime(new Date("2026-08-31T00:01:00.000Z"), "Asia/Tokyo"))).toBe("09:01");
  });
});

describe("timezone: transições DST", () => {
  it("Europe/Lisbon entra no DST com offsets diferentes", () => {
    const before = toCompanyDateTime(new Date("2026-03-29T00:30:00.000Z"), "Europe/Lisbon");
    const after = toCompanyDateTime(new Date("2026-03-29T01:30:00.000Z"), "Europe/Lisbon");
    expect(before.offset).toBe(0);
    expect(after.offset).toBe(60);
    expect(before.toISO()).toBe("2026-03-29T00:30:00.000+00:00");
    expect(after.toISO()).toBe("2026-03-29T02:30:00.000+01:00");
    expect(after.toMillis() - before.toMillis()).toBe(60 * 60 * 1000);
  });

  it("America/New_York entra no DST sem tratar timezone como offset fixo", () => {
    const before = toCompanyDateTime(new Date("2026-03-08T06:30:00.000Z"), "America/New_York");
    const after = toCompanyDateTime(new Date("2026-03-08T07:30:00.000Z"), "America/New_York");
    expect(before.offset).toBe(-300);
    expect(after.offset).toBe(-240);
    expect(formatLocalTime(before)).toBe("01:30");
    expect(formatLocalTime(after)).toBe("03:30");
  });

  it("Europe/Lisbon sai do DST preservando o instante e o offset de cada ocorrência", () => {
    const first = toCompanyDateTime(new Date("2026-10-25T00:30:00.000Z"), "Europe/Lisbon");
    const second = toCompanyDateTime(new Date("2026-10-25T01:30:00.000Z"), "Europe/Lisbon");
    expect(first.toFormat("HH:mm")).toBe("01:30");
    expect(second.toFormat("HH:mm")).toBe("01:30");
    expect(first.offset).toBe(60);
    expect(second.offset).toBe(0);
    expect(second.toMillis() - first.toMillis()).toBe(60 * 60 * 1000);
  });

  it.each([
    "2026-03-29T01:30:00.000Z",
    "2026-03-29T02:30:00.000Z",
    "2026-10-25T01:30:00.000Z",
  ])("interpreta ISO explícito como instante absoluto: %s", (iso) => {
    const date = new Date(iso);
    const local = toCompanyDateTime(date, "Europe/Lisbon");
    expect(local.toUTC().toMillis()).toBe(date.getTime());
  });
});
