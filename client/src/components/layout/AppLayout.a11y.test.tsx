import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AppLayout from "./AppLayout";
import authReducer from "../../store/slices/authSlice";
import companyReducer from "../../store/slices/companySlice";
import { user } from "../../test/fixtures";

function renderLayout() {
  const store = configureStore({
    reducer: { auth: authReducer, company: companyReducer },
    preloadedState: {
      auth: {
        user,
        mustChangePassword: false,
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
        staffCompanyAccessSuspended: false,
      },
      company: {
        company: {
          id: "company1",
          name: "Test Co",
          timezone: "Europe/Lisbon",
          isActive: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<p>Home</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe("AppLayout a11y", () => {
  it("exposes an accessible name on main", () => {
    renderLayout();
    expect(screen.getByRole("main", { name: "Conteúdo principal" })).toBeInTheDocument();
  });
});