import { describe, expect, it } from "vitest";
import { store } from "./index";
import { clearCredentials, setCredentials } from "./slices/authSlice";
import { clearCompany, setCompany } from "./slices/companySlice";
import { session } from "../test/fixtures";

describe("store", () => {
  it("initializes with the auth and company reducers", () => {
    expect(store.getState().auth).toEqual({
      user: null,
      mustChangePassword: false,
      isAuthenticated: false,
      isInitializing: true,
      isLoading: false,
    });
    expect(store.getState().company).toEqual({ company: null });
  });

  it("applies dispatched actions to the auth state", () => {
    store.dispatch(setCredentials(session));

    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(store.getState().auth.user?.email).toBe("owner@example.com");
    expect(store.getState().auth.isInitializing).toBe(false);

    store.dispatch(clearCredentials());

    expect(store.getState().auth.isAuthenticated).toBe(false);
  });

  it("applies dispatched actions to the company state", () => {
    store.dispatch(
      setCompany({
        id: "507f1f77bcf86cd799439012",
        name: "salao do centro",
        timezone: "Europe/Lisbon",
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );

    expect(store.getState().company.company?.name).toBe("salao do centro");

    store.dispatch(clearCompany());

    expect(store.getState().company.company).toBeNull();
  });
});