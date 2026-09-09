import { fireEvent, render, screen, within } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ServicesPage from "./ServicesPage";
import servicesApi from "../../api/endpoints/services.api";
import authReducer from "../../store/slices/authSlice";
import { httpError } from "../../test/http";
import { user } from "../../test/fixtures";
import type { Service } from "../../types/service";
import type { Role } from "../../types/auth";

vi.mock("../../api/endpoints/services.api", () => ({
  default: {
    getServices: vi.fn(),
    createService: vi.fn(),
    updateService: vi.fn(),
    deleteService: vi.fn(),
    activateService: vi.fn(),
    deactivateService: vi.fn(),
  },
}));

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: "abc123",
    companyId: "company1",
    name: "Corte de cabelo",
    description: "Corte simples",
    duration: 30,
    price: 15.5,
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
      <ServicesPage />
    </Provider>,
  );
}

describe("ServicesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading spinner while the list loads", () => {
    vi.mocked(servicesApi.getServices).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows a friendly error and a retry button when loading fails", async () => {
    vi.mocked(servicesApi.getServices)
      .mockRejectedValueOnce(
        httpError(500, { message: "Erro interno do servidor." }),
      )
      .mockResolvedValueOnce({
        success: true,
        message: "ok",
        data: [makeService()],
      });

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );

    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(servicesApi.getServices).toHaveBeenCalledTimes(2);
  });

  it("shows the empty state without a create button for read-only roles", async () => {
    vi.mocked(servicesApi.getServices).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });

    renderPage(makeStore("EMPLOYEE"));

    expect(await screen.findByText("Nenhum serviço cadastrado.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /cadastrar primeiro serviço/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the empty state with a create button for OWNER", async () => {
    vi.mocked(servicesApi.getServices).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });

    renderPage();

    expect(
      await screen.findByRole("button", { name: /cadastrar primeiro serviço/i }),
    ).toBeInTheDocument();
  });

  it("renders the service list with name, description, duration, price and status", async () => {
    vi.mocked(servicesApi.getServices).mockResolvedValue({
      success: true,
      message: "ok",
      data: [
        makeService({ id: "1", description: null, price: 15.5, isActive: true }),
        makeService({
          id: "2",
          name: "Barba",
          description: "Barboterapia",
          duration: 20,
          price: 12,
          isActive: false,
        }),
      ],
    });

    renderPage();

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Corte de cabelo")).toBeInTheDocument();
    expect(within(table).getByText("Barba")).toBeInTheDocument();
    expect(within(table).getByText("Barboterapia")).toBeInTheDocument();
    expect(within(table).getByText("30 min")).toBeInTheDocument();
    expect(within(table).getByText("20 min")).toBeInTheDocument();
    expect(within(table).getByText("15,50")).toBeInTheDocument();
    expect(within(table).getByText("12,00")).toBeInTheDocument();
    expect(screen.getByText("Ativo")).toBeInTheDocument();
    expect(screen.getByText("Inativo")).toBeInTheDocument();
  });

  it("creates a service through the form and reloads the list", async () => {
    const created = makeService({ id: "99", name: "Barba" });
    vi.mocked(servicesApi.getServices).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeService()],
    });
    vi.mocked(servicesApi.createService).mockResolvedValue({
      success: true,
      message: "Serviço criado com sucesso.",
      data: created,
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /novo serviço/i }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Nome"), {
      target: { value: "Barba" },
    });
    fireEvent.change(within(dialog).getByLabelText("Duração (minutos)"), {
      target: { value: "20" },
    });
    fireEvent.change(within(dialog).getByLabelText("Preço"), {
      target: { value: "12" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /criar serviço/i }),
    );

    expect(await screen.findByText("Serviço criado com sucesso.")).toBeInTheDocument();
    expect(servicesApi.createService).toHaveBeenCalledWith({
      name: "Barba",
      description: undefined,
      duration: 20,
      price: 12,
    });
    expect(servicesApi.getServices).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("edits a service through the pre-filled form", async () => {
    const service = makeService();
    vi.mocked(servicesApi.getServices).mockResolvedValue({
      success: true,
      message: "ok",
      data: [service],
    });
    vi.mocked(servicesApi.updateService).mockResolvedValue({
      success: true,
      message: "Serviço atualizado com sucesso.",
      data: { ...service, duration: 45 },
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Nome")).toHaveValue("Corte de cabelo");
    expect(within(dialog).getByLabelText("Duração (minutos)")).toHaveValue(30);

    fireEvent.change(within(dialog).getByLabelText("Duração (minutos)"), {
      target: { value: "45" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /salvar/i }));

    expect(
      await screen.findByText("Serviço atualizado com sucesso."),
    ).toBeInTheDocument();
    expect(servicesApi.updateService).toHaveBeenCalledWith("abc123", {
      name: "Corte de cabelo",
      description: "Corte simples",
      duration: 45,
      price: 15.5,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deletes a service after confirmation", async () => {
    vi.mocked(servicesApi.getServices).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeService(), makeService({ id: "2", name: "Barba" })],
    });
    vi.mocked(servicesApi.deleteService).mockResolvedValue({
      success: true,
      message: "Serviço removido com sucesso.",
      data: null,
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getAllByRole("button", { name: /excluir/i })[0]);

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Tem certeza que deseja excluir este serviço?"),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(await screen.findByText("Serviço excluído com sucesso.")).toBeInTheDocument();
    expect(servicesApi.deleteService).toHaveBeenCalledWith("abc123");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not delete when the user cancels the confirmation", async () => {
    vi.mocked(servicesApi.getServices).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeService()],
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /excluir/i }));

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /cancelar/i }));

    expect(servicesApi.deleteService).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows delete errors in the confirmation dialog", async () => {
    vi.mocked(servicesApi.getServices).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeService()],
    });
    vi.mocked(servicesApi.deleteService).mockRejectedValue(
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

  it("deactivates an active service", async () => {
    vi.mocked(servicesApi.getServices).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeService()],
    });
    vi.mocked(servicesApi.deactivateService).mockResolvedValue({
      success: true,
      message: "Serviço desativado com sucesso.",
      data: { ...makeService(), isActive: false },
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /desativar/i }));

    expect(await screen.findByText("Serviço desativado com sucesso.")).toBeInTheDocument();
    expect(servicesApi.deactivateService).toHaveBeenCalledWith("abc123");
    expect(servicesApi.getServices).toHaveBeenCalledTimes(2);
  });

  it("activates an inactive service", async () => {
    vi.mocked(servicesApi.getServices).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeService({ isActive: false })],
    });
    vi.mocked(servicesApi.activateService).mockResolvedValue({
      success: true,
      message: "Serviço ativado com sucesso.",
      data: { ...makeService(), isActive: true },
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /ativar/i }));

    expect(await screen.findByText("Serviço ativado com sucesso.")).toBeInTheDocument();
    expect(servicesApi.activateService).toHaveBeenCalledWith("abc123");
    expect(servicesApi.getServices).toHaveBeenCalledTimes(2);
  });

  it("shows a friendly error when toggling the status fails", async () => {
    vi.mocked(servicesApi.getServices).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeService()],
    });
    vi.mocked(servicesApi.deactivateService).mockRejectedValue(
      httpError(403, { message: "Não autorizado." }),
    );

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /desativar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não autorizado.",
    );
  });

  it("hides create/edit/toggle/delete for EMPLOYEE and shows no actions column", async () => {
    vi.mocked(servicesApi.getServices).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeService()],
    });

    renderPage(makeStore("EMPLOYEE"));

    await screen.findByRole("table");
    expect(screen.queryByRole("button", { name: /novo serviço/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /desativar/i })).not.toBeInTheDocument();
  });

  it("shows create/edit/toggle but hides delete for ADMIN", async () => {
    vi.mocked(servicesApi.getServices).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeService()],
    });

    renderPage(makeStore("ADMIN"));

    await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /novo serviço/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desativar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument();
  });

  it("shows create/edit/toggle and delete for OWNER", async () => {
    vi.mocked(servicesApi.getServices).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeService()],
    });

    renderPage(makeStore("OWNER"));

    await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /novo serviço/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desativar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /excluir/i })).toBeInTheDocument();
  });

  it("never persists service tokens to storage", async () => {
    vi.mocked(servicesApi.getServices).mockResolvedValue({
      success: true,
      message: "ok",
      data: [makeService()],
    });

    const store = makeStore();
    renderPage(store);
    await screen.findByRole("table");

    const storageKeys = [
      ...Object.keys(window.localStorage),
      ...Object.keys(window.sessionStorage),
    ];
    expect(storageKeys).toEqual([]);
    expect(store.getState()).not.toHaveProperty("services");
  });
});