import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadSessionCompany, reconcileCompanySliceWithSession } from "./loadSessionCompany";
import companyApi from "../api/endpoints/company.api";
import { httpError } from "../test/http";
import { session, sessionRequiringChange } from "../test/fixtures";
import authReducer from "../store/slices/authSlice";
import companyReducer, { setCompany } from "../store/slices/companySlice";
import { setCredentials } from "../store/slices/authSlice";
import type { AuthSession } from "../types/auth";

vi.mock("../api/endpoints/company.api", () => ({
  default: {
    getCompany: vi.fn(),
  },
}));

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, company: companyReducer },
  });
}

describe("loadSessionCompany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(companyApi.getCompany).mockResolvedValue({
      success: true,
      message: "ok",
      data: [
        {
          id: "507f1f77bcf86cd799439012",
          name: "salao do centro",
          timezone: "Europe/Lisbon",
          isActive: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
  });

  it("loads company for OWNER and updates Redux", async () => {
    const store = makeStore();
    await loadSessionCompany(store.dispatch, session, store.getState);
    expect(companyApi.getCompany).toHaveBeenCalledTimes(1);
    expect(store.getState().company.company?.name).toBe("salao do centro");
  });

  it("does not call getCompany for MANAGER", async () => {
    const store = makeStore();
    const managerSession: AuthSession = {
      ...session,
      role: "MANAGER",
    };
    await loadSessionCompany(store.dispatch, managerSession, store.getState);
    expect(companyApi.getCompany).not.toHaveBeenCalled();
    expect(store.getState().company.company).toBeNull();
  });

  it("skips load when mustChangePassword is true", async () => {
    const store = makeStore();
    await loadSessionCompany(store.dispatch, sessionRequiringChange, store.getState);
    expect(companyApi.getCompany).not.toHaveBeenCalled();
  });

  it("clears company slice on API failure without touching auth", async () => {
    vi.mocked(companyApi.getCompany).mockRejectedValue(
      httpError(500, { message: "Erro interno." }),
    );
    const store = makeStore();
    store.dispatch(setCredentials(session));
    await loadSessionCompany(store.dispatch, session, store.getState);
    expect(store.getState().company.company).toBeNull();
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });

  it("clears company slice when GET /companies returns an empty list", async () => {
    vi.mocked(companyApi.getCompany).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });
    const store = makeStore();
    store.dispatch(setCredentials(session));
    store.dispatch(
      setCompany({
        id: session.companyId,
        name: "stale name",
        timezone: "Europe/Lisbon",
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    await loadSessionCompany(store.dispatch, session, store.getState);
    expect(store.getState().company.company).toBeNull();
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });

  it("reconcileCompanySliceWithSession clears slice when companyId differs", async () => {
    const store = makeStore();
    store.dispatch(setCredentials(session));
    store.dispatch(
      setCompany({
        id: "other-company-id",
        name: "Outra empresa",
        timezone: "Europe/Lisbon",
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    reconcileCompanySliceWithSession(store.dispatch, session, store.getState);
    expect(store.getState().company.company).toBeNull();
  });

  it("reconcileCompanySliceWithSession keeps slice when companyId matches", () => {
    const store = makeStore();
    store.dispatch(
      setCompany({
        id: session.companyId,
        name: "Mesma empresa",
        timezone: "Europe/Lisbon",
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    reconcileCompanySliceWithSession(store.dispatch, session, store.getState);
    expect(store.getState().company.company?.name).toBe("Mesma empresa");
  });
});
