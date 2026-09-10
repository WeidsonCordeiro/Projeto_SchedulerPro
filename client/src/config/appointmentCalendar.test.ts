import { describe, expect, it } from "vitest";
import { buildMonthGrid, WEEKDAYS_SHORT } from "./appointmentCalendar";

describe("appointmentCalendar", () => {
  it("starts weeks on Monday (segunda)", () => {
    expect(WEEKDAYS_SHORT).toEqual([
      "Seg",
      "Ter",
      "Qua",
      "Qui",
      "Sex",
      "Sáb",
      "Dom",
    ]);
  });

  it("builds a 42-cell grid starting on the Monday of the first week", () => {
    const cells = buildMonthGrid(2026, 9, "Europe/Lisbon", "2026-09-10");

    expect(cells).toHaveLength(42);
    expect(cells[0].date).toBe("2026-08-31"); // segunda antes de set/2026
    expect(cells[0].isCurrentMonth).toBe(false);
    expect(cells[0].dayOfMonth).toBe(31);

    const first = cells.find((cell) => cell.date === "2026-09-01");
    expect(first).toBeDefined();
    expect(first?.isCurrentMonth).toBe(true);
    expect(first?.dayOfMonth).toBe(1);
  });

  it("marks today when a reference date is provided", () => {
    const cells = buildMonthGrid(2026, 9, "Europe/Lisbon", "2026-09-10");

    expect(cells.find((cell) => cell.date === "2026-09-10")?.isToday).toBe(true);
    expect(cells.find((cell) => cell.date === "2026-09-11")?.isToday).toBe(false);
  });

  it("returns an empty grid for an invalid month", () => {
    expect(buildMonthGrid(2026, 13)).toEqual([]);
  });
});