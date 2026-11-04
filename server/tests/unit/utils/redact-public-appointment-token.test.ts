import { describe, expect, it } from "vitest";
import { redactPublicAppointmentToken } from "../../../src/utils/redact-public-appointment-token";

describe("redactPublicAppointmentToken", () => {
  it("redacts the token path while preserving the rest of the URL", () => {
    const token = "aB3-_xYzPublicToken0123456789abcdefghij";

    expect(
      redactPublicAppointmentToken(
        `/api/public/appointments/${token}?source=test`,
      ),
    ).toBe("/api/public/appointments/[REDACTED]?source=test");
  });

  it("does not change unrelated paths or path prefixes", () => {
    expect(redactPublicAppointmentToken("/api/public/companies/company1/services"))
      .toBe("/api/public/companies/company1/services");
    expect(redactPublicAppointmentToken("/api/public/appointments"))
      .toBe("/api/public/appointments");
  });
});
