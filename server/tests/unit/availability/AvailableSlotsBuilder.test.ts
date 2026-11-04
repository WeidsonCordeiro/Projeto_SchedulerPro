import { describe, expect, it } from "vitest";

import { buildAvailableSlots } from "../../../src/modules/availability/services/AvailableSlotsBuilder";

/**
 * ==========================================================
 * Testes do construtor PURO de slots.
 *
 * Aqui não há base de dados nem HTTP: entra a disponibilidade
 * semanal, as exceções e os agendamentos que bloqueiam, e sai
 * a lista de slots. As regras replicadas são as de
 * `AvailabilityService.ensureEmployeeAvailable` e
 * `AppointmentRepository.hasEmployeeConflict`; se um dos dois
 * mudar, estes testes têm de mudar com ele.
 * ==========================================================
 */

const TIMEZONE = "Europe/Lisbon";

/** Quinta-feira de 2026-10-08. */
const DATE = "2026-10-08";

/**
 * Instante de referência muito anterior à data, para que os
 * testes de dia útil não dependam do relógio.
 */
const NOW = new Date("2026-01-01T00:00:00.000Z");

const periods = (overrides: Record<string, string | null> = {}) => ({
  morningStart: "09:00",
  morningEnd: "12:00",
  afternoonStart: null,
  afternoonEnd: null,
  ...overrides,
});

const build = (overrides: Partial<Parameters<typeof buildAvailableSlots>[0]> = {}) =>
  buildAvailableSlots({
    dateKey: DATE,
    timezone: TIMEZONE,
    durationMinutes: 30,
    periods: periods(),
    exceptions: [],
    busy: [],
    now: NOW,
    ...overrides,
  });

const starts = (slots: Array<{ startAt: string }>) =>
  slots.map((slot) => slot.startAt);

/** "09:00" a partir do ISO com offset, para asserções legíveis. */
const localStartOf = (slots: Array<{ startAt: string }>) =>
  slots.map((slot) => slot.startAt.slice(11, 16));

describe("buildAvailableSlots", () => {
  describe("duração e passo", () => {
    it("gera slots de 30 minutos ancorados no início do período", () => {
      const slots = build({ durationMinutes: 30 });

      expect(localStartOf(slots)).toEqual([
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
      ]);
    });

    it("gera slots de 60 minutos com passo de 60", () => {
      const slots = build({ durationMinutes: 60 });

      expect(localStartOf(slots)).toEqual(["09:00", "10:00", "11:00"]);
    });

    it("o passo é a duração do serviço, não um passo fixo", () => {
      // 45 minutos não divide 09:00-12:00 em passos certos: o
      // slot das 11:00 acaba 11:45 e cabe; o das 11:45 acabaria
      // 12:30 e já não cabe.
      const slots = build({ durationMinutes: 45 });

      expect(localStartOf(slots)).toEqual([
        "09:00",
        "09:45",
        "10:30",
        "11:15",
      ]);
    });

    it("devolve o fim calculado a partir da duração", () => {
      const [slot] = build({ durationMinutes: 30 });

      expect(slot).toEqual({
        startAt: "2026-10-08T09:00:00.000+01:00",
        endAt: "2026-10-08T09:30:00.000+01:00",
      });
    });

    it("não devolve slots para duração zero ou negativa", () => {
      expect(build({ durationMinutes: 0 })).toEqual([]);
      expect(build({ durationMinutes: -30 })).toEqual([]);
    });
  });

  describe("períodos", () => {
    it("respeita um período só de manhã", () => {
      const slots = build({
        periods: {
          morningStart: "09:00",
          morningEnd: "10:00",
          afternoonStart: null,
          afternoonEnd: null,
        },
      });

      expect(localStartOf(slots)).toEqual(["09:00", "09:30"]);
    });

    it("respeita um período só de tarde", () => {
      const slots = build({
        periods: {
          morningStart: null,
          morningEnd: null,
          afternoonStart: "14:00",
          afternoonEnd: "15:00",
        },
      });

      expect(localStartOf(slots)).toEqual(["14:00", "14:30"]);
    });

    it("devolve os dois períodos quando os dois existem", () => {
      const slots = build({
        periods: {
          morningStart: "09:00",
          morningEnd: "10:00",
          afternoonStart: "14:00",
          afternoonEnd: "15:00",
        },
      });

      expect(localStartOf(slots)).toEqual(["09:00", "09:30", "14:00", "14:30"]);
    });

    it("um serviço maior que o período não devolve nenhum slot", () => {
      const slots = build({
        durationMinutes: 120,
        periods: {
          morningStart: "09:00",
          morningEnd: "10:00",
          afternoonStart: null,
          afternoonEnd: null,
        },
      });

      expect(slots).toEqual([]);
    });

    it("aceita o slot que acaba exactamente no fim do período", () => {
      const slots = build({
        durationMinutes: 60,
        periods: {
          morningStart: "09:00",
          morningEnd: "10:00",
          afternoonStart: null,
          afternoonEnd: null,
        },
      });

      expect(localStartOf(slots)).toEqual(["09:00"]);
    });

    it("exclui o slot que ultrapassaria o fim do período", () => {
      const slots = build({
        durationMinutes: 60,
        periods: {
          morningStart: "09:00",
          morningEnd: "10:30",
          afternoonStart: null,
          afternoonEnd: null,
        },
      });

      // 09:00-10:00 cabe; 10:00-11:00 já não cabe em 09:00-10:30.
      expect(localStartOf(slots)).toEqual(["09:00"]);
    });

    it("ignora um período incompleto (início igual ao fim)", () => {
      const slots = build({
        periods: {
          morningStart: "09:00",
          morningEnd: "09:00",
          afternoonStart: null,
          afternoonEnd: null,
        },
      });

      expect(slots).toEqual([]);
    });

    it("ignora um período invertido", () => {
      const slots = build({
        periods: {
          morningStart: "12:00",
          morningEnd: "09:00",
          afternoonStart: null,
          afternoonEnd: null,
        },
      });

      expect(slots).toEqual([]);
    });

    it("devolve vazio quando não há nenhum período configurado", () => {
      const slots = build({
        periods: {
          morningStart: null,
          morningEnd: null,
          afternoonStart: null,
          afternoonEnd: null,
        },
      });

      expect(slots).toEqual([]);
    });
  });

  describe("agendamentos existentes", () => {
    const busy = (startAt: string, endAt: string) => ({
      startAt: new Date(startAt),
      endAt: new Date(endAt),
    });

    it("remove o slot totalmente sobreposto", () => {
      const slots = build({
        busy: [busy("2026-10-08T09:00:00+01:00", "2026-10-08T09:30:00+01:00")],
      });

      expect(localStartOf(slots)).not.toContain("09:00");
      expect(localStartOf(slots)).toContain("09:30");
    });

    it("remove o slot com conflito parcial no início", () => {
      const slots = build({
        busy: [busy("2026-10-08T09:15:00+01:00", "2026-10-08T10:00:00+01:00")],
      });

      // 09:00-09:00+30 sobrepõe-se e 09:30-10:00 também.
      expect(localStartOf(slots)).toEqual(["10:00", "10:30", "11:00", "11:30"]);
    });

    it("remove o slot com conflito parcial no fim", () => {
      const slots = build({
        busy: [busy("2026-10-08T08:30:00+01:00", "2026-10-08T09:15:00+01:00")],
      });

      expect(localStartOf(slots)).toEqual(["09:30", "10:00", "10:30", "11:00", "11:30"]);
    });

    it("não remove slots que apenas se tocam nos limites", () => {
      const slots = build({
        busy: [
          busy("2026-10-08T08:30:00+01:00", "2026-10-08T09:00:00+01:00"),
          busy("2026-10-08T12:00:00+01:00", "2026-10-08T12:30:00+01:00"),
        ],
      });

      // Sobreposição estrita: 09:00 começa quando o anterior
      // acaba e 11:30 acaba quando o seguinte começa.
      expect(localStartOf(slots)).toEqual([
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
      ]);
    });

    it("ignora um agendamento com datas inválidas", () => {
      const slots = build({
        busy: [
          busy("data-invalida", "outra-data-invalida"),
        ],
      });

      expect(slots).toHaveLength(6);
    });
  });

  describe("exceções", () => {
    it("uma exceção de dia inteiro devolve vazio", () => {
      const slots = build({
        exceptions: [{ allDay: true, startTime: null, endTime: null }],
      });

      expect(slots).toEqual([]);
    });

    it("uma exceção parcial remove os slots sobrepostos", () => {
      const slots = build({
        exceptions: [
          { allDay: false, startTime: "09:30", endTime: "10:30" },
        ],
      });

      expect(localStartOf(slots)).toEqual(["09:00", "10:30", "11:00", "11:30"]);
    });

    it("não remove slots que terminam exactamente quando a exceção começa", () => {
      const slots = build({
        exceptions: [
          { allDay: false, startTime: "09:30", endTime: "10:30" },
        ],
      });

      expect(localStartOf(slots)).toContain("09:00");
    });

    it("não remove slots que começam exactamente quando a exceção acaba", () => {
      const slots = build({
        exceptions: [
          { allDay: false, startTime: "09:00", endTime: "09:30" },
        ],
      });

      expect(localStartOf(slots)).toContain("09:30");
    });

    it("uma exceção sem horários e sem allDay é ignorada", () => {
      const slots = build({
        exceptions: [{ allDay: false, startTime: null, endTime: null }],
      });

      expect(slots).toHaveLength(6);
    });

    it("uma exceção com apenas um horário é ignorada", () => {
      const slots = build({
        exceptions: [
          { allDay: false, startTime: "09:00", endTime: null },
          { allDay: false, startTime: null, endTime: "12:00" },
        ],
      });

      expect(slots).toHaveLength(6);
    });

    it.each(["BLOCK", "VACATION", "HOLIDAY"] as const)(
      "o tipo %s bloqueia da mesma forma",
      (type) => {
        const slots = build({
          exceptions: [
            { allDay: true, startTime: null, endTime: null, type } as never,
          ],
        });

        expect(slots).toEqual([]);
      },
    );

    it("combina exceção e agendamento sem duplicar trabalho", () => {
      const slots = build({
        exceptions: [
          { allDay: false, startTime: "09:00", endTime: "10:00" },
        ],
        busy: [
          {
            startAt: new Date("2026-10-08T10:00:00+01:00"),
            endAt: new Date("2026-10-08T10:30:00+01:00"),
          },
        ],
      });

      expect(localStartOf(slots)).toEqual(["10:30", "11:00", "11:30"]);
    });
  });

  describe("passado", () => {
    it("não devolve slots para um dia anterior ao dia corrente", () => {
      const slots = buildAvailableSlots({
        dateKey: DATE,
        timezone: TIMEZONE,
        durationMinutes: 30,
        periods: periods(),
        exceptions: [],
        busy: [],
        // 2026-10-09 em Lisboa: o dia 8 já passou.
        now: new Date("2026-10-09T12:00:00+01:00"),
      });

      expect(slots).toEqual([]);
    });

    it("no dia corrente só devolve o que ainda não começou", () => {
      const slots = build({
        // 10:15 em Lisboa no próprio dia.
        now: new Date("2026-10-08T10:15:00+01:00"),
      });

      expect(localStartOf(slots)).toEqual(["10:30", "11:00", "11:30"]);
    });

    it("no dia corrente exclui o slot que está a decorrer", () => {
      const slots = build({
        now: new Date("2026-10-08T09:30:00+01:00"),
      });

      // 09:00-09:30 já acabou; 09:30-10:00 começou agora e o
      // servidor rejeitaria `startAt <= now`.
      expect(localStartOf(slots)).not.toContain("09:00");
      expect(localStartOf(slots)).not.toContain("09:30");
    });

    it("devolve o dia inteiro quando o dia corrente ainda não chegou", () => {
      const slots = build({
        now: new Date("2026-10-08T08:00:00+01:00"),
      });

      expect(slots).toHaveLength(6);
    });

    it("devolve vazio para uma data futura sem disponibilidade", () => {
      const slots = build({
        now: new Date("2026-01-01T00:00:00.000Z"),
        dateKey: "2026-10-08",
        periods: {
          morningStart: null,
          morningEnd: null,
          afternoonStart: null,
          afternoonEnd: null,
        },
      });

      expect(slots).toEqual([]);
    });
  });

  describe("datas inválidas", () => {
    it("devolve vazio para uma data que não existe no calendário", () => {
      expect(build({ dateKey: "2026-02-30" })).toEqual([]);
    });

    it("devolve vazio para um mês impossível", () => {
      expect(build({ dateKey: "2026-13-01" })).toEqual([]);
    });

    it("devolve vazio para um texto que não é data", () => {
      expect(build({ dateKey: "amanhã" })).toEqual([]);
    });

    it("devolve vazio para um instante de referência inválido", () => {
      expect(build({ now: new Date(Number.NaN) })).toEqual([]);
    });
  });

  describe("timezone", () => {
    it("devolve os instantes com o offset da empresa, não em Z", () => {
      const [slot] = build();

      expect(slot.startAt).toContain("+01:00");
    });

    it("usa o offset de verão quando a data cai no verão", () => {
      // 2026-07-08 é WEST (+01:00 em Portugal Continental).
      const slots = buildAvailableSlots({
        dateKey: "2026-07-08",
        timezone: TIMEZONE,
        durationMinutes: 60,
        periods: periods(),
        exceptions: [],
        busy: [],
        now: new Date("2026-01-01T00:00:00.000Z"),
      });

      expect(slots[0].startAt).toBe("2026-07-08T09:00:00.000+01:00");
    });

    it("respeita um fuso diferente do do browser", () => {
      const slots = buildAvailableSlots({
        dateKey: DATE,
        // Empresa em Nova Iorque: 09:00 local é 14:00Z.
        timezone: "America/New_York",
        durationMinutes: 60,
        periods: periods(),
        exceptions: [],
        busy: [],
        now: new Date("2026-01-01T00:00:00.000Z"),
      });

      expect(slots[0].startAt).toBe("2026-10-08T09:00:00.000-04:00");
    });

    it("um fuso inválido não gera slots em vez de devolver Z", () => {
      const slots = buildAvailableSlots({
        dateKey: DATE,
        timezone: "Nao/Existe",
        durationMinutes: 60,
        periods: periods(),
        exceptions: [],
        busy: [],
        now: new Date("2026-01-01T00:00:00.000Z"),
      });

      expect(slots).toEqual([]);
    });

    it("o dia da semana segue o fuso da empresa, não o do instante", () => {
      // Nada disto é usado diretamente pelo construtor, mas
      // fixa o contrato: a data é local, o dia da semana
      // também.
      const slots = buildAvailableSlots({
        dateKey: "2026-10-08",
        timezone: "Pacific/Kiritimati",
        durationMinutes: 30,
        periods: periods(),
        exceptions: [],
        busy: [],
        now: new Date("2026-01-01T00:00:00.000Z"),
      });

      expect(slots[0].startAt).toBe("2026-10-08T09:00:00.000+14:00");
    });
  });

  describe("limites de segurança", () => {
    it("um período impossível não entra em ciclo infinito", () => {
      const started = Date.now();

      const slots = build({
        durationMinutes: 5,
        periods: {
          morningStart: "00:00",
          morningEnd: "23:59",
          afternoonStart: null,
          afternoonEnd: null,
        },
      });

      // 23h59 com passo de 5 min dá 288 slots; o limite é 300.
      expect(slots.length).toBeLessThanOrEqual(300);
      expect(Date.now() - started).toBeLessThan(2000);
    });

    it("devolve instantes ISO analisáveis", () => {
      for (const slot of build()) {
        expect(Number.isNaN(new Date(slot.startAt).getTime())).toBe(false);
        expect(Number.isNaN(new Date(slot.endAt).getTime())).toBe(false);
      }
    });

    it("o fim é sempre posterior ao início", () => {
      for (const slot of build({ durationMinutes: 45 })) {
        expect(
          new Date(slot.endAt).getTime(),
        ).toBeGreaterThan(new Date(slot.startAt).getTime());
      }
    });
  });
});