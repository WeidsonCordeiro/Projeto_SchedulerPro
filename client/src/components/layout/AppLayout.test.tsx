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
import companyReducer from "../../store/slices/companySlice";
import type { Role } from "../../types/auth";
import type { Company } from "../../types/company";

vi.mock("../../api/endpoints/auth.api", () => ({
  default: {
    logout: vi.fn(),
  },
}));

vi.mock("../../api/endpoints/notifications.api", () => ({
  default: {
    getNotifications: vi.fn().mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    }),
    getUnreadCount: vi.fn().mockResolvedValue({
      success: true,
      message: "ok",
      data: { unreadCount: 0 },
    }),
    markAsRead: vi.fn().mockResolvedValue({ success: true, message: "ok" }),
    markAllAsRead: vi.fn().mockResolvedValue({
      success: true,
      message: "ok",
      data: { markedRead: 0 },
    }),
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

vi.mock("../../api/endpoints/appointments.api", () => ({
  default: {
    getAppointments: vi.fn().mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    }),
    getMyAppointments: vi.fn().mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    }),
  },
}));

vi.mock("../../api/endpoints/company.api", () => ({
  default: {
    getCompany: vi.fn().mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    }),
  },
}));

vi.mock("../../api/endpoints/services.api", () => ({
  default: {
    getServices: vi.fn().mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    }),
  },
}));

vi.mock("../../api/endpoints/employees.api", () => ({
  default: {
    getEmployees: vi.fn().mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    }),
  },
}));

vi.mock("../../api/endpoints/availability.api", () => ({
  default: {
    getEmployeeAvailabilities: vi.fn().mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    }),
  },
}));

vi.mock("../../api/endpoints/availabilityExceptions.api", () => ({
  default: {
    getAvailabilityExceptions: vi.fn().mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    }),
  },
}));

function makeStore(
  options: {
    authenticated?: boolean;
    role?: Role;
    company?: Company | null;
    staffCompanyAccessSuspended?: boolean;
  } = {},
) {
  const {
    authenticated = false,
    role,
    company = null,
    staffCompanyAccessSuspended = false,
  } = options;
  return configureStore({
    reducer: { auth: authReducer, company: companyReducer },
    preloadedState: {
      auth: {
        user: authenticated
          ? { ...user, ...(role ? { role } : {}) }
          : null,
        mustChangePassword: false,
        isAuthenticated: authenticated,
        isInitializing: false,
        isLoading: false,
        staffCompanyAccessSuspended,
      },
      company: { company },
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

function renderLayoutWithPortal(store = makeStore(), initialEntries: string[] = ["/"]) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<div>Home content</div>} />
            <Route path="portal" element={<div>Portal content</div>} />
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
    renderLayout(makeStore({ authenticated: true }));

    expect(screen.getAllByRole("navigation").length).toBeGreaterThan(0);
    expect(
      screen.getByText("SchedulerPro", { selector: ".navbar-brand" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.getByText("Home content")).toBeInTheDocument();
  });

  it("shows the user name, role and logout button when authenticated", () => {
    renderLayout(makeStore({ authenticated: true }));

    expect(screen.getByText("Owner Teste")).toBeInTheDocument();
    expect(screen.getByText("OWNER")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("hides the logout button for anonymous users", () => {
    renderLayout(makeStore());

    expect(screen.getByText("Home content")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /logout/i })).not.toBeInTheDocument();
  });

  it("calls /auth/logout, clears Redux and redirects to /login", async () => {
    vi.mocked(authApi.logout).mockResolvedValue({ success: true, message: "ok" });

    const store = makeStore({ authenticated: true });
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

    const store = makeStore({ authenticated: true });
    renderLayout(store);

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });

  it("opens the mobile sidebar via the menu toggle and closes it", () => {
    renderLayout(makeStore({ authenticated: true }));

    expect(screen.getByTestId("sidebar")).not.toHaveClass("open");

    fireEvent.click(screen.getByRole("button", { name: /abrir menu/i }));

    expect(screen.getByTestId("sidebar")).toHaveClass("open");
    expect(screen.getByTestId("sidebar-backdrop")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("sidebar-backdrop"));
    expect(screen.getByTestId("sidebar")).not.toHaveClass("open");
    expect(screen.queryByTestId("sidebar-backdrop")).not.toBeInTheDocument();
  });

  it("closes the mobile sidebar with the Escape key", () => {
    renderLayout(makeStore({ authenticated: true }));

    fireEvent.click(screen.getByRole("button", { name: /abrir menu/i }));
    expect(screen.getByTestId("sidebar")).toHaveClass("open");

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.getByTestId("sidebar")).not.toHaveClass("open");
    expect(screen.queryByTestId("sidebar-backdrop")).not.toBeInTheDocument();
  });

  it("exposes the sidebar toggle state and a scrollable menu region", () => {
    renderLayout(makeStore({ authenticated: true }));

    const toggle = screen.getByRole("button", { name: /abrir menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByTestId("sidebar").querySelector(".app-sidebar-scroll"),
    ).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("redirects a CLIENT user from admin routes to /portal", () => {
    renderLayoutWithPortal(makeStore({ authenticated: true, role: "CLIENT" }));

    expect(screen.queryByText("Home content")).not.toBeInTheDocument();
    expect(screen.getByText("Portal content")).toBeInTheDocument();
  });

  it("redirects a non-CLIENT user from /portal to /", () => {
    renderLayoutWithPortal(
      makeStore({ authenticated: true, role: "OWNER" }),
      ["/portal"],
    );

    expect(screen.getByText("Home content")).toBeInTheDocument();
    expect(screen.queryByText("Portal content")).not.toBeInTheDocument();
  });

  it("renders portal sidebar items for CLIENT role", () => {
    renderLayoutWithPortal(makeStore({ authenticated: true, role: "CLIENT" }));

    expect(screen.getByText("Portal content")).toBeInTheDocument();
    expect(screen.getByText("Meus agendamentos")).toBeInTheDocument();
    expect(screen.getByText("Perfil")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Clientes")).not.toBeInTheDocument();
  });

  it("shows a global inactive-company notice for OWNER", () => {
    renderLayout(
      makeStore({
        authenticated: true,
        role: "OWNER",
        company: {
          id: "507f1f77bcf86cd799439012",
          name: "salao",
          timezone: "Europe/Lisbon",
          isActive: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    );

    expect(screen.getByTestId("company-inactive-notice")).toHaveAttribute(
      "data-notice-role",
      "OWNER",
    );
    expect(screen.getByText("Home content")).toBeInTheDocument();
  });

  it("shows a global inactive-company notice for ADMIN", () => {
    renderLayout(
      makeStore({
        authenticated: true,
        role: "ADMIN",
        company: {
          id: "507f1f77bcf86cd799439012",
          name: "salao",
          timezone: "Europe/Lisbon",
          isActive: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    );

    expect(screen.getByTestId("company-inactive-notice")).toHaveAttribute(
      "data-notice-role",
      "ADMIN",
    );
  });

  it("does not show the global inactive notice when the company is active", () => {
    renderLayout(
      makeStore({
        authenticated: true,
        role: "OWNER",
        company: {
          id: "507f1f77bcf86cd799439012",
          name: "salao",
          timezone: "Europe/Lisbon",
          isActive: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    );

    expect(screen.queryByTestId("company-inactive-notice")).not.toBeInTheDocument();
  });

  it("shows staff suspended view instead of outlet for MANAGER", () => {
    renderLayout(
      makeStore({
        authenticated: true,
        role: "MANAGER",
        staffCompanyAccessSuspended: true,
      }),
    );

    expect(screen.getByTestId("staff-company-suspended-view")).toBeInTheDocument();
    expect(screen.queryByText("Home content")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /terminar sessão/i }),
    ).toBeInTheDocument();
  });

  it("terminates session from staff suspended view", async () => {
    vi.mocked(authApi.logout).mockResolvedValue({ success: true, message: "ok" });
    const store = makeStore({
      authenticated: true,
      role: "EMPLOYEE",
      staffCompanyAccessSuspended: true,
    });
    renderLayout(store);

    fireEvent.click(screen.getByRole("button", { name: /terminar sessão/i }));

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(store.getState().auth.staffCompanyAccessSuspended).toBe(false);
  });
});