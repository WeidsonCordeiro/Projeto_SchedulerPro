import { describe, expect, it } from "vitest";

import CompanyMapper from "../../../src/modules/companies/mappers/CompanyMapper";
import type { CompanyDocument } from "../../../src/modules/companies/models/Company.model";

const id = "507f1f77bcf86cd799439011";

function companyDoc(logo: CompanyDocument["logo"]): CompanyDocument {
  return {
    _id: { toString: () => id },
    id,
    name: "empresa",
    timezone: "Europe/Lisbon",
    isActive: true,
    logo,
    createdAt: new Date("2026-01-01T10:00:00.000Z"),
    updatedAt: new Date("2026-01-02T10:00:00.000Z"),
  } as unknown as CompanyDocument;
}

describe("CompanyMapper.toResponse - logo", () => {
  it("projeta o logo como { url, publicId } quando presente", () => {
    const company = companyDoc({
      url: "https://res.cloudinary.com/demo/image/upload/v1/schedulerpro/company/logo",
      publicId: "schedulerpro/company/logo",
    });

    expect(CompanyMapper.toResponse(company).logo).toEqual({
      url: "https://res.cloudinary.com/demo/image/upload/v1/schedulerpro/company/logo",
      publicId: "schedulerpro/company/logo",
    });
  });

  it("projeta logo null quando a empresa não tem logo", () => {
    const company = companyDoc(null);

    expect(CompanyMapper.toResponse(company).logo).toBeNull();
  });

  it("projeta logo null quando o campo está ausente", () => {
    const company = companyDoc(undefined);

    expect(CompanyMapper.toResponse(company).logo).toBeNull();
  });
});

describe("CompanyMapper.toResponseList - logo", () => {
  it("mapeia a lista preservando a projeção de logo de cada empresa", () => {
    const withLogo = companyDoc({
      url: "https://res.cloudinary.com/demo/image/upload/v1/schedulerpro/company/logo",
      publicId: "schedulerpro/company/logo",
    });
    const withoutLogo = companyDoc(null);

    const result = CompanyMapper.toResponseList([withLogo, withoutLogo]);

    expect(result).toHaveLength(2);
    expect(result[0].logo).toEqual({
      url: "https://res.cloudinary.com/demo/image/upload/v1/schedulerpro/company/logo",
      publicId: "schedulerpro/company/logo",
    });
    expect(result[1].logo).toBeNull();
  });
});