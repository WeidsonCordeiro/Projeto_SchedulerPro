import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import DashboardPage from "./DashboardPage";
import { user } from "../../test/fixtures";
import authReducer from "../../store/slices/authSlice";

function renderDashboard(authenticated = true) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: authenticated ? user : null,
        mustChangePassword: false,
        isAuthenticated: authenticated,
        isInitializing: false,
        isLoading: false,
      },
    },
  });

  return render(
    <Provider store={store}>
      <DashboardPage />
    </Provider>,
  );
}

describe("DashboardPage", () => {
  it("renders the welcome title", () => {
    renderDashboard();
    expect(
      screen.getByRole("heading", { name: /bem-vindo ao schedulerpro/i }),
    ).toBeInTheDocument();
  });

  it("renders the authenticated user name", () => {
    renderDashboard();
    expect(screen.getByText(/olá, owner teste/i)).toBeInTheDocument();
  });

  it("renders summary cards without fabricated numbers", () => {
    renderDashboard();

    expect(screen.getByText("Resumo")).toBeInTheDocument();
    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.getByText("Serviços")).toBeInTheDocument();
    expect(screen.getByText("Agendamentos")).toBeInTheDocument();
    expect(screen.getByText("Funcionários")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });
});
