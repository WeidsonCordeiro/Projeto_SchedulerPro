import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_TIMEZONE,
  formatAppointmentDate,
  formatAppointmentEndTime,
  formatAppointmentTime,
  formatMonthYear,
  formatWeekdayDate,
  toIsoUtc,
  toLocalDateTimeInputValue,
} from "./appointmentTime";

describe("appointmentTime (Europe/Lisbon: UTC+0 inverno, UTC+1 verão)", () => {
  it("uses the same default timezone as the backend", () => {
    expect(APPOINTMENT_TIMEZONE).toBe("Europe/Lisbon");
  });

  it("converts winter local time to UTC without offset", () => {
    expect(toIsoUtc("2026-01-15T10:00")).toBe("2026-01-15T10:00:00.000Z");
  });

  it("converts summer local time to UTC applying +01:00", () => {
    expect(toIsoUtc("2026-07-15T10:00")).toBe("2026-07-15T09:00:00.000Z");
  });

  it("handles the DST spring transition day (2026-03-29)", () => {
    expect(toIsoUtc("2026-03-29T11:00")).toBe("2026-03-29T10:00:00.000Z");
  });

  it("converts local time for an explicit non-default zone", () => {
    expect(toIsoUtc("2026-07-15T10:00", "America/Sao_Paulo")).toBe(
      "2026-07-15T13:00:00.000Z",
    );
  });

  it("returns an empty string for an invalid local datetime", () => {
    expect(toIsoUtc("")).toBe("");
    expect(toIsoUtc("not-a-date")).toBe("");
  });

  it("round-trips: UTC instant -> local input -> UTC instant", () => {
    const instants = [
      "2026-08-30T09:00:00.000Z",
      "2026-01-15T10:30:00.000Z",
      "2026-03-29T10:00:00.000Z",
    ];
    instants.forEach((instant) => {
      const local = toLocalDateTimeInputValue(instant);
      expect(local).not.toBe("");
      expect(toIsoUtc(local)).toBe(instant);
    });
  });

  it("keeps the same instant across DST transitions (no drift)", () => {
    const winter = toIsoUtc(toLocalDateTimeInputValue("2026-01-10T08:00:00.000Z"));
    const summer = toIsoUtc(toLocalDateTimeInputValue("2026-07-10T08:00:00.000Z"));
    expect(winter).toBe("2026-01-10T08:00:00.000Z");
    expect(summer).toBe("2026-07-10T08:00:00.000Z");
  });

  it("returns an empty string for an invalid instant", () => {
    expect(toLocalDateTimeInputValue("")).toBe("");
  });

  it("maps the payload format from the API example to the local input", () => {
    expect(toLocalDateTimeInputValue("2026-08-30T09:00:00.000Z")).toBe(
      "2026-08-30T10:00",
    );
  });

  it("formats a date (dd/MM/yyyy) and time (HH:mm) in company time", () => {
    expect(formatAppointmentDate("2026-07-15T09:00:00.000Z")).toBe("15/07/2026");
    expect(formatAppointmentTime("2026-07-15T09:00:00.000Z")).toBe("10:00");
    expect(formatAppointmentTime("2026-01-15T10:00:00.000Z")).toBe("10:00");
  });

  it("shows 11:00 on the DST spring transition day", () => {
    expect(formatAppointmentTime("2026-03-29T10:00:00.000Z")).toBe("11:00");
  });

  it("returns an empty string when formatting an invalid instant", () => {
    expect(formatAppointmentDate("")).toBe("");
    expect(formatAppointmentTime("")).toBe("");
  });

  it("previews the end time adding the service duration to the start instant", () => {
    expect(formatAppointmentEndTime("2026-07-15T10:00", 30)).toBe("10:30");
    expect(formatAppointmentEndTime("2026-07-15T10:00", 90)).toBe("11:30");
  });

  it("previews the end time across DST correctly (instant-based addition)", () => {
    // 2026-03-29 00:30 (UTC+0) + 60min = 01:30Z, que em Lisboa é 02:30 (UTC+1).
    expect(formatAppointmentEndTime("2026-03-29T00:30", 60)).toBe("02:30");
  });

  it("returns an empty end time when the start is invalid", () => {
    expect(formatAppointmentEndTime("", 30)).toBe("");
  });
});

describe("appointmentTime (calendário da agenda inteligente)", () => {
  it("formats the selected weekday/date in Portuguese", () => {
    expect(formatWeekdayDate("2026-09-15")).toBe("Terça-feira, 15 de setembro");
  });

  it("formats the month/year header in Portuguese", () => {
    expect(formatMonthYear(2026, 9)).toBe("Setembro 2026");
    expect(formatMonthYear(2026, 1)).toBe("Janeiro 2026");
  });

  it("respects an explicit timezone for the weekday header", () => {
    expect(formatWeekdayDate("2026-07-15", "America/Sao_Paulo")).toBe(
      "Quarta-feira, 15 de julho",
    );
  });

  it("returns an empty string for invalid inputs", () => {
    expect(formatWeekdayDate("")).toBe("");
    expect(formatWeekdayDate("not-a-date")).toBe("");
    expect(formatMonthYear(0, 0)).toBe("");
  });
});