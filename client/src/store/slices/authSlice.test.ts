import { describe, expect, it } from "vitest";
import authReducer, {
  clearCredentials,
  initialState,
  setCredentials,
  setLoading,
} from "./authSlice";
import type { AuthUser } from "../../types/auth";

const user: AuthUser = {
  id: "507f1f77bcf86cd799439011",
  name: "Owner Teste",
  email: "owner@example.com",
  role: "OWNER",
  companyId: "507f1f77bcf86cd799439012",
  isActive: true,
};

describe("authSlice", () => {
  it("has the correct initial state", () => {
    expect(initialState).toEqual({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it("stores the authenticated user without exposing tokens", () => {
    const state = authReducer(initialState, setCredentials(user));

    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
    expect("accessToken" in state).toBe(false);
    expect("refreshToken" in state).toBe(false);
  });

  it("clears credentials on logout", () => {
    const authenticated = authReducer(initialState, setCredentials(user));
    const state = authReducer(authenticated, clearCredentials());

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("tracks loading state", () => {
    const state = authReducer(initialState, setLoading(true));

    expect(state.isLoading).toBe(true);
  });
});