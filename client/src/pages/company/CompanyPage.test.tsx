import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CompanyPage from "./CompanyPage";
import companyApi from "../../api/endpoints/company.api";
import { httpError } from "../../test/http";
import { user } from "../../test/fixtures";
import authReducer from "../../store/slices/authSlice";
import companyReducer from "../../store/slices/companySlice";
import { getPublicBookingUrl } from "../../config/publicBookingUrl";
import type { Role } from "../../types/auth";
import type { Company } from "../../types/company";

vi.mock("../../api/endpoints/company.api", () => ({
  default: {
    getCompany: vi.fn(),
    updateCompany: vi.fn(),
  },
}));

const loadedCompany: Company = {
  id: "507f1f77bcf86cd799439012",
  name: "salao do centro",
  timezone: "Europe/Lisbon",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeStore(role: Role | null = "OWNER") {
  return configureStore({
    reducer: { auth: authReducer, company: companyReducer },
    preloadedState: {
      auth: {
        user: role ? { ...user, role } : null,
        mustChangePassword: false,
        isAuthenticated: Boolean(role),
        isInitializing: false,
        isLoading: false,
      },
    },
  });
}

function renderPage(role: Role | null = "OWNER") {
  const store = makeStore(role);
  render(
    <Provider store={store}>
      <CompanyPage />
    </Provider>,
  );
  return store;
}

describe("CompanyPage", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    vi.mocked(companyApi.getCompany).mockResolvedValue({
      success: true,
      message: "ok",
      data: [loadedCompany],
    });
  });

  it("shows a loading state while fetching", () => {
    vi.mocked(companyApi.getCompany).mockImplementation(
      () => new Promise(() => {}),
    );

    renderPage();

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  it("renders the company data and the edit form for OWNER", async () => {
    const store = renderPage();

    expect(
      await screen.findByRole("heading", { name: "Empresa" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveValue("salao do centro");
    expect(screen.getByLabelText("Timezone")).toHaveValue("Europe/Lisbon");
    expect(screen.getByText("Ativa")).toBeInTheDocument();
    const publicUrl = screen.getByLabelText("Link público de agendamento");
    expect(publicUrl).toHaveValue(
      `${window.location.origin}/agendar/empresa/${loadedCompany.id}`,
    );
    expect((publicUrl as HTMLInputElement).value).not.toMatch(
      /clientId|notes|publicAccessToken|credential/i,
    );
    expect(
      screen.getByRole("button", { name: /salvar alterações/i }),
    ).toBeInTheDocument();
    // A empresa carregada também alimenta o estado de sessão (timezone).
    await waitFor(() => {
      expect(store.getState().company.company).toEqual(loadedCompany);
    });
  });

  it("builds production links from the configured frontend URL", () => {
    const url = getPublicBookingUrl(loadedCompany.id, "https://frontend.example.com/");
    expect(url).toBe(`https://frontend.example.com/agendar/empresa/${loadedCompany.id}`);
    expect(url).not.toContain("localhost");
  });

  it("copies the public booking link and shows temporary feedback", async () => {
    writeText.mockResolvedValue(undefined);
    renderPage();

    await screen.findByLabelText("Link público de agendamento");
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/agendar/empresa/${loadedCompany.id}`,
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Link público copiado.");
  });

  it("shows a useful message when clipboard access fails", async () => {
    writeText.mockRejectedValue(new Error("clipboard denied"));
    renderPage();

    await screen.findByLabelText("Link público de agendamento");
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Não foi possível copiar o link. Copie-o manualmente.",
    );
  });

  it("opens the public booking link in a separate tab", async () => {
    renderPage();

    await screen.findByLabelText("Link público de agendamento");
    const openLink = screen.getByRole("link", { name: "Abrir link" });
    expect(openLink).toHaveAttribute(
      "href",
      `${window.location.origin}/agendar/empresa/${loadedCompany.id}`,
    );
    expect(openLink).toHaveAttribute("target", "_blank");
    expect(openLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the company data and the edit form for ADMIN", async () => {
    renderPage("ADMIN");

    expect(
      await screen.findByRole("heading", { name: "Empresa" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveValue("salao do centro");
    expect(
      screen.getByRole("button", { name: /salvar alterações/i }),
    ).toBeInTheDocument();
  });

  it("shows an error with retry when loading fails", async () => {
    vi.mocked(companyApi.getCompany)
      .mockRejectedValueOnce(httpError(500, { message: "Erro interno do servidor." }))
      .mockResolvedValueOnce({
        success: true,
        message: "ok",
        data: [loadedCompany],
      });

    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Erro interno do servidor.");

    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));

    expect(
      await screen.findByLabelText("Timezone"),
    ).toHaveValue("Europe/Lisbon");
  });

  it("shows a message when the authenticated company is not found", async () => {
    vi.mocked(companyApi.getCompany).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Empresa não encontrada.",
    );
  });

  it("blocks users without COMPANY_READ without calling the API", () => {
    renderPage("CLIENT");

    expect(
      screen.getByText("Você não tem permissão para acessar esta página."),
    ).toBeInTheDocument();
    expect(companyApi.getCompany).not.toHaveBeenCalled();
  });

  it("blocks MANAGER without calling the API", () => {
    renderPage("MANAGER");

    expect(
      screen.getByText("Você não tem permissão para acessar esta página."),
    ).toBeInTheDocument();
    expect(companyApi.getCompany).not.toHaveBeenCalled();
  });

  it("blocks EMPLOYEE without calling the API", () => {
    renderPage("EMPLOYEE");

    expect(
      screen.getByText("Você não tem permissão para acessar esta página."),
    ).toBeInTheDocument();
    expect(companyApi.getCompany).not.toHaveBeenCalled();
  });

  it("updates the company and shows success feedback", async () => {
    const updated: Company = {
      ...loadedCompany,
      name: "salao novo",
      timezone: "America/Sao_Paulo",
    };
    vi.mocked(companyApi.updateCompany).mockResolvedValue({
      success: true,
      message: "Empresa atualizada com sucesso.",
      data: updated,
    });

    const store = renderPage();

    await screen.findByLabelText("Nome");

    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Salao Novo" },
    });
    fireEvent.change(screen.getByLabelText("Timezone"), {
      target: { value: "America/Sao_Paulo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    expect(await screen.findByText("Empresa atualizada com sucesso.")).toBeInTheDocument();
    expect(companyApi.updateCompany).toHaveBeenCalledWith(loadedCompany.id, {
      name: "Salao Novo",
      timezone: "America/Sao_Paulo",
    });
    await waitFor(() => {
      expect(store.getState().company.company).toEqual(updated);
    });
  });

  it("shows server validation errors on save and keeps the form enabled", async () => {
    vi.mocked(companyApi.getCompany).mockResolvedValue({
      success: true,
      message: "ok",
      data: [loadedCompany],
    });
    vi.mocked(companyApi.updateCompany).mockRejectedValue(
      httpError(409, { message: "Já existe uma empresa com este nome." }),
    );

    renderPage();

    await screen.findByLabelText("Nome");

    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "outro nome" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Já existe uma empresa com este nome.",
    );
    expect(
      screen.getByRole("button", { name: /salvar alterações/i }),
    ).toBeEnabled();
  });
});
