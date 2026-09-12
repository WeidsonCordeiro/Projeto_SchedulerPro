import { describe, expect, it } from "vitest";
import {
  exceptionBlocksSlot,
  getAvailableSlots,
  hasAllDayException,
  hasAvailabilityOnDay,
} from "./appointmentSlots";
import type { Availability } from "../types/availability";
import type { AvailabilityException } from "../types/availabilityException";

function makeAvailability(overrides: Partial<Availability> = {}): Availability {
  return {
    id: "av1",
    companyId: "company1",
    employeeId: "employee1",
    dayOfWeek: 2,
    morningStart: "09:00",
    morningEnd: "12:00",
    afternoonStart: null,
    afternoonEnd: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeException(overrides: Partial<AvailabilityException> = {}): AvailabilityException {
  return {
    id: "exc1",
    companyId: "company1",
    employeeId: "employee1",
    date: "2026-09-15",
    allDay: false,
    startTime: "10:00",
    endTime: "11:00",
    type: "BLOCK",
    reason: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const DAY = "2026-09-15"; // terça-feira (dayOfWeek 2)

function slotTimes(slots: { localTime: string }[]): string[] {
  return slots.map((slot) => slot.localTime);
}

describe("appointmentSlots com exceções", () => {
  describe("hasAllDayException", () => {
    it("retorna true quando existe exceção de dia inteiro na data", () => {
      expect(hasAllDayException([makeException({ allDay: true })], DAY)).toBe(true);
    });

    it("retorna false sem exceção allDay na data", () => {
      expect(hasAllDayException([makeException()], DAY)).toBe(false);
      expect(hasAllDayException([makeException({ allDay: true, date: "2026-09-16" })], DAY)).toBe(false);
      expect(hasAllDayException([], DAY)).toBe(false);
    });
  });

  describe("exceptionBlocksSlot", () => {
    it("retorna false para exceção allDay (avaliada separadamente)", () => {
      expect(exceptionBlocksSlot([makeException({ allDay: true })], DAY, "09:30", "10:00")).toBe(false);
    });

    it.each([
      ["início do slot", "09:00", "09:40"],
      ["meio do slot", "09:40", "09:50"],
      ["fim do slot", "09:50", "10:30"],
      ["maior que o slot", "08:00", "11:00"],
    ])("bloqueia slot quando há sobreposição no %s", (_label, start, end) => {
      expect(exceptionBlocksSlot([makeException({ startTime: start, endTime: end })], DAY, "09:30", "10:00")).toBe(true);
    });

    it("bloqueia o caso 09:30-10:30 com exceção 10:00-11:00 (duração de 60min)", () => {
      expect(exceptionBlocksSlot([makeException()], DAY, "09:30", "10:30")).toBe(true);
    });

    it("permite slot que termina no início da exceção", () => {
      expect(exceptionBlocksSlot([makeException({ startTime: "10:00", endTime: "11:00" })], DAY, "09:00", "10:00")).toBe(false);
    });

    it("permite slot que inicia no fim da exceção", () => {
      expect(exceptionBlocksSlot([makeException({ startTime: "10:00", endTime: "11:00" })], DAY, "11:00", "12:00")).toBe(false);
    });

    it("ignora exceções de outra data", () => {
      expect(exceptionBlocksSlot([makeException({ date: "2026-09-16" })], DAY, "09:30", "10:00")).toBe(false);
    });
  });

  describe("getAvailableSlots com exceções", () => {
    it("remove os slots cobertos por uma exceção parcial", () => {
      const slots = getAvailableSlots({
        dateKey: DAY,
        employeeId: "employee1",
        availability: [makeAvailability()],
        durationMinutes: 30,
        exceptions: [makeException({ startTime: "10:30", endTime: "11:30" })],
      });

      const times = slotTimes(slots);
      expect(times).not.toContain("10:30");
      expect(times).not.toContain("11:00");
      expect(times).toContain("10:00");
      expect(times).toContain("11:30");
    });

    it("remove slots que sofrerem sobreposição da exceção (duração de 60min)", () => {
      const slots = getAvailableSlots({
        dateKey: DAY,
        employeeId: "employee1",
        availability: [makeAvailability()],
        durationMinutes: 60,
        exceptions: [makeException({ startTime: "10:00", endTime: "11:00" })],
      });

      // Slots candidatos: 09:00-10:00 (termina no início da exceção -> ok),
      // 10:00-11:00 (coberto) e 11:00-12:00.
      const times = slotTimes(slots);
      expect(times).toContain("09:00");
      expect(times).not.toContain("10:00");
      expect(times).toContain("11:00");
    });

    it("mantém slots adjacentes à exceção", () => {
      const slots = getAvailableSlots({
        dateKey: DAY,
        employeeId: "employee1",
        availability: [makeAvailability()],
        durationMinutes: 30,
        exceptions: [makeException({ startTime: "10:00", endTime: "11:00" })],
      });

      const times = slotTimes(slots);
      expect(times).toContain("09:30");
      expect(times).toContain("11:00");
      expect(times).not.toContain("10:00");
      expect(times).not.toContain("10:30");
    });

    it("exceção de dia inteiro invalida o dia por completo", () => {
      const slots = getAvailableSlots({
        dateKey: DAY,
        employeeId: "employee1",
        availability: [makeAvailability()],
        durationMinutes: 30,
        exceptions: [makeException({ allDay: true })],
      });

      expect(slots).toEqual([]);
    });

    it("ignora exceções de outras datas", () => {
      const slots = getAvailableSlots({
        dateKey: DAY,
        employeeId: "employee1",
        availability: [makeAvailability()],
        durationMinutes: 30,
        exceptions: [
          makeException({ date: "2026-09-16", startTime: "09:00", endTime: "12:00" }),
        ],
      });

      expect(slotTimes(slots)).toContain("10:00");
    });

    it("combina conflito de appointment e exceção parcial", () => {
      const slots = getAvailableSlots({
        dateKey: DAY,
        employeeId: "employee1",
        availability: [makeAvailability()],
        durationMinutes: 30,
        exceptions: [makeException({ startTime: "10:30", endTime: "11:00" })],
        appointments: [
          {
            id: "appt1",
            companyId: "company1",
            clientId: "client1",
            serviceId: "service1",
            employeeId: "employee1",
            // 09:00 local em Europe/Lisbon (verão/UTC+1).
            startAt: "2026-09-15T08:00:00.000Z",
            endAt: "2026-09-15T08:30:00.000Z",
            status: "scheduled",
            notes: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      });

      const times = slotTimes(slots);
      expect(times).not.toContain("09:00");
      expect(times).toContain("09:30");
      expect(times).not.toContain("10:30");
      expect(times).toContain("10:00");
      expect(times).toContain("11:00");
    });
  });

  describe("hasAvailabilityOnDay com exceções", () => {
    it("retorna true para dia com disponibilidade e sem exceção", () => {
      expect(hasAvailabilityOnDay([makeAvailability()], DAY, "Europe/Lisbon", [])).toBe(true);
    });

    it("retorna false quando existe exceção de dia inteiro", () => {
      expect(
        hasAvailabilityOnDay(
          [makeAvailability()],
          DAY,
          "Europe/Lisbon",
          [makeException({ allDay: true })],
        ),
      ).toBe(false);
    });

    it("permanece true para exceção parcial", () => {
      expect(
        hasAvailabilityOnDay(
          [makeAvailability()],
          DAY,
          "Europe/Lisbon",
          [makeException()],
        ),
      ).toBe(true);
    });
  });
});