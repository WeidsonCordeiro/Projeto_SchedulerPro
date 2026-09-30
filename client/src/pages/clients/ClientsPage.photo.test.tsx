import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClientsPage from "./ClientsPage";
import clientsApi from "../../api/endpoints/clients.api";
import authReducer from "../../store/slices/authSlice";
import { user } from "../../test/fixtures";
import type { Client } from "../../types/client";

vi.mock("../../api/endpoints/clients.api", () => ({
  default: {
    getClients: vi.fn(),
    createClient: vi.fn(),
    updateClient: vi.fn(),
    deleteClient: vi.fn(),
    setClientCredentials: vi.fn(),
    uploadClientPhoto: vi.fn(),
    removeClientPhoto: vi.fn(),
  },
}));

const storedImage = { url: "https://cdn.example.com/ana.jpg", publicId: "ana" };

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "abc123",
    name: "Ana Silva",
    email: "ana@example.com",
    phone: "912345678",
    companyId: "company1",
    notes: null,
    isActive: true,
    portalAccess: { exists: false, isActive: false },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    avatar: null,
    ...overrides,
  };
}

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user,
        mustChangePassword: false,
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
      },
    },
  });
}

function renderPage() {
  return render(
    <Provider store={makeStore()}>
      <ClientsPage />
    </Provider>,
  );
}

function listResponse(clients: Client[]) {
  return { success: true, message: "ok", data: clients };
}

describe("ClientsPage avatars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the photo for a client that has an avatar", async () => {
    vi.mocked(clientsApi.getClients).mockResolvedValue(
      listResponse([makeClient({ avatar: storedImage })]),
    );

    const { container } = renderPage();

    expect(await screen.findByText("Ana Silva")).toBeInTheDocument();
    const img = container.querySelector(".person-cell img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", storedImage.url);
  });

  it("renders the initials placeholder when there is no avatar", async () => {
    vi.mocked(clientsApi.getClients).mockResolvedValue(
      listResponse([makeClient({ avatar: null })]),
    );

    renderPage();

    expect(await screen.findByText("Ana Silva")).toBeInTheDocument();
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  it("reflects a newly uploaded photo in the list without reloading", async () => {
    const client = makeClient({ avatar: null });
    vi.mocked(clientsApi.getClients).mockResolvedValue(listResponse([client]));
    vi.mocked(clientsApi.uploadClientPhoto).mockResolvedValue({
      success: true,
      message: "Foto atualizada.",
      data: { ...client, avatar: storedImage },
    });

    const { container } = renderPage();

    expect(await screen.findByText("Ana Silva")).toBeInTheDocument();
    expect(container.querySelector(".person-cell img")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    const file = new File([new Uint8Array([1, 2, 3])], "ana.png", {
      type: "image/png",
    });
    fireEvent.change(screen.getByLabelText("Adicionar foto"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      const img = container.querySelector(".person-cell img");
      expect(img).not.toBeNull();
      expect(img).toHaveAttribute("src", storedImage.url);
    });
    expect(clientsApi.uploadClientPhoto).toHaveBeenCalledWith("abc123", file);
    expect(clientsApi.getClients).toHaveBeenCalledTimes(1);
  });
});
