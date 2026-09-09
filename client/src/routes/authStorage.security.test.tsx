import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ProtectedRoute from "./ProtectedRoute";
import type { AuthState } from "../store/slices/authSlice";
import authReducer from "../store/slices/authSlice";
import { store as appStore } from "../store/index";
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
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Protected content</div>} />
          </Route>
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

  return store;
}

describe("auth storage security", () => {
  it("keeps no accessToken, refreshToken, jwt or password in Redux auth state", () => {
    const store = renderProtected({
      user,
      isAuthenticated: true,
      isInitializing: false,
    });

    expect(screen.getByText("Protected content")).toBeInTheDocument();

    const state = store.getState().auth;
    expect("accessToken" in state).toBe(false);
    expect("refreshToken" in state).toBe(false);
    expect("token" in state).toBe(false);
    expect("jwt" in state).toBe(false);
    expect("password" in state).toBe(false);
  });

  it("does not write tokens to localStorage or sessionStorage", () => {
    renderProtected({
      user,
      isAuthenticated: true,
      isInitializing: false,
    });

    const storageKeys = [
      ...Object.keys(window.localStorage),
      ...Object.keys(window.sessionStorage),
    ];
    const tokenLike = storageKeys.filter((key) => /token|jwt|refresh/i.test(key));

    expect(tokenLike).toEqual([]);
  });

  it("exposes only the auth domain in the root store", () => {
    expect(Object.keys(appStore.getState())).toEqual(["auth"]);
    expect("jwt" in appStore.getState()).toBe(false);
    expect("accessToken" in appStore.getState()).toBe(false);
  });
});