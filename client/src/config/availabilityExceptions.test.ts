import { describe, expect, it } from "vitest";
import {
  EXCEPTION_TYPE_LABELS,
  formatExceptionDate,
  formatExceptionPeriod,
  toExceptionPayload,
  validateExceptionForm,
} from "./availabilityExceptions";
import type { AvailabilityException } from "../types/availabilityException";

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

describe("availabilityExceptions config", () => {
  it("rotula os tipos de exceção", () => {
    expect(EXCEPTION_TYPE_LABELS).toEqual({
      BLOCK: "Bloqueio",
      VACATION: "Férias",
      HOLIDAY: "Feriado",
    });
  });

  describe("formatExceptionDate", () => {
    it("formata AAAA-MM-DD como dd/MM/aaaa", () => {
      expect(formatExceptionDate("2026-09-15")).toBe("15/09/2026");
    });

    it("devolve o valor original para data inválida", () => {
      expect(formatExceptionDate("not-a-date")).toBe("not-a-date");
    });
  });

  describe("formatExceptionPeriod", () => {
    it("mostra 'Dia inteiro' para exceção allDay", () => {
      expect(formatExceptionPeriod(makeException({ allDay: true, startTime: null, endTime: null }))).toBe("Dia inteiro");
    });

    it("mostra o intervalo HH:mm para exceção parcial", () => {
      expect(formatExceptionPeriod(makeException())).toBe("10:00 – 11:00");
    });

    it("retorna vazio quando faltam horários", () => {
      expect(formatExceptionPeriod(makeException({ startTime: null, endTime: null }))).toBe("");
    });
  });

  describe("validateExceptionForm", () => {
    const valid = {
      date: "2026-09-15",
      allDay: false,
      startTime: "10:00",
      endTime: "11:00",
      type: "BLOCK" as const,
      reason: "",
    };

    it("aceita formulário parcial válido", () => {
      expect(validateExceptionForm(valid)).toBeNull();
    });

    it("aceita dia inteiro sem horários", () => {
      expect(validateExceptionForm({ ...valid, allDay: true, startTime: "", endTime: "" })).toBeNull();
    });

    it.each([
      ["data ausente", { ...valid, date: "" }],
      ["data inválida", { ...valid, date: "2026-02-31" }],
      ["data fora do formato", { ...valid, date: "15/09/2026" }],
    ])("rejeita %s", (_label, form) => {
      expect(validateExceptionForm(form)).not.toBeNull();
    });

    it("rejeita período sem horários", () => {
      expect(validateExceptionForm({ ...valid, startTime: "", endTime: "" })).not.toBeNull();
    });

    it("rejeita horário fora do formato HH:mm", () => {
      expect(validateExceptionForm({ ...valid, startTime: "25:00" })).not.toBeNull();
    });

    it("rejeita início igual ou posterior ao fim", () => {
      expect(validateExceptionForm({ ...valid, startTime: "11:00", endTime: "11:00" })).not.toBeNull();
      expect(validateExceptionForm({ ...valid, startTime: "12:00", endTime: "11:00" })).not.toBeNull();
    });

    it("rejeita motivo acima de 500 caracteres", () => {
      expect(validateExceptionForm({ ...valid, reason: "x".repeat(501) })).not.toBeNull();
    });
  });

  describe("toExceptionPayload", () => {
    it("limpa horários para dia inteiro", () => {
      expect(
        toExceptionPayload({
          date: "2026-09-15",
          allDay: true,
          startTime: "10:00",
          endTime: "11:00",
          type: "VACATION",
          reason: "Férias",
        }),
      ).toEqual({
        date: "2026-09-15",
        allDay: true,
        startTime: null,
        endTime: null,
        type: "VACATION",
        reason: "Férias",
      });
    });

    it("converte motivo vazio em null", () => {
      expect(
        toExceptionPayload({
          date: "2026-09-15",
          allDay: false,
          startTime: "10:00",
          endTime: "11:00",
          type: "BLOCK",
          reason: "",
        }),
      ).toMatchObject({ reason: null, startTime: "10:00", endTime: "11:00" });
    });
  });
});