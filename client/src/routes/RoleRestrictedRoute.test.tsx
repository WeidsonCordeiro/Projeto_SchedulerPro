import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import RoleRestrictedRoute from "./RoleRestrictedRoute";
import authReducer from "../store/slices/authSlice";
import { user } from "../test/fixtures";
import { getReportAbilities } from "../config/reportPermissions";

function renderGuard(path: string, role: typeof user.role) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: { ...user, role },
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
        mustChangePassword: false,
      },
    },
  });

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            element={
              <RoleRestrictedRoute
                allow={(r) => getReportAbilities(r).canView}
              />
            }
          >
            <Route path="/reports" element={<div>Reports content</div>} />
          </Route>
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe("RoleRestrictedRoute", () => {
  it("allows MANAGER to access /reports", () => {
    renderGuard("/reports", "MANAGER");
    expect(screen.getByText("Reports content")).toBeInTheDocument();
  });

  it("redirects EMPLOYEE away from /reports", () => {
    renderGuard("/reports", "EMPLOYEE");
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.queryByText("Reports content")).not.toBeInTheDocument();
  });
});