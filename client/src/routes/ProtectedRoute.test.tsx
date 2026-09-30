import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ProtectedRoute from "./ProtectedRoute";
import authReducer from "../store/slices/authSlice";
import type { AuthState } from "../store/slices/authSlice";
import { user } from "../test/fixtures";

function renderProtected(auth: Partial<AuthState>) {
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
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>Protected content</div>} />
          </Route>
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/change-password" element={<div>Change password page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe("ProtectedRoute", () => {
  it("shows loading while the session is being verified without redirecting", () => {
    renderProtected({ isInitializing: true, isAuthenticated: false });

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });

  it("allows an authenticated user to access the route", () => {
    renderProtected({
      user,
      isAuthenticated: true,
      isInitializing: false,
    });

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("redirects an unauthenticated user to /login", () => {
    renderProtected({ isInitializing: false, isAuthenticated: false });

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("sends a mustChangePassword user to /change-password", () => {
    renderProtected({
      user,
      isAuthenticated: true,
      mustChangePassword: true,
      isInitializing: false,
    });

    expect(screen.getByText("Change password page")).toBeInTheDocument();
  });
});