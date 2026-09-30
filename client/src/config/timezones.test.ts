import { describe, expect, it } from "vitest";
import { getIanaTimezones, isValidIanaTimezone } from "./timezones";

describe("getIanaTimezones", () => {
  it("returns a complete list of IANA timezones", () => {
    const zones = getIanaTimezones();

    // Uma lista completa tem muito além dos exemplos citados na task.
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