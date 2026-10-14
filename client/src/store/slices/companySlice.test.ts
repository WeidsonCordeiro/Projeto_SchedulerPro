import { describe, expect, it } from "vitest";
import companyReducer, {
  clearCompany,
  initialState,
  resolveEffectiveCompanyTimezone,
  selectCompany,
  selectCompanyTimezone,
  setCompany,
} from "./companySlice";
import type { AuthUser } from "../../types/auth";
import type { Company } from "../../types/company";

const company: Company = {
  id: "507f1f77bcf86cd799439012",
  name: "salao do centro",
  timezone: "America/Sao_Paulo",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const authUser = (extra: Partial<AuthUser> = {}): AuthUser => ({
  id: "507f1f77bcf86cd799439011",
  name: "Teste",
  email: "test@example.com",
  role: "MANAGER",
  companyId: company.id,
  isActive: true,
  ...extra,
});

describe("companySlice", () => {
  it("has the correct initial state", () => {
    expect(initialState).toEqual({ company: null });
  });

  it("stores the company loaded from the authenticated backend", () => {
    const state = companyReducer(initialState, setCompany(company));

    expect(state.company).toEqual(company);
    expect("accessToken" in state).toBe(false);
    expect("refreshToken" in state).toBe(false);
  });

  it("clears the company on demand", () => {
    const loaded = companyReducer(initialState, setCompany(company));
    const state = companyReducer(loaded, clearCompany());

    expect(state.company).toBeNull();
  });
});

describe("selectCompany", () => {
  it("returns the company when present", () => {
    expect(selectCompany({ company: { company } })).toEqual(company);
  });

  it("returns null when not loaded", () => {
    expect(selectCompany({ company: { company: null } })).toBeNull();
  });

  it("tolerates a store without the company slice", () => {
    expect(selectCompany({} as never)).toBeNull();
  });
});

describe("resolveEffectiveCompanyTimezone", () => {
  it("prefers a valid company timezone over the session", () => {
    expect(
      resolveEffectiveCompanyTimezone("America/Sao_Paulo", "Europe/Lisbon"),
    ).toBe("America/Sao_Paulo");
  });

  it("uses the session when the company timezone is absent or invalid", () => {
    expect(resolveEffectiveCompanyTimezone(null, "America/Sao_Paulo")).toBe(
      "America/Sao_Paulo",
    );
    expect(resolveEffectiveCompanyTimezone("Invalid/Zone", "Europe/London")).toBe(
      "Europe/London",
    );
  });

  it("falls back to Europe/Lisbon when both are missing or invalid", () => {
    expect(resolveEffectiveCompanyTimezone(null, undefined)).toBe(
      "Europe/Lisbon",
    );
    expect(resolveEffectiveCompanyTimezone("Bad/Zone", "Also/Bad")).toBe(
      "Europe/Lisbon",
    );
  });
});

describe("selectCompanyTimezone", () => {
  it("uses the real company timezone when loaded", () => {
    expect(
      selectCompanyTimezone({
        company: { company },
        auth: { user: authUser({ companyTimezone: "Europe/Lisbon" }) },
      }),
    ).toBe("America/Sao_Paulo");
  });

  it("uses auth.user.companyTimezone when the company is not loaded", () => {
    expect(
      selectCompanyTimezone({
        company: { company: null },
        auth: { user: authUser({ companyTimezone: "America/Sao_Paulo" }) },
      }),
    ).toBe("America/Sao_Paulo");
  });

  it("falls back to the default when the company is not loaded and session has no field", () => {
    expect(
      selectCompanyTimezone({
        company: { company: null },
        auth: { user: authUser() },
      }),
    ).toBe("Europe/Lisbon");
  });

  it("tolerates a store without the company or auth slice", () => {
    expect(selectCompanyTimezone({} as never)).toBe("Europe/Lisbon");
  });
});
