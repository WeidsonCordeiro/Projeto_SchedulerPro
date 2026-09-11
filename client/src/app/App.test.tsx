import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import authApi from "../api/endpoints/auth.api";
import companyApi from "../api/endpoints/company.api";
import { httpError } from "../test/http";
import { session } from "../test/fixtures";
import authReducer from "../store/slices/authSlice";
import companyReducer from "../store/slices/companySlice";

vi.mock("../api/endpoints/auth.api", () => ({
  default: {
    getMe: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

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

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("restores an existing session and renders the main route", async () => {
    vi.mocked(authApi.getMe).mockResolvedValue({
      success: true,
      message: "ok",
      data: session,
    });
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

    const store = makeStore();

    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );

    expect(
      await screen.findByRole("heading", { name: /bem-vindo ao schedulerpro/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("navigation").length).toBeGreaterThan(0);
    expect(screen.getByText("SchedulerPro")).toBeInTheDocument();
    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(store.getState().auth.user?.email).toBe("owner@example.com");
    expect(store.getState().company.company?.name).toBe("salao do centro");
  });

  it("keeps the session anonymous when /auth/me returns 401", async () => {
    vi.mocked(authApi.getMe).mockRejectedValue(
      httpError(401, { message: "Não autorizado." }),
    );

    const store = makeStore();

    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );

    expect(await screen.findByRole("heading", { name: /entrar/i })).toBeInTheDocument();
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.isInitializing).toBe(false);
  });
});