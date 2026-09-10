import { DateTime } from "luxon";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAvailableSlots, hasAvailabilityOnDay } from "./appointmentSlots";
import type { Availability } from "../types/availability";
import type { Appointment } from "../types/appointment";

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

/**
 * Agenda um appointment para employee1 em horário local da empresa
 * (Europe/Lisbon). O instante UTC é computado com Luxon para refletir a soma
 * de offets de horário de verão.
 */
function makeAppointment(
  dateKey: string,
  time: string,
  durationMinutes: number,
  overrides: Partial<Appointment> = {},
): Appointment {
  const start = DateTime.fromISO(`${dateKey}T${time}`, { zone: "Europe/Lisbon" });
  const end = start.plus({ minutes: durationMinutes });
  return {
    id: "appt1",
    companyId: "company1",
    clientId: "client1",
    serviceId: "service1",
    employeeId: "employee1",
    startAt: start.toUTC().toISO() ?? "",
    endAt: end.toUTC().toISO() ?? "",
    status: "scheduled",
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const DAY = "2026-09-15"; // terça-feira (dayOfWeek 2)

function slotTimes(slots: { localTime: string }[]): string[] {
  return slots.map((slot) => slot.localTime);
}

describe("appointmentSlots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("caso 1: gera slots de 30min em um período de 09:00 a 12:00", () => {
    const slots = getAvailableSlots({
      dateKey: DAY,
      employeeId: "employee1",
      availability: [makeAvailability()],
      durationMinutes: 30,
    });

    expect(slotTimes(slots)).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
    ]);
  });

  it("caso 2: não gera slot que termina além do período", () => {
    const slots = getAvailableSlots({
      dateKey: DAY,
      employeeId: "employee1",
      availability: [makeAvailability({ morningEnd: "10:30" })],
      durationMinutes: 60,
    });

    expect(slotTimes(slots)).toEqual(["09:00"]);
  });

  it("caso 2c: gera o último slot que termina exatamente no fim do período", () => {
    const slots = getAvailableSlots({
      dateKey: DAY,
      employeeId: "employee1",
      availability: [makeAvailability({ morningEnd: "12:00" })],
      durationMinutes: 60,
    });

    expect(slotTimes(slots)).toEqual(["09:00", "10:00", "11:00"]);
  });

  it("caso 2b: período menor que o serviço não gera nenhum slot", () => {
    const slots = getAvailableSlots({
      dateKey: DAY,
      employeeId: "employee1",
      availability: [makeAvailability({ morningEnd: "09:30" })],
      durationMinutes: 60,
    });

    expect(slots).toEqual([]);
  });

  it("caso 3: manhã e tarde não geram slots no intervalo entre períodos", () => {
    const slots = getAvailableSlots({
      dateKey: DAY,
      employeeId: "employee1",
      availability: [
        makeAvailability({
          morningEnd: "12:00",
          afternoonStart: "14:00",
          afternoonEnd: "18:00",
        }),
      ],
      durationMinutes: 30,
    });

    const times = slotTimes(slots);
    expect(times).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
      "16:00",
      "16:30",
      "17:00",
      "17:30",
    ]);
    expect(times).not.toContain("12:00");
    expect(times).not.toContain("12:30");
    expect(times).not.toContain("13:00");
    expect(times).not.toContain("13:30");
  });

  it("caso 4: appointment ocupando um horário remove exatamente esse slot", () => {
    const slots = getAvailableSlots({
      dateKey: DAY,
      employeeId: "employee1",
      availability: [makeAvailability()],
      durationMinutes: 30,
      appointments: [makeAppointment(DAY, "10:00", 30)],
    });

    const times = slotTimes(slots);
    expect(times).not.toContain("10:00");
    expect(times).toContain("09:30");
    expect(times).toContain("10:30");
  });

  it("caso 5: appointment que começa antes e termina dentro gera conflito", () => {
    const slots = getAvailableSlots({
      dateKey: DAY,
      employeeId: "employee1",
      availability: [makeAvailability()],
      durationMinutes: 30,
      // 09:45 - 10:15 local
      appointments: [makeAppointment(DAY, "09:45", 30)],
    });

    expect(slotTimes(slots)).not.toContain("09:30");
    expect(slotTimes(slots)).not.toContain("10:00");
    expect(slotTimes(slots)).toContain("09:00");
  });

  it("caso 6: appointment que começa dentro e termina depois gera conflito", () => {
    const slots = getAvailableSlots({
      dateKey: DAY,
      employeeId: "employee1",
      availability: [makeAvailability()],
      durationMinutes: 30,
      // 10:15 - 11:15 local
      appointments: [makeAppointment(DAY, "10:15", 60)],
    });

    const times = slotTimes(slots);
    expect(times).not.toContain("10:00");
    expect(times).not.toContain("10:30");
    expect(times).not.toContain("11:00");
    expect(times).toContain("09:30");
  });

  it("caso 7: appointment que engloba completamente o slot gera conflito", () => {
    const slots = getAvailableSlots({
      dateKey: DAY,
      employeeId: "employee1",
      availability: [makeAvailability()],
      durationMinutes: 30,
      // 09:30 - 10:30 local
      appointments: [makeAppointment(DAY, "09:30", 60)],
    });

    const times = slotTimes(slots);
    expect(times).not.toContain("09:30");
    expect(times).not.toContain("10:00");
    expect(times).toContain("09:00");
  });

  it("caso 8: status terminais não bloqueiam o horário (regra real do backend)", () => {
    const scheduled = getAvailableSlots({
      dateKey: DAY,
      employeeId: "employee1",
      availability: [makeAvailability()],
      durationMinutes: 30,
      appointments: [makeAppointment(DAY, "10:00", 30)],
    });
    expect(slotTimes(scheduled)).not.toContain("10:00");

    for (const status of ["completed", "cancelled", "no-show"] as const) {
      const slots = getAvailableSlots({
        dateKey: DAY,
        employeeId: "employee1",
        availability: [makeAvailability()],
        durationMinutes: 30,
        appointments: [
          makeAppointment(DAY, "10:00", 30, {
            id: "terminal",
            status,
          }),
        ],
      });
      expect(slotTimes(slots)).toContain("10:00");
    }
  });

  it("caso 9: edição ignora o próprio agendamento como conflito", () => {
    const own = makeAppointment(DAY, "10:00", 30, { id: "editando" });
    const slots = getAvailableSlots({
      dateKey: DAY,
      employeeId: "employee1",
      availability: [makeAvailability()],
      durationMinutes: 30,
      appointments: [own],
      excludeAppointmentId: "editando",
    });

    expect(slotTimes(slots)).toContain("10:00");
  });

  it("caso 10: DST verão — instante UTC correto para horário local", () => {
    const slots = getAvailableSlots({
      dateKey: "2026-07-15",
      employeeId: "employee1",
      availability: [makeAvailability({ dayOfWeek: 3 })],
      durationMinutes: 30,
    });

    expect(slots[0].localTime).toBe("09:00");
    expect(slots[0].start).toBe("2026-07-15T08:00:00.000Z");
    expect(slots[0].end).toBe("2026-07-15T08:30:00.000Z");
  });

  it("caso 10b: DST inverno — sem offset em Europe/Lisbon", () => {
    const slots = getAvailableSlots({
      dateKey: "2026-01-15",
      employeeId: "employee1",
      availability: [makeAvailability({ dayOfWeek: 4 })],
      durationMinutes: 30,
    });

    expect(slots[0].localTime).toBe("09:00");
    expect(slots[0].start).toBe("2026-01-15T09:00:00.000Z");
  });

  it("caso 10c: DST transição de primavera (2026-03-29) mantém o horário local correto", () => {
    const slots = getAvailableSlots({
      dateKey: "2026-03-29",
      employeeId: "employee1",
      availability: [makeAvailability({ dayOfWeek: 0 })],
      durationMinutes: 30,
    });

    expect(slots[0].localTime).toBe("09:00");
    expect(slots[0].start).toBe("2026-03-29T08:00:00.000Z");
    expect(slots[0].end).toBe("2026-03-29T08:30:00.000Z");
  });

  it("respeita um timezone explícito (America/Sao_Paulo)", () => {
    const slots = getAvailableSlots({
      dateKey: "2026-07-15",
      employeeId: "employee1",
      availability: [makeAvailability({ dayOfWeek: 3 })],
      durationMinutes: 30,
      timezone: "America/Sao_Paulo",
    });

    expect(slots[0].localTime).toBe("09:00");
    expect(slots[0].start).toBe("2026-07-15T12:00:00.000Z");
  });

  it("retorna vazio sem registro de disponibilidade para o dia", () => {
    const slots = getAvailableSlots({
      dateKey: "2026-09-13", // domingo sem registro
      employeeId: "employee1",
      availability: [makeAvailability()],
      durationMinutes: 30,
    });

    expect(slots).toEqual([]);
  });

  it("retorna vazio para data inválida", () => {
    const slots = getAvailableSlots({
      dateKey: "not-a-date",
      employeeId: "employee1",
      availability: [makeAvailability()],
      durationMinutes: 30,
    });

    expect(slots).toEqual([]);
  });

  it("retorna vazio quando o registro não possui período completo", () => {
    const slots = getAvailableSlots({
      dateKey: DAY,
      employeeId: "employee1",
      availability: [makeAvailability({ morningStart: null, morningEnd: null })],
      durationMinutes: 30,
    });

    expect(slots).toEqual([]);
  });

  it("ignora períodos com horários inválidos em vez de quebrar", () => {
    const slots = getAvailableSlots({
      dateKey: DAY,
      employeeId: "employee1",
      availability: [
        makeAvailability({
          // fim inválido -> não alcança o cursor
          morningEnd: "99:30",
          // início inválido -> não alcança o cursor
          afternoonStart: "99:00",
          afternoonEnd: "99:30",
        }),
      ],
      durationMinutes: 30,
    });

    expect(slots).toEqual([]);
  });

  it("ignora agendamentos com instantes inválidos ao calcular conflitos", () => {
    const slots = getAvailableSlots({
      dateKey: DAY,
      employeeId: "employee1",
      availability: [makeAvailability()],
      durationMinutes: 30,
      appointments: [
        makeAppointment(DAY, "10:00", 30, {
          id: "invalid",
          startAt: "not-a-date",
          endAt: "also-not-a-date",
        }),
      ],
    });

    expect(slotTimes(slots)).toContain("10:00");
  });

  it("retorna vazio para duração inválida", () => {
    const slots = getAvailableSlots({
      dateKey: DAY,
      employeeId: "employee1",
      availability: [makeAvailability()],
      durationMinutes: 0,
    });

    expect(slots).toEqual([]);
  });

  it("não considera agendamentos de outro funcionário como conflito", () => {
    const other = makeAppointment(DAY, "10:00", 30, {
      employeeId: "employee2",
      id: "outro",
    });
    const slots = getAvailableSlots({
      dateKey: DAY,
      employeeId: "employee1",
      availability: [makeAvailability()],
      durationMinutes: 30,
      appointments: [other],
    });

    expect(slotTimes(slots)).toContain("10:00");
  });

  describe("hasAvailabilityOnDay", () => {
    it("retorna true para um dia com período completo", () => {
      expect(hasAvailabilityOnDay([makeAvailability()], DAY)).toBe(true);
    });

    it("retorna true quando ao menos a tarde está completa", () => {
      expect(
        hasAvailabilityOnDay(
          [makeAvailability({ morningStart: null, morningEnd: null, afternoonStart: "14:00", afternoonEnd: "18:00" })],
          DAY,
        ),
      ).toBe(true);
    });

    it("retorna false sem registro para o dia", () => {
      expect(hasAvailabilityOnDay([makeAvailability()], "2026-09-13")).toBe(false);
    });

    it("retorna false quando os períodos estão incompletos", () => {
      expect(
        hasAvailabilityOnDay(
          [makeAvailability({ morningStart: null, morningEnd: null, afternoonStart: null, afternoonEnd: null })],
          DAY,
        ),
      ).toBe(false);
    });

    it("retorna false para data inválida", () => {
      expect(hasAvailabilityOnDay([makeAvailability()], "not-a-date")).toBe(false);
    });
  });
});