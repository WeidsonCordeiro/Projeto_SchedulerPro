import { describe, expect, it } from "vitest";
import {
  resolveTimeGridHourHeightPx,
  TIME_GRID_HOUR_HEIGHT_DESKTOP_PX,
  TIME_GRID_HOUR_HEIGHT_MOBILE_PX,
} from "./calendarTimeGridLayout";

describe("calendarTimeGridLayout", () => {
  it("uses mobile hour height below desktop breakpoint", () => {
    expect(resolveTimeGridHourHeightPx(false)).toBe(
      TIME_GRID_HOUR_HEIGHT_MOBILE_PX,
    );
  });

  it("uses taller hour height on desktop", () => {
    expect(resolveTimeGridHourHeightPx(true)).toBe(
      TIME_GRID_HOUR_HEIGHT_DESKTOP_PX,
    );
  });
});
