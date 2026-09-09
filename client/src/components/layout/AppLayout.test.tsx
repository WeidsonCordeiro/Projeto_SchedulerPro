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

vi.mock("../../api/endpoints/clients.api", () => ({
  default: {
    getClients: vi.fn().mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    }),
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
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<div>Home content</div>} />
          </Route>
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

  it("renders the navbar, sidebar and outlet content", () => {
    renderLayout(makeStore(true));

    expect(screen.getAllByRole("navigation").length).toBeGreaterThan(0);
    expect(screen.getByText("SchedulerPro")).toBeInTheDocument();
    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.getByText("Home content")).toBeInTheDocument();
  });

  it("shows the user name, role and logout button when authenticated", () => {
    renderLayout(makeStore(true));

    expect(screen.getByText("Owner Teste")).toBeInTheDocument();
    expect(screen.getByText("OWNER")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("hides the logout button for anonymous users", () => {
    renderLayout(makeStore(false));

    expect(screen.getByText("Home content")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /logout/i })).not.toBeInTheDocument();
  });

  it("calls /auth/logout, clears Redux and redirects to /login", async () => {
    vi.mocked(authApi.logout).mockResolvedValue({ success: true, message: "ok" });

    const store = makeStore(true);
    renderLayout(store);

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

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

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });

  it("opens the mobile sidebar via the menu toggle and closes it", () => {
    renderLayout(makeStore(true));

    expect(screen.getByTestId("sidebar")).not.toHaveClass("open");

    fireEvent.click(screen.getByRole("button", { name: /abrir menu/i }));

    expect(screen.getByTestId("sidebar")).toHaveClass("open");
    expect(screen.getByTestId("sidebar-backdrop")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("sidebar-backdrop"));
    expect(screen.getByTestId("sidebar")).not.toHaveClass("open");
    expect(screen.queryByTestId("sidebar-backdrop")).not.toBeInTheDocument();
  });
});
