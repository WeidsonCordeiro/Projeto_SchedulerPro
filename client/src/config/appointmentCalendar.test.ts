import { describe, expect, it } from "vitest";
import {
  getMonthGridRange,
  getWeekRange,
  getDayRange,
  getWeekDayKeys,
  navigateMonth,
  navigateWeek,
  navigateDay,
  appointmentsForDay,
  toMinutesSinceMidnight,
  computeDayLayout,
  computeDayHourRange,
  isInstantInPast,
  isSlotHourInPast,
} from "./appointmentCalendar";
import type { Appointment } from "../types/appointment";

const TZ = "Europe/Lisbon";

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "appt1",
    companyId: "company1",
    clientId: "client1",
    serviceId: "service1",
    employeeId: "employee1",
    startAt: "2026-09-10T09:00:00.000Z",
    endAt: "2026-09-10T09:30:00.000Z",
    status: "scheduled",
    notes: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getMonthGridRange", () => {
  it("returns the 42-day window covering adjacent months", () => {
    const { startAt, endAt } = getMonthGridRange(2026, 9, TZ);
    // Setembro/2026 começa numa terça-feira → grid começa em 2026-08-31.
    expect(startAt).toBe("2026-08-30T23:00:00.000Z"); // 31/08 00:00 Europe/Lisbon
    expect(endAt).toBe("2026-10-11T23:00:00.000Z"); // 12/10 00:00 Europe/Lisbon
  });

  it("returns empty range for invalid month", () => {
    expect(getMonthGridRange(2026, 13, TZ)).toEqual({ startAt: "", endAt: "" });
  });
});

describe("getWeekRange", () => {
  it("returns monday-to-sunday UTC window containing the date", () => {
    const { startAt, endAt } = getWeekRange("2026-09-10", TZ);
    // 2026-09-10 é quinta-feira; a semana começa na segunda 07/09.
    expect(startAt).toBe("2026-09-06T23:00:00.000Z"); // 07/09 00:00 Lisbon
    expect(endAt).toBe("2026-09-13T23:00:00.000Z"); // 14/09 00:00 Lisbon
  });
});

describe("getDayRange", () => {
  it("returns the full day window in UTC", () => {
    const { startAt, endAt } = getDayRange("2026-09-10", TZ);
    expect(startAt).toBe("2026-09-09T23:00:00.000Z");
    expect(endAt).toBe("2026-09-10T23:00:00.000Z");
  });
});

describe("getWeekDayKeys", () => {
  it("returns 7 keys starting on monday", () => {
    expect(getWeekDayKeys("2026-09-10", TZ)).toEqual([
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
      "2026-09-13",
    ]);
  });
});

describe("navigation functions", () => {
  it("navigates months", () => {
    expect(navigateMonth("2026-09-10", 1, TZ)).toBe("2026-10-10");
    expect(navigateMonth("2026-09-10", -1, TZ)).toBe("2026-08-10");
    expect(navigateMonth("2026-03-31", -1, TZ)).toBe("2026-02-28");
  });

  it("navigates weeks", () => {
    expect(navigateWeek("2026-09-10", 1, TZ)).toBe("2026-09-17");
    expect(navigateWeek("2026-09-10", -1, TZ)).toBe("2026-09-03");
  });

  it("navigates days", () => {
    expect(navigateDay("2026-09-10", 1, TZ)).toBe("2026-09-11");
    expect(navigateDay("2026-09-10", -1, TZ)).toBe("2026-09-09");
  });
});

describe("appointmentsForDay", () => {
  it("filters appointments overlapping the given day", () => {
    const result = appointmentsForDay(
      [
        makeAppointment({ id: "a", startAt: "2026-09-10T08:00:00.000Z" }),
        makeAppointment({ id: "b", startAt: "2026-09-11T08:00:00.000Z" }),
        makeAppointment({ id: "c", startAt: "2026-09-10T22:00:00.000Z" }), // 23:00 Lisbon, ainda no dia 10
      ],
      "2026-09-10",
      TZ,
    );
    expect(result.map((a) => a.id)).toEqual(["a", "c"]);
  });

  it("sorts results by startAt", () => {
    const result = appointmentsForDay(
      [
        makeAppointment({ id: "late", startAt: "2026-09-10T10:00:00.000Z" }),
        makeAppointment({ id: "early", startAt: "2026-09-10T08:00:00.000Z" }),
      ],
      "2026-09-10",
      TZ,
    );
    expect(result.map((a) => a.id)).toEqual(["early", "late"]);
  });
});

describe("toMinutesSinceMidnight", () => {
  it("converts an instant to local minutes", () => {
    expect(toMinutesSinceMidnight("2026-09-10T09:00:00.000Z", TZ)).toBe(10 * 60);
    expect(toMinutesSinceMidnight("2026-09-10T07:30:00.000Z", TZ)).toBe(8 * 60 + 30);
  });
});

describe("computeDayLayout", () => {
  it("assigns columns to overlapping appointments", () => {
    const result = computeDayLayout(
      [
        makeAppointment({ id: "a", startAt: "2026-09-10T09:00:00.000Z", endAt: "2026-09-10T10:00:00.000Z" }),
        makeAppointment({ id: "b", startAt: "2026-09-10T09:30:00.000Z", endAt: "2026-09-10T10:30:00.000Z" }),
        makeAppointment({ id: "c", startAt: "2026-09-10T11:00:00.000Z", endAt: "2026-09-10T11:30:00.000Z" }),
      ],
      TZ,
      8 * 60,
      18 * 60,
    );
    const a = result.find((r) => r.appointment.id === "a")!;
    const b = result.find((r) => r.appointment.id === "b")!;
    const c = result.find((r) => r.appointment.id === "c")!;

    expect(a.column).not.toBe(b.column);
    expect(a.totalColumns).toBe(2);
    expect(b.totalColumns).toBe(2);
    expect(c.column).toBe(0);
    expect(c.totalColumns).toBe(1);
    expect(a.topPercent).toBeGreaterThan(0);
    expect(a.heightPercent).toBeGreaterThan(0);
  });

  it("clips blocks to the visible window", () => {
    const result = computeDayLayout(
      [
        makeAppointment({ id: "a", startAt: "2026-09-10T06:00:00.000Z", endAt: "2026-09-10T20:00:00.000Z" }),
      ],
      TZ,
      8 * 60,
      18 * 60,
    );
    const a = result[0];
    expect(a.heightPercent).toBe(100);
  });
});

describe("computeDayHourRange", () => {
  it("returns 08:00-20:00 for empty days", () => {
    expect(computeDayHourRange([], TZ)).toEqual({ startHour: 8, endHour: 20 });
  });

  it("adjusts to appointments with padding", () => {
    const result = computeDayHourRange(
      [
        makeAppointment({ id: "a", startAt: "2026-09-10T06:30:00.000Z", endAt: "2026-09-10T07:00:00.000Z" }),
        makeAppointment({ id: "b", startAt: "2026-09-10T21:00:00.000Z", endAt: "2026-09-10T22:00:00.000Z" }),
      ],
      TZ,
    );
    expect(result.startHour).toBe(6);
    expect(result.endHour).toBe(24);
  });
});

describe("isInstantInPast", () => {
  it("returns true when startAt is before now", () => {
    expect(isInstantInPast("2026-09-10T11:00:00.000Z", "2026-09-10T12:00:00.000Z")).toBe(true);
  });

  it("returns true when startAt equals now", () => {
    expect(isInstantInPast("2026-09-10T12:00:00.000Z", "2026-09-10T12:00:00.000Z")).toBe(true);
  });

  it("returns false when startAt is after now", () => {
    expect(isInstantInPast("2026-09-10T13:00:00.000Z", "2026-09-10T12:00:00.000Z")).toBe(false);
  });

  it("returns false for invalid ISO strings", () => {
    expect(isInstantInPast("not-a-date", "2026-09-10T12:00:00.000Z")).toBe(false);
  });
});

describe("isSlotHourInPast", () => {
  it("returns true for a slot hour before now in the given timezone", () => {
    // 10:00 Europe/Lisbon = 09:00 UTC; now 12:00 UTC = 13:00 Lisbon.
    expect(isSlotHourInPast("2026-09-10", 10, TZ, "2026-09-10T12:00:00.000Z")).toBe(true);
  });

  it("returns true when slot start equals now", () => {
    expect(isSlotHourInPast("2026-09-10", 12, TZ, "2026-09-10T12:00:00.000Z")).toBe(true);
  });

  it("returns false for a future slot hour", () => {
    // 14:00 Lisbon = 13:00 UTC; now 12:00 UTC. 14:00 Lisbon is future.
    expect(isSlotHourInPast("2026-09-10", 14, TZ, "2026-09-10T12:00:00.000Z")).toBe(false);
  });

  it("returns true for any slot on a day before today", () => {
    expect(isSlotHourInPast("2026-09-09", 9, TZ, "2026-09-10T12:00:00.000Z")).toBe(true);
  });

  it("returns false for any slot on a day after today", () => {
    expect(isSlotHourInPast("2026-09-11", 9, TZ, "2026-09-10T12:00:00.000Z")).toBe(false);
  });

  it("returns false for invalid inputs", () => {
    expect(isSlotHourInPast("not-a-date", 10, TZ, "2026-09-10T12:00:00.000Z")).toBe(false);
  });
});