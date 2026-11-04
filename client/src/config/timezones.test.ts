import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import {
  filterIanaTimezones,
  formatTimezoneOptionLabel,
  getIanaTimezones,
  isValidIanaTimezone,
} from "./timezones";

function expectedLabelForZone(zone: string): string {
  const localNow = DateTime.now().setZone(zone);
  const offset = localNow.toFormat("ZZ");
  return `(UTC${offset}) ${zone}`;
}

describe("getIanaTimezones", () => {
  it("returns a complete list of IANA timezones", () => {
    const zones = getIanaTimezones();

    expect(zones.length).toBeGreaterThanOrEqual(100);
    expect(zones).toContain("Europe/Lisbon");
    expect(zones).toContain("Europe/London");
    expect(zones).toContain("America/Sao_Paulo");
    expect(zones).toContain("America/New_York");
  });

  it("returns a sorted list without duplicates", () => {
    const zones = getIanaTimezones();

    const sorted = [...zones].sort((a, b) => a.localeCompare(b, "en"));
    expect(zones).toEqual(sorted);
    expect(new Set(zones).size).toBe(zones.length);
  });
});

describe("isValidIanaTimezone", () => {
  it("accepts real IANA zones", () => {
    expect(isValidIanaTimezone("Europe/Lisbon")).toBe(true);
    expect(isValidIanaTimezone("America/Sao_Paulo")).toBe(true);
    expect(isValidIanaTimezone("UTC")).toBe(true);
  });

  it("rejects arbitrary or malformed text", () => {
    expect(isValidIanaTimezone("")).toBe(false);
    expect(isValidIanaTimezone("nao-existe/zona")).toBe(false);
    expect(isValidIanaTimezone("Europe/Lisbon ")).toBe(false);
    expect(isValidIanaTimezone(" ")).toBe(false);
  });
});

describe("formatTimezoneOptionLabel", () => {
  it("formats Europe/Lisbon with offset from Luxon at now", () => {
    expect(formatTimezoneOptionLabel("Europe/Lisbon")).toBe(
      expectedLabelForZone("Europe/Lisbon"),
    );
  });

  it("formats a zone with a different offset than Lisbon at now", () => {
    const lisbonOffset = DateTime.now()
      .setZone("Europe/Lisbon")
      .toFormat("ZZ");
    const saoPauloOffset = DateTime.now()
      .setZone("America/Sao_Paulo")
      .toFormat("ZZ");

    expect(formatTimezoneOptionLabel("America/Sao_Paulo")).toBe(
      expectedLabelForZone("America/Sao_Paulo"),
    );
    expect(saoPauloOffset).not.toBe(lisbonOffset);
  });

  it("returns the raw identifier for an invalid zone", () => {
    expect(formatTimezoneOptionLabel("nao-existe/zona")).toBe("nao-existe/zona");
  });
});

describe("filterIanaTimezones", () => {
  const sampleZones = [
    "America/New_York",
    "Europe/Lisbon",
    "Asia/Tokyo",
  ];

  it("matches by IANA identifier", () => {
    expect(filterIanaTimezones(sampleZones, "Europe/Lisbon")).toEqual([
      "Europe/Lisbon",
    ]);
  });

  it("matches case-insensitively on the identifier", () => {
    expect(filterIanaTimezones(sampleZones, "TOKYO")).toEqual(["Asia/Tokyo"]);
  });

  it("matches text present in the formatted label", () => {
    const lisbonLabel = formatTimezoneOptionLabel("Europe/Lisbon");
    const offsetSnippet = lisbonLabel.match(/UTC[+-]\d{2}:\d{2}/)?.[0];
    expect(offsetSnippet).toBeDefined();

    expect(
      filterIanaTimezones(sampleZones, offsetSnippet as string),
    ).toContain("Europe/Lisbon");
  });

  it("returns a copy of the full list when the query is empty or whitespace", () => {
    expect(filterIanaTimezones(sampleZones, "")).toEqual(sampleZones);
    expect(filterIanaTimezones(sampleZones, "   ")).toEqual(sampleZones);
    expect(filterIanaTimezones(sampleZones, "")).not.toBe(sampleZones);
  });

  it("returns no matches when nothing matches", () => {
    expect(filterIanaTimezones(sampleZones, "Antartica/Nowhere")).toEqual([]);
  });

  it("preserves the original order and does not mutate the input array", () => {
    const zones = ["Zulu/Last", "America/New_York", "Europe/Lisbon"];
    const snapshot = [...zones];

    const filtered = filterIanaTimezones(zones, "America");
    expect(filtered).toEqual(["America/New_York"]);
    expect(zones).toEqual(snapshot);
  });

  it("trims and normalizes excess whitespace in the query", () => {
    expect(filterIanaTimezones(sampleZones, "  europe/lisbon  ")).toEqual([
      "Europe/Lisbon",
    ]);
  });
});
