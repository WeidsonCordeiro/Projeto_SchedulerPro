import { fireEvent, render, screen, within } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClientsPage from "./ClientsPage";
import clientsApi from "../../api/endpoints/clients.api";
import authReducer from "../../store/slices/authSlice";
import { httpError } from "../../test/http";
import { user } from "../../test/fixtures";
import type { Client } from "../../types/client";
import type { Role } from "../../types/auth";

vi.mock("../../api/endpoints/clients.api", () => ({
  default: {
    getClients: vi.fn(),
    createClient: vi.fn(),
    updateClient: vi.fn(),
    deleteClient: vi.fn(),
  },
}));

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "abc123",
    name: "Ana Silva",
    email: "ana@example.com",
    phone: "912345678",
    companyId: "company1",
    notes: null,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeStore(role: Role = "OWNER") {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: { ...user, role },
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
      <ClientsPage />
    </Provider>,
  );
}

describe("ClientsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading spinner while the list loads", () => {
    vi.mocked(clientsApi.getClients).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows a friendly error and a retry button when loading fails", async () => {
    vi.mocked(clientsApi.getClients)
      .mockRejectedValueOnce(
        httpError(500, { message: "Erro interno do servidor." }),
      )
      .mockResolvedValueOnce({
        success: true,
        message: "ok",
        data: [makeClient()],
      });

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );

    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(clientsApi.getClients).toHaveBeenCalledTimes(2);
  });

  it("shows the empty state without a create button for read-only roles", async () => {
    vi.mocked(clientsApi.getClients).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });

    renderPage(makeStore("EMPLOYEE"));

    expect(await screen.findByText("Nenhum cliente cadastrado.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /cadastrar primeiro cliente/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the empty state with a create button for MANAGER", async () => {
    vi.mocked(clientsApi.getClients).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });

    renderPage(makeStore("MANAGER"));

    expect(
      await screen.findByRole("button", { name: /cadastrar primeiro cliente/i }),
    ).toBeInTheDocument();
  });

  it("renders the client list with name, email, phone and status", async () => {
    vi.mocked(clientsApi.getClients).mockResolvedValue({
      success: true,
      message: "ok",
      data: [
        makeClient({ id: "1", name: "Ana Silva", email: null, isActive: true }),
        makeClient({ id: "2", name: "Bruno Costa", phone: "933123456", isActive: false }),
      ],
    });

    renderPage();

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Ana Silva")).toBeInTheDocument();
    expect(within(table).getByText("Bruno Costa")).toBeInTheDocument();
    expect(within(table).getByText("912345678")).toBeInTheDocument();
    expect(within(table).getByText("933123456")).toBeInTheDocument();
    expect(screen.getByText("Ativo")).toBeInTheDocument();
    expect(screen.getByText("Inativo")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("creates a client through the form and reloads the list", async () => {
    const created = makeClient({ id: "99", name: "Bruno Costa" });
    vi.mocked(clientsApi.getClients).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeClient()],
    });
    vi.mocked(clientsApi.createClient).mockResolvedValue({
      success: true,
      message: "Cliente criado com sucesso.",
      data: created,
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /novo cliente/i }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Nome"), {
      target: { value: "Bruno Costa" },
    });
    fireEvent.change(within(dialog).getByLabelText("Telefone"), {
      target: { value: "933123456" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /criar cliente/i }),
    );

    expect(await screen.findByText("Cliente criado com sucesso.")).toBeInTheDocument();
    expect(clientsApi.createClient).toHaveBeenCalledWith({
      name: "Bruno Costa",
      email: undefined,
      phone: "933123456",
      notes: undefined,
    });
    expect(clientsApi.getClients).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("edits a client through the pre-filled form", async () => {
    const client = makeClient();
    vi.mocked(clientsApi.getClients).mockResolvedValue({
      success: true,
      message: "ok",
      data: [client],
    });
    vi.mocked(clientsApi.updateClient).mockResolvedValue({
      success: true,
      message: "Cliente atualizado com sucesso.",
      data: { ...client, name: "Ana Souza" },
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Nome")).toHaveValue("Ana Silva");

    fireEvent.change(within(dialog).getByLabelText("Nome"), {
      target: { value: "Ana Souza" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /salvar/i }));

    expect(
      await screen.findByText("Cliente atualizado com sucesso."),
    ).toBeInTheDocument();
    expect(clientsApi.updateClient).toHaveBeenCalledWith("abc123", {
      name: "Ana Souza",
      email: "ana@example.com",
      phone: "912345678",
      notes: undefined,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deletes a client after confirmation", async () => {
    vi.mocked(clientsApi.getClients).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeClient(), makeClient({ id: "2", name: "Bruno Costa" })],
    });
    vi.mocked(clientsApi.deleteClient).mockResolvedValue({
      success: true,
      message: "Cliente removido com sucesso.",
      data: null,
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getAllByRole("button", { name: /excluir/i })[0]);

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Tem certeza que deseja excluir este cliente?"),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(await screen.findByText("Cliente excluído com sucesso.")).toBeInTheDocument();
    expect(clientsApi.deleteClient).toHaveBeenCalledWith("abc123");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not delete when the user cancels the confirmation", async () => {
    vi.mocked(clientsApi.getClients).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeClient()],
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /excluir/i }));

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /cancelar/i }));

    expect(clientsApi.deleteClient).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows delete errors in the confirmation dialog", async () => {
    vi.mocked(clientsApi.getClients).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeClient()],
    });
    vi.mocked(clientsApi.deleteClient).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /excluir/i }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Excluir" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );
  });

  it("hides create/edit for EMPLOYEE and shows no actions column", async () => {
    vi.mocked(clientsApi.getClients).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeClient()],
    });

    renderPage(makeStore("EMPLOYEE"));

    await screen.findByRole("table");
    expect(screen.queryByRole("button", { name: /novo cliente/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument();
  });

  it("shows create/edit but hides delete for ADMIN", async () => {
    vi.mocked(clientsApi.getClients).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeClient()],
    });

    renderPage(makeStore("ADMIN"));

    await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /novo cliente/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument();
  });

  it("shows create, edit and delete for OWNER", async () => {
    vi.mocked(clientsApi.getClients).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeClient()],
    });

    renderPage(makeStore("OWNER"));

    await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /novo cliente/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /excluir/i })).toBeInTheDocument();
  });

  it("never persists client tokens to storage", async () => {
    vi.mocked(clientsApi.getClients).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeClient()],
    });

    const store = makeStore();
    renderPage(store);
    await screen.findByRole("table");

    const storageKeys = [
      ...Object.keys(window.localStorage),
      ...Object.keys(window.sessionStorage),
    ];
    expect(storageKeys).toEqual([]);
    expect(store.getState()).not.toHaveProperty("clients");
  });
});