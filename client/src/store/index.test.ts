import { describe, expect, it } from "vitest";
import { store } from "./index";
import { clearCredentials, setCredentials } from "./slices/authSlice";
import { session } from "../test/fixtures";

describe("store", () => {
  it("initializes with the auth reducer", () => {
    expect(store.getState().auth).toEqual({
      user: null,
      mustChangePassword: false,
      isAuthenticated: false,
      isInitializing: true,
      isLoading: false,
    });
  });

  it("applies dispatched actions to the auth state", () => {
    store.dispatch(setCredentials(session));

    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(store.getState().auth.user?.email).toBe("owner@example.com");
    expect(store.getState().auth.isInitializing).toBe(false);

    store.dispatch(clearCredentials());

    expect(store.getState().auth.isAuthenticated).toBe(false);
  });
});