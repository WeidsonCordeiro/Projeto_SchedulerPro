import { describe, expect, it } from "vitest";

import { isValidIsoInstant } from "../../../src/utils/iso-instant";

describe("isValidIsoInstant", () => {
  it.each([
    "2026-10-20T09:00:00Z",
    "2026-10-20T09:00:00.000Z",
    "2026-10-20T09:00:00+01:00",
    "2026-10-20T09:00:00-03:00",
    "2027-08-29T08:00:00.000Z",
  ])("aceita instante explícito %s", (value) => {
    expect(isValidIsoInstant(value)).toBe(true);
  });

  it.each([
    "2026-10-20T09:00:00",
    "2026-10-20",
    "not-a-date",
    "2026-02-30",
    "2026-02-30T09:00:00Z",
    "2026-02-30T09:00:00+01:00",
  ])("rejeita %s", (value) => {
    expect(isValidIsoInstant(value)).toBe(false);
  });

  it.each(["UTC", "Europe/Lisbon"])(
    "não depende do TZ do processo para Z (TZ=%s)",
    (tz) => {
      const previous = process.env.TZ;
      process.env.TZ = tz;
      try {
        expect(isValidIsoInstant("2027-08-29T08:00:00.000Z")).toBe(true);
        expect(isValidIsoInstant("2027-08-29T08:00:00")).toBe(false);
      } finally {
        process.env.TZ = previous;
      }
    },
  );
});
