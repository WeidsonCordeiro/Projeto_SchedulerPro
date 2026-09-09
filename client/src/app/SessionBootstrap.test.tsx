import { render, screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SessionBootstrap from "./SessionBootstrap";
import { useAppSelector } from "../store";
import authApi from "../api/endpoints/auth.api";
import { httpError, networkError } from "../test/http";
import { session, sessionRequiringChange, user } from "../test/fixtures";
import authReducer from "../store/slices/authSlice";

vi.mock("../api/endpoints/auth.api", () => ({
  default: {
    getMe: vi.fn(),
  },
}));

function StateReader() {
  const auth = useAppSelector((state) => state.auth);
  return (
    <ul>
      <li>initializing:{String(auth.isInitializing)}</li>
      <li>authenticated:{String(auth.isAuthenticated)}</li>
      <li>email:{auth.user?.email ?? "none"}</li>
      <li>mustChange:{String(auth.mustChangePassword)}</li>
    </ul>
  );
}

function makeStore(authenticated = false) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: authenticated ? user : null,
        mustChangePassword: false,
        isAuthenticated: authenticated,
        isInitializing: true,
        isLoading: false,
      },
    },
  });
}

function renderBootstrap(store = makeStore()) {
  render(
    <Provider store={store}>
      <SessionBootstrap>
        <StateReader />
      </SessionBootstrap>
    </Provider>,
  );
}

describe("SessionBootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("places the user in Redux when /auth/me returns a session", async () => {
    vi.mocked(authApi.getMe).mockResolvedValue({
      success: true,
      message: "ok",
      data: session,
    });

    const store = makeStore();
    renderBootstrap(store);

    await waitFor(() => {
      expect(screen.getByText("authenticated:true")).toBeInTheDocument();
    });
    expect(screen.getByText("email:owner@example.com")).toBeInTheDocument();
    expect(screen.getByText("initializing:false")).toBeInTheDocument();
    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(store.getState().auth.user?.id).toBe(session.id);
  });

  it("honours mustChangePassword returned by /auth/me", async () => {
    vi.mocked(authApi.getMe).mockResolvedValue({
      success: true,
      message: "ok",
      data: sessionRequiringChange,
    });

    const store = makeStore();
    renderBootstrap(store);

    await waitFor(() => {
      expect(screen.getByText("mustChange:true")).toBeInTheDocument();
    });
    expect(store.getState().auth.mustChangePassword).toBe(true);
  });

  it("keeps an anonymous session when /auth/me returns 401", async () => {
    vi.mocked(authApi.getMe).mockRejectedValue(
      httpError(401, { message: "Não autorizado." }),
    );

    const store = makeStore();
    renderBootstrap(store);

    await waitFor(() => {
      expect(screen.getByText("authenticated:false")).toBeInTheDocument();
    });
    expect(screen.getByText("initializing:false")).toBeInTheDocument();
    expect(screen.getByText("email:none")).toBeInTheDocument();
  });

  it("removes a stale user from Redux when /auth/me returns 401", async () => {
    vi.mocked(authApi.getMe).mockRejectedValue(
      httpError(401, { message: "Não autorizado." }),
    );

    const store = makeStore(true);
    renderBootstrap(store);

    await waitFor(() => {
      expect(store.getState().auth.user).toBeNull();
    });
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(screen.getByText("email:none")).toBeInTheDocument();
  });

  it("keeps an anonymous session when /auth/me returns a server error", async () => {
    vi.mocked(authApi.getMe).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    const store = makeStore();
    renderBootstrap(store);

    await waitFor(() => {
      expect(screen.getByText("authenticated:false")).toBeInTheDocument();
    });
    expect(screen.getByText("initializing:false")).toBeInTheDocument();
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });

  it("keeps an anonymous session on network errors", async () => {
    vi.mocked(authApi.getMe).mockRejectedValue(networkError());

    const store = makeStore();
    renderBootstrap(store);

    await waitFor(() => {
      expect(screen.getByText("initializing:false")).toBeInTheDocument();
    });
    expect(screen.getByText("authenticated:false")).toBeInTheDocument();
  });
});