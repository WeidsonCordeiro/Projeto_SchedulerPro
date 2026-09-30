import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Sidebar from "./Sidebar";
import { user, company } from "../../test/fixtures";
import authReducer from "../../store/slices/authSlice";
import companyReducer from "../../store/slices/companySlice";
import type { Company } from "../../types/company";

function makeStore(withLogo: boolean) {
  const stored: Company = withLogo
    ? {
        ...company,
        logo: { url: "https://cdn.example.com/logo.jpg", publicId: "logo" },
      }
    : company;

  return configureStore({
    reducer: { auth: authReducer, company: companyReducer },
    preloadedState: {
      auth: {
        user,
        mustChangePassword: false,
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
      },
      company: { company: stored },
    },
  });
}

function renderSidebar(withLogo: boolean) {
  return render(
    <Provider store={makeStore(withLogo)}>
      <MemoryRouter initialEntries={["/"]}>
        <Sidebar />
      </MemoryRouter>
    </Provider>,
  );
}

describe("Sidebar company logo", () => {
  it("renders the company logo when available", () => {
    const { container } = renderSidebar(true);

    const img = container.querySelector(".sidebar-context-avatar img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "https://cdn.example.com/logo.jpg");
  });

  it("renders the company initial when there is no logo", () => {
    const { container } = renderSidebar(false);

    expect(container.querySelector(".sidebar-context-avatar img")).toBeNull();
    expect(screen.getByText("S")).toBeInTheDocument();
  });
});
