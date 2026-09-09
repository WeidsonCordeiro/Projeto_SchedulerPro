import { fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppLayout from "./AppLayout";
import authApi from "../../api/endpoints/auth.api";
import { httpError } from "../../test/http";
import { user } from "../../test/fixtures";
import authReducer from "../../store/slices/authSlice";

vi.mock("../../api/endpoints/auth.api", () => ({
  default: {
    logout: vi.fn(),
  },
}));

function makeStore(authenticated = false) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: authenticated ? user : null,
        mustChangePassword: false,
        isAuthenticated: authenticated,
        isInitializing: false,
        isLoading: false,
      },
    },
  });
}

function renderLayout(store = makeStore()) {
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <AppLayout>
                <div>Home content</div>
              </AppLayout>
            }
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe("AppLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the user name and logout button only when authenticated", () => {
    renderLayout(makeStore(true));

    expect(screen.getByText("Owner Teste")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sair/i })).toBeInTheDocument();
  });

  it("hides the logout button for anonymous users", () => {
    renderLayout(makeStore(false));

    expect(screen.getByText("Home content")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sair/i })).not.toBeInTheDocument();
  });

  it("calls /auth/logout, clears Redux and redirects to /login", async () => {
    vi.mocked(authApi.logout).mockResolvedValue({ success: true, message: "ok" });

    const store = makeStore(true);
    renderLayout(store);

    fireEvent.click(screen.getByRole("button", { name: /sair/i }));

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(authApi.logout).toHaveBeenCalledTimes(1);
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.user).toBeNull();
  });

  it("clears local state even when /auth/logout fails", async () => {
    vi.mocked(authApi.logout).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    const store = makeStore(true);
    renderLayout(store);

    fireEvent.click(screen.getByRole("button", { name: /sair/i }));

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });
});