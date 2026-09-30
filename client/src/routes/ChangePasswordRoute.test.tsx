import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ChangePasswordRoute from "./ChangePasswordRoute";
import authReducer from "../store/slices/authSlice";
import type { AuthState } from "../store/slices/authSlice";
import { user } from "../test/fixtures";

function renderChangePassword(auth: Partial<AuthState>) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: null,
        mustChangePassword: false,
        isAuthenticated: false,
        isInitializing: true,
        isLoading: false,
        ...auth,
      },
    },
  });

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/change-password"]}>
        <Routes>
          <Route element={<ChangePasswordRoute />}>
            <Route
              path="/change-password"
              element={<div>Change password content</div>}
            />
          </Route>
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe("ChangePasswordRoute", () => {
  it("shows loading while the session is being verified", () => {
    renderChangePassword({ isInitializing: true, isAuthenticated: false });

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Change password content")).not.toBeInTheDocument();
  });

  it("redirects an unauthenticated user to /login", () => {
    renderChangePassword({ isInitializing: false, isAuthenticated: false });

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects a normal authenticated user away to /", () => {
    renderChangePassword({
      user,
      isAuthenticated: true,
      isInitializing: false,
    });

    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("allows a mustChangePassword user to access /change-password", () => {
    renderChangePassword({
      user,
      isAuthenticated: true,
      mustChangePassword: true,
      isInitializing: false,
    });

    expect(screen.getByText("Change password content")).toBeInTheDocument();
  });
});