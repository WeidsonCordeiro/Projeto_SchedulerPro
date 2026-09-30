import { describe, expect, it } from "vitest";
import { toPeriodPayload, validateDayDraft } from "./availabilityRules";

describe("validateDayDraft", () => {
  it("accepts a complete morning-only period", () => {
    expect(
      validateDayDraft({
        morningStart: "09:00",
        morningEnd: "12:00",
        afternoonStart: "",
        afternoonEnd: "",
      }),
    ).toBeNull();
  });

  it("accepts a complete afternoon-only period", () => {
    expect(
      validateDayDraft({
        morningStart: "",
        morningEnd: "",
        afternoonStart: "13:00",
        afternoonEnd: "18:00",
      }),
    ).toBeNull();
  });

  it("accepts both periods when they do not overlap", () => {
    expect(
      validateDayDraft({
        morningStart: "09:00",
        morningEnd: "12:00",
        afternoonStart: "12:00",
        afternoonEnd: "18:00",
      }),
    ).toBeNull();
  });

  it("rejects an empty day", () => {
    expect(
      validateDayDraft({
        morningStart: "",
        morningEnd: "",
        afternoonStart: "",
        afternoonEnd: "",
      }),
    ).toBe("Informe pelo menos um período de disponibilidade.");
  });

  it("rejects an incomplete morning pair", () => {
    expect(
      validateDayDraft({
        morningStart: "09:00",
        morningEnd: "",
        afternoonStart: "",
        afternoonEnd: "",
      }),
    ).toBe("Informe o horário inicial e final da manhã.");
  });

  it("rejects an incomplete afternoon pair", () => {
    expect(
      validateDayDraft({
        morningStart: "",
        morningEnd: "",
        afternoonStart: "13:00",
        afternoonEnd: "",
      }),
    ).toBe("Informe o horário inicial e final da tarde.");
  });

  it("rejects morning start after morning end", () => {
    expect(
      validateDayDraft({
        morningStart: "12:00",
        morningEnd: "09:00",
        afternoonStart: "",
        afternoonEnd: "",
      }),
    ).toBe("O horário inicial da manhã deve ser anterior ao horário final.");
  });

  it("rejects afternoon start after afternoon end", () => {
    expect(
      validateDayDraft({
        morningStart: "",
        morningEnd: "",
        afternoonStart: "18:00",
        afternoonEnd: "13:00",
      }),
    ).toBe("O horário inicial da tarde deve ser anterior ao horário final.");
  });

  it("rejects overlapping periods (morning end after afternoon start)", () => {
    expect(
      validateDayDraft({
        morningStart: "09:00",
        morningEnd: "13:30",
        afternoonStart: "13:00",
        afternoonEnd: "18:00",
      }),
    ).toBe("O período da manhã não pode sobrepor o período da tarde.");
  });

  it("rejects malformed times with an HH:mm message", () => {
    expect(
      validateDayDraft({
        morningStart: "9am",
        morningEnd: "12:00",
        afternoonStart: "",
        afternoonEnd: "",
      }),
    ).toBe("Horário inicial da manhã inválido. Use HH:mm.");
  });

  it("rejects times out of the 00:00-23:59 range", () => {
    expect(
      validateDayDraft({
        morningStart: "24:00",
        morningEnd: "12:00",
        afternoonStart: "",
        afternoonEnd: "",
      }),
    ).toBe("Horário inicial da manhã inválido. Use HH:mm.");
  });

  it("rejects a malformed morning end time", () => {
    expect(
      validateDayDraft({
        morningStart: "09:00",
        morningEnd: "25:00",
        afternoonStart: "",
        afternoonEnd: "",
      }),
    ).toBe("Horário final da manhã inválido. Use HH:mm.");
  });

  it("rejects a malformed afternoon start time", () => {
    expect(
      validateDayDraft({
        morningStart: "",
        morningEnd: "",
        afternoonStart: "abc",
        afternoonEnd: "18:00",
      }),
    ).toBe("Horário inicial da tarde inválido. Use HH:mm.");
  });

  it("rejects a malformed afternoon end time", () => {
    expect(
      validateDayDraft({
        morningStart: "",
        morningEnd: "",
        afternoonStart: "13:00",
        afternoonEnd: "18:75",
      }),
    ).toBe("Horário final da tarde inválido. Use HH:mm.");
  });
});

describe("toPeriodPayload", () => {
  it("keeps untouched local HH:mm strings and converts empties to null", () => {
    expect(
      toPeriodPayload({
        morningStart: "09:00",
        morningEnd: "12:00",
        afternoonStart: "",
        afternoonEnd: "",
      }),
    ).toEqual({
      morningStart: "09:00",
      morningEnd: "12:00",
      afternoonStart: null,
      afternoonEnd: null,
    });
  });
});