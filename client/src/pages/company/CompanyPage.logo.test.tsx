import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CompanyPage from "./CompanyPage";
import companyApi from "../../api/endpoints/company.api";
import { user } from "../../test/fixtures";
import authReducer from "../../store/slices/authSlice";
import companyReducer from "../../store/slices/companySlice";
import type { Company } from "../../types/company";

vi.mock("../../api/endpoints/company.api", () => ({
  default: {
    getCompany: vi.fn(),
    updateCompany: vi.fn(),
    uploadCompanyLogo: vi.fn(),
    removeCompanyLogo: vi.fn(),
  },
}));

const loadedCompany: Company = {
  id: "507f1f77bcf86cd799439012",
  name: "salao do centro",
  timezone: "Europe/Lisbon",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  logo: null,
};

const storedImage = { url: "https://cdn.example.com/logo.jpg", publicId: "logo" };

function makeStore() {
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
    },
  });
}

function renderPage() {
  const store = makeStore();
  render(
    <Provider store={store}>
      <CompanyPage />
    </Provider>,
  );
  return store;
}

describe("CompanyPage logo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(companyApi.getCompany).mockResolvedValue({
      success: true,
      message: "ok",
      data: [loadedCompany],
    });
  });

  it("uploads the logo and updates the global company state", async () => {
    const updated: Company = { ...loadedCompany, logo: storedImage };
    vi.mocked(companyApi.uploadCompanyLogo).mockResolvedValue({
      success: true,
      message: "Logo atualizada.",
      data: updated,
    });

    const store = renderPage();

    expect(
      await screen.findByRole("heading", { name: "Informações da empresa" }),
    ).toBeInTheDocument();

    const file = new File([new Uint8Array([1, 2, 3])], "logo.png", {
      type: "image/png",
    });
    fireEvent.change(screen.getByLabelText("Adicionar logo"), {
      target: { files: [file] },
    });

    await waitFor(() =>
      expect(companyApi.uploadCompanyLogo).toHaveBeenCalledWith(
        loadedCompany.id,
        file,
      ),
    );
    await waitFor(() => {
      expect(store.getState().company.company?.logo?.url).toBe(storedImage.url);
    });
    expect(
      screen.getByRole("button", { name: "Substituir logo" }),
    ).toBeInTheDocument();
  });

  it("removes the logo and clears the global company state", async () => {
    const withLogo: Company = { ...loadedCompany, logo: storedImage };
    const updated: Company = { ...loadedCompany, logo: null };
    vi.mocked(companyApi.getCompany).mockResolvedValue({
      success: true,
      message: "ok",
      data: [withLogo],
    });
    vi.mocked(companyApi.removeCompanyLogo).mockResolvedValue({
      success: true,
      message: "Logo removida.",
      data: updated,
    });

    const store = renderPage();

    expect(
      await screen.findByRole("button", { name: "Remover logo" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remover logo" }));

    await waitFor(() =>
      expect(companyApi.removeCompanyLogo).toHaveBeenCalledWith(
        loadedCompany.id,
      ),
    );
    await waitFor(() => {
      expect(store.getState().company.company?.logo ?? null).toBeNull();
    });
    expect(
      screen.getByRole("button", { name: "Adicionar logo" }),
    ).toBeInTheDocument();
  });
});
