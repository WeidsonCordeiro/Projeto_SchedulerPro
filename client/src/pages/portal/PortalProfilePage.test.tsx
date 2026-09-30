import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PortalProfilePage from "./PortalProfilePage";
import clientsApi from "../../api/endpoints/clients.api";
import { httpError } from "../../test/http";
import { clientUser } from "../../test/fixtures";
import authReducer from "../../store/slices/authSlice";
import type { Client } from "../../types/client";

vi.mock("../../api/endpoints/clients.api", () => ({
  default: {
    getClientMe: vi.fn(),
  },
}));

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "client1",
    name: "Cliente Teste",
    email: "cliente@example.com",
    phone: "912345678",
    companyId: "company1",
    notes: "VIP",
    isActive: true,
    portalAccess: { exists: true, isActive: true },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: { ...clientUser, clientId: "client1" },
        mustChangePassword: false,
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
      },
    },
  });
}

function renderPage(store = makeStore()) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/portal/perfil"]}>
        <PortalProfilePage />
      </MemoryRouter>
    </Provider>,
  );
}

describe("PortalProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading spinner while profile loads", () => {
    vi.mocked(clientsApi.getClientMe).mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders account data and client profile", async () => {
    vi.mocked(clientsApi.getClientMe).mockResolvedValue({
      success: true,
      message: "ok",
      data: makeClient(),
    });

    renderPage();

    expect(await screen.findByText("Dados da conta")).toBeInTheDocument();
    expect(screen.getAllByText("Cliente Teste")).toHaveLength(2);
    expect(screen.getAllByText("cliente@example.com")).toHaveLength(2);
    expect(screen.getByText("912345678")).toBeInTheDocument();
    expect(screen.getByText("VIP")).toBeInTheDocument();
  });

  it("shows a friendly error when loading fails", async () => {
    vi.mocked(clientsApi.getClientMe).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );
    expect(
      screen.getByRole("button", { name: /tentar novamente/i }),
    ).toBeInTheDocument();
  });

  it("shows fallback text when profile is null", async () => {
    vi.mocked(clientsApi.getClientMe).mockResolvedValue({
      success: true,
      message: "ok",
      data: null as unknown as Client,
    });

    renderPage();

    expect(
      await screen.findByText("Dados da conta"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Perfil do cliente não encontrado."),
    ).toBeInTheDocument();
  });
});