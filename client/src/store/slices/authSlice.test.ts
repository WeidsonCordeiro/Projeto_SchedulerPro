import { describe, expect, it } from "vitest";
import authReducer, {
  clearCredentials,
  clearMustChangePassword,
  clearSessionExpirationMessage,
  initialState,
  setCredentials,
  setLoading,
  setSessionExpirationMessage,
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
      sessionExpirationMessage: null,
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

  it("clears the password change requirement after the password is changed", () => {
    const requiringChange = authReducer(
      initialState,
      setCredentials(sessionRequiringChange),
    );
    const state = authReducer(requiringChange, clearMustChangePassword());

    expect(state.mustChangePassword).toBe(false);
    expect(state.user?.id).toBe(session.id);
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

  it("stores the session expiration message", () => {
    const state = authReducer(
      initialState,
      setSessionExpirationMessage("Sua sessão expirou por inatividade."),
    );

    expect(state.sessionExpirationMessage).toBe(
      "Sua sessão expirou por inatividade.",
    );
  });

  it("clears the session expiration message on demand", () => {
    const withMessage = authReducer(
      initialState,
      setSessionExpirationMessage("Sua sessão expirou por inatividade."),
    );
    const state = authReducer(withMessage, clearSessionExpirationMessage());

    expect(state.sessionExpirationMessage).toBeNull();
  });

  it("clearCredentials does NOT erase the session expiration message", () => {
    const withMessage = authReducer(
      initialState,
      setSessionExpirationMessage("Sua sessão expirou por inatividade."),
    );
    const state = authReducer(withMessage, clearCredentials());

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    // A mensagem precisa sobreviver ao clearCredentials para ser exibida na
    // LoginPage após o redirect (o interceptor só limpa o estado, não limpa o
    // feedback de expiração).
    expect(state.sessionExpirationMessage).toBe(
      "Sua sessão expirou por inatividade.",
    );
  });

  it("a successful login clears a previous session expiration message", () => {
    const withMessage = authReducer(
      initialState,
      setSessionExpirationMessage("Sua sessão expirou por inatividade."),
    );
    const state = authReducer(withMessage, setCredentials(session));

    expect(state.isAuthenticated).toBe(true);
    expect(state.sessionExpirationMessage).toBeNull();
  });
});