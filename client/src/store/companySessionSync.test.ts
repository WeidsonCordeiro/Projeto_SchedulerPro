import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, it } from "vitest";
import authReducer from "./slices/authSlice";
import companyReducer from "./slices/companySlice";
import { commitCompanyToStore } from "./companySessionSync";
import { setCredentials } from "./slices/authSlice";
import { session } from "../test/fixtures";
import type { Company } from "../types/company";

const company: Company = {
  id: session.companyId,
  name: "Nome Atualizado",
  timezone: "Europe/Lisbon",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, company: companyReducer },
  });
}

describe("commitCompanyToStore", () => {
  it("updates company slice and auth.user.companyName", () => {
    const store = makeStore();
    store.dispatch(setCredentials(session));
    store.dispatch(commitCompanyToStore(company));

    expect(store.getState().company.company).toEqual(company);
    expect(store.getState().auth.user?.companyName).toBe("Nome Atualizado");
    expect(store.getState().auth.user?.role).toBe(session.role);
  });
});
