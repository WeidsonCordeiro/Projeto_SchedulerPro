import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { computeNowLineTopPx } from "./calendarNowLine";

describe("computeNowLineTopPx", () => {
  it("returns null when the current time is outside the visible hour range", () => {
    const at = DateTime.fromISO("2026-09-10T06:30:00", { zone: "Europe/Lisbon" });
    expect(computeNowLineTopPx("Europe/Lisbon", 8, 18, 48, at)).toBeNull();
  });

  it("positions the line proportionally within the grid", () => {
    const at = DateTime.fromISO("2026-09-10T13:00:00", { zone: "Europe/Lisbon" });
    const top = computeNowLineTopPx("Europe/Lisbon", 8, 18, 48, at);
    expect(top).not.toBeNull();
    // 13:00 is halfway between 08:00 and 18:00 → half of 10 * 48px
    expect(top).toBeCloseTo(240, 1);
  });
});
