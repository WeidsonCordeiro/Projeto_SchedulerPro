import { describe, expect, it } from "vitest";
import authReducer, {
  clearCredentials,
  initialState,
  setCredentials,
  setLoading,
} from "./authSlice";
import { session, sessionRequiringChange } from "../../test/fixtures";

describe("authSlice", () => {
  it("has the correct initial state", () => {
    expect(initialState).toEqual({
      user: null,
      mustChangePassword: false,
      isAuthenticated: false,
      isInitializing: true,
      isLoading: false,
    });
  });

  it("stores the authenticated session without exposing tokens", () => {
    const state = authReducer(initialState, setCredentials(session));

    expect(state.user).toEqual({
      id: session.id,
      name: session.name,
      email: session.email,
      avatar: session.avatar,
      role: session.role,
      companyId: session.companyId,
      isActive: session.isActive,
    });
    expect(state.mustChangePassword).toBe(false);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isInitializing).toBe(false);
    expect(state.isLoading).toBe(false);
    expect("accessToken" in state).toBe(false);
    expect("refreshToken" in state).toBe(false);
    expect("password" in state).toBe(false);
  });

  it("marks the session when a password change is required", () => {
    const state = authReducer(initialState, setCredentials(sessionRequiringChange));

    expect(state.user?.id).toBe(session.id);
    expect(state.mustChangePassword).toBe(true);
    expect(state.isAuthenticated).toBe(true);
  });

  it("clears credentials on logout", () => {
    const authenticated = authReducer(initialState, setCredentials(session));
    const state = authReducer(authenticated, clearCredentials());

    expect(state.user).toBeNull();
    expect(state.mustChangePassword).toBe(false);
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it("tracks loading state", () => {
    const state = authReducer(initialState, setLoading(true));

    expect(state.isLoading).toBe(true);
  });
});