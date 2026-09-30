import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Sidebar from "./Sidebar";
import { MENU_ITEMS, getMenuItemsForRole } from "../../config/menu";
import type { AuthUser, Role } from "../../types/auth";
import authReducer from "../../store/slices/authSlice";

function makeStore(role: Role | null) {
  const user: AuthUser = {
    id: "1",
    name: "Teste",
    email: "teste@example.com",
    avatar: null,
    role: role ?? "OWNER",
    companyId: "c1",
    isActive: true,
  };

  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: role ? user : null,
        mustChangePassword: false,
        isAuthenticated: Boolean(role),
        isInitializing: false,
        isLoading: false,
      },
    },
  });
}

function renderSidebar(store = makeStore("OWNER")) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/"]}>{<Sidebar />}</MemoryRouter>
    </Provider>,
  );
}

describe("Sidebar", () => {
  it("renders all items permitted for the role", () => {
    renderSidebar(makeStore("OWNER"));

    for (const item of getMenuItemsForRole("OWNER")) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
  });

  it("hides items not permitted for the role", () => {
    renderSidebar(makeStore("CLIENT"));

    const allowed = getMenuItemsForRole("CLIENT").map((i) => i.label);
    for (const item of MENU_ITEMS) {
      if (allowed.includes(item.label)) {
        expect(screen.getByText(item.label)).toBeInTheDocument();
      } else {
        expect(screen.queryByText(item.label)).not.toBeInTheDocument();
      }
    }
  });

  it("renders nothing for an anonymous user", () => {
    renderSidebar(makeStore(null));

    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("marks the active route link", () => {
    render(
      <Provider store={makeStore("OWNER")}>
        <MemoryRouter initialEntries={["/clients"]}>
          <Sidebar />
        </MemoryRouter>
      </Provider>,
    );

    const active = screen.getByText("Clientes");
    expect(active.className).toContain("active");
  });

  it("uses NavLink for each permitted item", () => {
    renderSidebar(makeStore("OWNER"));

    for (const item of getMenuItemsForRole("OWNER")) {
      const link = screen.getByText(item.label).closest("a");
      expect(link).not.toBeNull();
      expect(link?.getAttribute("href")).toBe(item.path);
    }
  });
});
