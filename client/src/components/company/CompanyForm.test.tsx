import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CompanyForm from "./CompanyForm";
import companyApi from "../../api/endpoints/company.api";
import { formatTimezoneOptionLabel } from "../../config/timezones";
import { httpError, networkError } from "../../test/http";
import { company } from "../../test/fixtures";
import type { Company } from "../../types/company";

vi.mock("../../api/endpoints/company.api", () => ({
  default: {
    updateCompany: vi.fn(),
  },
}));

function mockViewportDesktop() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
}

function renderForm(
  props: Partial<Parameters<typeof CompanyForm>[0]> = {},
) {
  const onSaved = vi.fn();
  render(<CompanyForm company={company} onSaved={onSaved} {...props} />);
  return { onSaved };
}

function getTimezoneCombobox() {
  return screen.getByRole("combobox", { name: "Timezone" });
}

function openTimezonePicker() {
  fireEvent.click(getTimezoneCombobox());
}

function selectTimezoneBySearch(iana: string) {
  openTimezonePicker();
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: iana },
  });
  fireEvent.click(
    screen.getByRole("option", {
      name: formatTimezoneOptionLabel(iana),
    }),
  );
}

describe("CompanyForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockViewportDesktop();
  });

  it("renders the current company values as initial state", () => {
    renderForm();

    expect(screen.getByLabelText("Nome")).toHaveValue("salao do centro");
    expect(getTimezoneCombobox()).toHaveTextContent(
      formatTimezoneOptionLabel("Europe/Lisbon"),
    );
    expect(
      screen.getByRole("button", { name: /salvar alterações/i }),
    ).toBeInTheDocument();
  });

  it("opens the timezone picker and allows searching IANA zones", () => {
    renderForm();
    openTimezonePicker();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "America/Sao_Paulo" },
    });

    expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(
      1,
    );
    expect(screen.getByRole("option")).toHaveTextContent(
      formatTimezoneOptionLabel("America/Sao_Paulo"),
    );
  });

  it("updates form state when a different timezone is selected", () => {
    renderForm();
    selectTimezoneBySearch("America/New_York");

    expect(getTimezoneCombobox()).toHaveTextContent(
      formatTimezoneOptionLabel("America/New_York"),
    );
  });

  it("preserves a legacy backend timezone through ensureOption", () => {
    const legacy = { ...company, timezone: "Etc/Unknown_Legacy" };
    renderForm({ company: legacy });

    expect(getTimezoneCombobox()).toHaveTextContent("Etc/Unknown_Legacy");
    openTimezonePicker();
    expect(
      screen.getByRole("option", { name: "Etc/Unknown_Legacy" }),
    ).toBeInTheDocument();
  });

  it("validates the required name without calling the API", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    expect(
      screen.getByText("O nome da empresa é obrigatório."),
    ).toBeInTheDocument();
    expect(companyApi.updateCompany).not.toHaveBeenCalled();
  });

  it("rejects a name outside the 3..120 range", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    expect(
      screen.getByText("O nome deve possuir entre 3 e 120 caracteres."),
    ).toBeInTheDocument();
    expect(companyApi.updateCompany).not.toHaveBeenCalled();
  });

  it("rejects a legacy timezone value that is not IANA", () => {
    const legacy = { ...company, timezone: "Etc/Invalid_Legacy" };
    renderForm({ company: legacy });
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    expect(screen.getByText("Timezone IANA inválido.")).toBeInTheDocument();
    expect(companyApi.updateCompany).not.toHaveBeenCalled();
  });

  it("submits with trimmed payload and notifies onSaved", async () => {
    const updated: Company = {
      ...company,
      name: "salao novo",
      timezone: "America/Sao_Paulo",
    };
    vi.mocked(companyApi.updateCompany).mockResolvedValue({
      success: true,
      message: "Empresa atualizada com sucesso.",
      data: updated,
    });

    const { onSaved } = renderForm();
    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "  Salão Novo Centro  " },
    });
    selectTimezoneBySearch("America/Sao_Paulo");
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(companyApi.updateCompany).toHaveBeenCalledWith(company.id, {
      name: "Salão Novo Centro",
      timezone: "America/Sao_Paulo",
    });
    expect(onSaved).toHaveBeenCalledWith(updated);

    const payload = vi.mocked(companyApi.updateCompany).mock.calls[0][1];
    expect(payload.timezone).not.toMatch(/^\(UTC/);
    expect(payload.timezone).toBe("America/Sao_Paulo");
  });

  it("shows server error messages coming from the API body", async () => {
    vi.mocked(companyApi.updateCompany).mockRejectedValue(
      httpError(400, {
        message: "O nome deve possuir entre 3 e 120 caracteres.",
      }),
    );

    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O nome deve possuir entre 3 e 120 caracteres.",
    );
  });

  it("stays editable and re-enables the button after a server error", async () => {
    vi.mocked(companyApi.updateCompany).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );
    expect(
      screen.getByRole("button", { name: /salvar alterações/i }),
    ).toBeEnabled();
    expect(getTimezoneCombobox()).toBeEnabled();
  });

  it("shows a friendly message on network errors", async () => {
    vi.mocked(companyApi.updateCompany).mockRejectedValue(networkError());

    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível conectar ao servidor. Verifique sua conexão.",
    );
  });

  it("shows loading and blocks duplicate submits while pending", async () => {
    let resolveRequest: (value: {
      success: boolean;
      message: string;
      data: Company;
    }) => void = () => {};
    vi.mocked(companyApi.updateCompany).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const { onSaved } = renderForm();
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    const submittingButton = screen.getByRole("button", { name: /salvando\.\.\./i });
    expect(submittingButton).toBeDisabled();
    expect(getTimezoneCombobox()).toBeEnabled();

    fireEvent.click(submittingButton);
    expect(companyApi.updateCompany).toHaveBeenCalledTimes(1);

    resolveRequest({
      success: true,
      message: "ok",
      data: company,
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });
});