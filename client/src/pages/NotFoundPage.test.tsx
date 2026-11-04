import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import NotFoundPage from "./NotFoundPage";
import authReducer from "../store/slices/authSlice";
import { clientUser, user } from "../test/fixtures";

function renderPage(auth: {
  isAuthenticated: boolean;
  mustChangePassword?: boolean;
  user?: typeof user | null;
  isInitializing?: boolean;
}) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: auth.user ?? null,
        mustChangePassword: auth.mustChangePassword ?? false,
        isAuthenticated: auth.isAuthenticated,
        isInitializing: auth.isInitializing ?? false,
        isLoading: false,
      },
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    </Provider>,
  );
}

describe("NotFoundPage", () => {
  it("shows a loading state while the session is initializing", () => {
    renderPage({ isAuthenticated: false, isInitializing: true });

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /página não encontrada/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ir para o início/i })).not.toBeInTheDocument();
  });

  it("shows a clear not-found message", () => {
    renderPage({ isAuthenticated: false });

    expect(
      screen.getByRole("heading", { name: /página não encontrada/i }),
    ).toBeInTheDocument();
  });

  it("links guests to login", () => {
    renderPage({ isAuthenticated: false });

    expect(screen.getByRole("link", { name: /ir para o início/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("links staff to the dashboard", () => {
    renderPage({ isAuthenticated: true, user });

    expect(screen.getByRole("link", { name: /ir para o painel/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("links clients to the portal", () => {
    renderPage({
      isAuthenticated: true,
      user: { ...clientUser, clientId: "client1" },
    });

    expect(screen.getByRole("link", { name: /ir para o portal/i })).toHaveAttribute(
      "href",
      "/portal",
    );
  });

  it("links users who must change password to change-password", () => {
    renderPage({
      isAuthenticated: true,
      mustChangePassword: true,
      user,
    });

    expect(screen.getByRole("link", { name: /alterar senha/i })).toHaveAttribute(
      "href",
      "/change-password",
    );
  });
});
