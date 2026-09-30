import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import GuestRoute from "./GuestRoute";
import authReducer from "../store/slices/authSlice";
import type { AuthState } from "../store/slices/authSlice";
import { user } from "../test/fixtures";

function renderGuest(auth: Partial<AuthState>) {
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
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<div>Login content</div>} />
          </Route>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/change-password" element={<div>Change password page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe("GuestRoute", () => {
  it("shows loading while the session is being verified", () => {
    renderGuest({ isInitializing: true, isAuthenticated: false });

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Login content")).not.toBeInTheDocument();
  });

  it("allows an anonymous user to reach /login", () => {
    renderGuest({ isInitializing: false, isAuthenticated: false });

    expect(screen.getByText("Login content")).toBeInTheDocument();
  });

  it("redirects an authenticated user away from /login", () => {
    renderGuest({
      user,
      isAuthenticated: true,
      isInitializing: false,
    });

    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("redirects a mustChangePassword user to /change-password", () => {
    renderGuest({
      user,
      isAuthenticated: true,
      mustChangePassword: true,
      isInitializing: false,
    });

    expect(screen.getByText("Change password page")).toBeInTheDocument();
  });
});