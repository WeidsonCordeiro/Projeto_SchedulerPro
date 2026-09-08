import { describe, expect, it } from "vitest";
import { store } from "./index";
import { clearCredentials, setCredentials } from "./slices/authSlice";
import type { AuthUser } from "../types/auth";

const user: AuthUser = {
  id: "507f1f77bcf86cd799439011",
  name: "Owner Teste",
  email: "owner@example.com",
  role: "ADMIN",
  companyId: "507f1f77bcf86cd799439012",
  isActive: true,
};

describe("store", () => {
  it("initializes with the auth reducer", () => {
    expect(store.getState().auth).toEqual({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it("applies dispatched actions to the auth state", () => {
    store.dispatch(setCredentials(user));

    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(store.getState().auth.user?.email).toBe("owner@example.com");

    store.dispatch(clearCredentials());

    expect(store.getState().auth.isAuthenticated).toBe(false);
  });
});