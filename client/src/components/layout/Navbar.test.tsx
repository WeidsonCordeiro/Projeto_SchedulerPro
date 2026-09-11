import { fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Navbar from "./Navbar";
import authApi from "../../api/endpoints/auth.api";
import { httpError } from "../../test/http";
import { user } from "../../test/fixtures";
import authReducer from "../../store/slices/authSlice";
import companyReducer from "../../store/slices/companySlice";

vi.mock("../../api/endpoints/auth.api", () => ({
  default: {
    logout: vi.fn(),
  },
}));

function makeStore(authenticated = false) {
  return configureStore({
    reducer: { auth: authReducer, company: companyReducer },
    preloadedState: {
      auth: {
        user: authenticated ? user : null,
        mustChangePassword: false,
        isAuthenticated: authenticated,
        isInitializing: false,
        isLoading: false,
      },
      company: {
        company: authenticated
          ? {
              id: "507f1f77bcf86cd799439012",
              name: "salao do centro",
              timezone: "Europe/Lisbon",
              isActive: true,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            }
          : null,
      },
    },
  });
}

function renderNavbar(store = makeStore()) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Navbar />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the application name", () => {
    renderNavbar();
    expect(screen.getByText("SchedulerPro")).toBeInTheDocument();
  });

  it("renders the user name and role when authenticated", () => {
    renderNavbar(makeStore(true));

    expect(screen.getByText("Owner Teste")).toBeInTheDocument();
    expect(screen.getByText("OWNER")).toBeInTheDocument();
  });

  it("renders a logout button when authenticated", () => {
    renderNavbar(makeStore(true));

    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("does not render the user or logout for an anonymous user", () => {
    renderNavbar(makeStore(false));

    expect(screen.queryByText("Owner Teste")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /logout/i })).not.toBeInTheDocument();
  });

  it("logs out and redirects to /login", async () => {
    vi.mocked(authApi.logout).mockResolvedValue({ success: true, message: "ok" });

    const store = makeStore(true);
    renderNavbar(store);

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(authApi.logout).toHaveBeenCalledTimes(1);
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().company.company).toBeNull();
  });

  it("clears local state even when logout fails", async () => {
    vi.mocked(authApi.logout).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    const store = makeStore(true);
    renderNavbar(store);

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(store.getState().auth.user).toBeNull();
    expect(store.getState().company.company).toBeNull();
  });
});
