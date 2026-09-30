import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CompanyForm from "./CompanyForm";
import companyApi from "../../api/endpoints/company.api";
import { company } from "../../test/fixtures";
import type { Company } from "../../types/company";

vi.mock("../../api/endpoints/company.api", () => ({
  default: {
    updateCompany: vi.fn(),
    uploadCompanyLogo: vi.fn(),
    removeCompanyLogo: vi.fn(),
  },
}));

const storedImage = { url: "https://cdn.example.com/logo.jpg", publicId: "logo" };

function makeFile(type = "image/png", size = 1024, filename = "logo.png") {
  const file = new File([new Uint8Array([1, 2, 3])], filename, { type });
  Object.defineProperty(file, "size", { value: size, configurable: true });
  return file;
}

function renderForm(props: Partial<Parameters<typeof CompanyForm>[0]> = {}) {
  const onLogoChanged = vi.fn();
  render(
    <CompanyForm
      company={company}
      onSaved={vi.fn()}
      onLogoChanged={onLogoChanged}
      {...props}
    />,
  );
  return { onLogoChanged };
}

describe("CompanyForm logo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads the logo as a company image and notifies the parent", async () => {
    const updated: Company = { ...company, logo: storedImage };
    vi.mocked(companyApi.uploadCompanyLogo).mockResolvedValue({
      success: true,
      message: "Logo atualizada.",
      data: updated,
    });

    const { onLogoChanged } = renderForm();

    fireEvent.change(screen.getByLabelText("Adicionar logo"), {
      target: { files: [makeFile()] },
    });

    await waitFor(() =>
      expect(companyApi.uploadCompanyLogo).toHaveBeenCalledTimes(1),
    );
    expect(vi.mocked(companyApi.uploadCompanyLogo).mock.calls[0][0]).toBe(
      company.id,
    );
    expect(onLogoChanged).toHaveBeenCalledWith(updated);
    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent("Logo atualizado com sucesso.");
  });

  it("shows replace/remove actions when a logo already exists", async () => {
    const withLogo: Company = { ...company, logo: storedImage };
    const updated: Company = { ...company, logo: null };
    vi.mocked(companyApi.removeCompanyLogo).mockResolvedValue({
      success: true,
      message: "Logo removida.",
      data: updated,
    });

    const { onLogoChanged } = renderForm({ company: withLogo });

    expect(
      screen.getByRole("button", { name: "Substituir logo" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remover logo" }));

    await waitFor(() =>
      expect(companyApi.removeCompanyLogo).toHaveBeenCalledWith(company.id),
    );
    expect(onLogoChanged).toHaveBeenCalledWith(updated);
    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent("Logo removido com sucesso.");
  });

  it("rejects an unsupported format without calling the API", () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("Adicionar logo"), {
      target: { files: [makeFile("image/gif", 1024, "logo.gif")] },
    });

    expect(companyApi.uploadCompanyLogo).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Formato não suportado. Utilize JPEG, PNG ou WebP.",
    );
  });
});
