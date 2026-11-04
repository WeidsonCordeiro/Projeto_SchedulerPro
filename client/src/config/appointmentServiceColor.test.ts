import { describe, expect, it } from "vitest";
import {
  getServiceCalendarStyle,
  getServicePaletteIndex,
  SERVICE_CALENDAR_FALLBACK,
  SERVICE_CALENDAR_PALETTE,
} from "./appointmentServiceColor";

describe("appointmentServiceColor", () => {
  it("returns the same style for the same service id", () => {
    const a = getServiceCalendarStyle("6a7f458a021b9a42c6d13d81");
    const b = getServiceCalendarStyle("6a7f458a021b9a42c6d13d81");
    expect(a).toEqual(b);
    expect(a.paletteIndex).toBeGreaterThanOrEqual(0);
    expect(a.paletteIndex).toBeLessThan(SERVICE_CALENDAR_PALETTE.length);
  });

  it("uses fallback for missing service id", () => {
    expect(getServiceCalendarStyle(null)).toEqual({
      backgroundColor: SERVICE_CALENDAR_FALLBACK.bg,
      color: SERVICE_CALENDAR_FALLBACK.fg,
      paletteIndex: -1,
    });
    expect(getServiceCalendarStyle("")).toEqual({
      backgroundColor: SERVICE_CALENDAR_FALLBACK.bg,
      color: SERVICE_CALENDAR_FALLBACK.fg,
      paletteIndex: -1,
    });
    expect(getServiceCalendarStyle("   ")).toMatchObject({
      paletteIndex: -1,
    });
  });

  it("maps different service ids to palette entries", () => {
    const ids = [
      "service-a",
      "service-b",
      "6a7f458a021b9a42c6d13d81",
      "6abe21cd4e5af331ea20c70c",
    ];
    const indices = new Set(ids.map((id) => getServicePaletteIndex(id)));
    expect(indices.size).toBeGreaterThan(1);
  });

  it("exposes deterministic palette index", () => {
    expect(getServicePaletteIndex("abc")).toBe(
      getServicePaletteIndex("abc"),
    );
  });
});
