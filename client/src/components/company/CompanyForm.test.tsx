import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CompanyForm from "./CompanyForm";
import companyApi from "../../api/endpoints/company.api";
import { httpError, networkError } from "../../test/http";
import { company } from "../../test/fixtures";
import type { Company } from "../../types/company";

vi.mock("../../api/endpoints/company.api", () => ({
  default: {
    updateCompany: vi.fn(),
  },
}));

function renderForm(
  props: Partial<Parameters<typeof CompanyForm>[0]> = {},
) {
  const onSaved = vi.fn();
  render(<CompanyForm company={company} onSaved={onSaved} {...props} />);
  return { onSaved };
}

describe("CompanyForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the current company values as initial state", () => {
    renderForm();

    expect(screen.getByLabelText("Nome")).toHaveValue("salao do centro");
    expect(screen.getByLabelText("Timezone")).toHaveValue("Europe/Lisbon");
    expect(
      screen.getByRole("button", { name: /salvar alterações/i }),
    ).toBeInTheDocument();
  });

  it("lists complete IANA timezones including the current one", () => {
    renderForm();

    const select = screen.getByLabelText("Timezone") as HTMLSelectElement;
    const options = Array.from(select.options).map((option) => option.value);

    expect(options).toContain("Europe/Lisbon");
    expect(options).toContain("America/Sao_Paulo");
    expect(options).toContain("America/New_York");
    expect(options.length).toBeGreaterThanOrEqual(100);
  });

  it("preserves a legacy backend timezone not present in the list", () => {
    const legacy = { ...company, timezone: "Etc/Unknown_Legacy" };
    renderForm({ company: legacy });

    expect(screen.getByLabelText("Timezone")).toHaveValue("Etc/Unknown_Legacy");
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
    fireEvent.change(screen.getByLabelText("Timezone"), {
      target: { value: "America/Sao_Paulo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(companyApi.updateCompany).toHaveBeenCalledWith(company.id, {
      name: "Salão Novo Centro",
      timezone: "America/Sao_Paulo",
    });
    expect(onSaved).toHaveBeenCalledWith(updated);
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