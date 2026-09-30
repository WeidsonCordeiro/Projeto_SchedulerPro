import { describe, expect, it } from "vitest";
import companyReducer, {
  clearCompany,
  initialState,
  selectCompany,
  selectCompanyTimezone,
  setCompany,
} from "./companySlice";
import type { Company } from "../../types/company";

const company: Company = {
  id: "507f1f77bcf86cd799439012",
  name: "salao do centro",
  timezone: "America/Sao_Paulo",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("companySlice", () => {
  it("has the correct initial state", () => {
    expect(initialState).toEqual({ company: null });
  });

  it("stores the company loaded from the authenticated backend", () => {
    const state = companyReducer(initialState, setCompany(company));

    expect(state.company).toEqual(company);
    // Campos administrativos não são guardados no estado da sessão além do
    // contrato real; nenhum token/credencial entra aqui.
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

describe("selectCompanyTimezone", () => {
  it("uses the real company timezone when loaded", () => {
    expect(
      selectCompanyTimezone({ company: { company } }),
    ).toBe("America/Sao_Paulo");
  });

  it("falls back to the default timezone when the company is not loaded", () => {
    expect(selectCompanyTimezone({ company: { company: null } })).toBe(
      "Europe/Lisbon",
    );
  });

  it("tolerates a store without the company slice", () => {
    expect(selectCompanyTimezone({} as never)).toBe("Europe/Lisbon");
  });
});