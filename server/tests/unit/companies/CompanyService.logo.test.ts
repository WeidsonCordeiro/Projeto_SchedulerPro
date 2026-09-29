import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ==========================================================
 * Logo da empresa — regras de negócio.
 *
 * O `imageProvider` é mockado: nenhum teste toca no
 * Cloudinary. A validação binária e o limite de 5 MB já
 * estão cobertos pelos testes do provider (Parte 1); aqui
 * verifica-se o que o serviço garante: tenant, soft-delete,
 * delegação no provider e persistência.
 *
 * Diferente de employee/client, a empresa NÃO tem companyId:
 * a própria empresa é o tenant. O isolamento é garantido
 * comparando o `:id` com o `companyId` do token (padrão já
 * existente do módulo Company) e o desvio responde 404.
 * ==========================================================
 */

const { companyRepository, imageProvider, companyMapper, loggerMock } =
  vi.hoisted(() => ({
    companyRepository: {
      findById: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      updateLogo: vi.fn(),
      softDelete: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
    },
    imageProvider: {
      upload: vi.fn(),
      remove: vi.fn(),
      replace: vi.fn(),
    },
    companyMapper: {
      toResponse: vi.fn((company: unknown) => ({ ...(company as object) })),
    },
    loggerMock: { error: vi.fn(), info: vi.fn(), upload: vi.fn() },
  }));

vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({
  default: companyRepository,
}));
vi.mock("../../../src/providers/images/CloudinaryImageProvider", () => ({
  default: imageProvider,
}));
vi.mock("../../../src/modules/companies/mappers/CompanyMapper", () => ({
  default: companyMapper,
}));
vi.mock("../../../src/providers/logger", () => ({ default: loggerMock }));

import CompanyService from "../../../src/modules/companies/services/CompanyService";
import { HttpStatus } from "../../../src/constants/http-status";
import {
  ImageEntity,
  type StoredImage,
  type UploadedFile,
} from "../../../src/providers/images/types";

const companyId = "507f1f77bcf86cd799439011";
const otherCompanyId = "507f1f77bcf86cd799439012";

const previousImage: StoredImage = {
  url: "https://res.cloudinary.com/demo/image/upload/v1/schedulerpro/company/antiga",
  publicId: "schedulerpro/company/antiga",
};

const newImage: StoredImage = {
  url: "https://res.cloudinary.com/demo/image/upload/v1/schedulerpro/company/nova",
  publicId: "schedulerpro/company/nova",
};

/** Buffer com assinatura PNG válida. */
const file: UploadedFile = {
  buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  originalname: "logo.png",
  mimetype: "image/png",
  size: 8,
};

function company(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => companyId },
    id: companyId,
    name: "empresa",
    timezone: "Europe/Lisbon",
    isActive: true,
    logo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  companyRepository.findById.mockResolvedValue(company());
  companyRepository.updateLogo.mockResolvedValue(company({ logo: newImage }));
  imageProvider.replace.mockResolvedValue(newImage);
  imageProvider.remove.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// updateLogo — upload
// ---------------------------------------------------------------------------
describe("CompanyService.updateLogo - primeiro envio", () => {
  it("persiste o par { url, publicId } devolvido pelo provider", async () => {
    const result = await CompanyService.updateLogo(companyId, file, companyId);

    expect(companyRepository.updateLogo).toHaveBeenCalledWith(companyId, {
      url: newImage.url,
      publicId: newImage.publicId,
    });
    expect(result).toMatchObject({ id: companyId, logo: newImage });
  });

  it("envia previous null quando a empresa ainda não tem logo", async () => {
    await CompanyService.updateLogo(companyId, file, companyId);

    expect(imageProvider.replace).toHaveBeenCalledWith({
      file,
      entity: ImageEntity.COMPANY,
      previous: null,
    });
  });

  it("usa a pasta de empresa no storage (ImageEntity.COMPANY)", async () => {
    await CompanyService.updateLogo(companyId, file, companyId);

    expect(imageProvider.replace).toHaveBeenCalledWith(
      expect.objectContaining({ entity: ImageEntity.COMPANY }),
    );
  });

  it("nunca executa remove+upload manual: a substituição é do provider", async () => {
    await CompanyService.updateLogo(companyId, file, companyId);

    expect(imageProvider.remove).not.toHaveBeenCalled();
    expect(imageProvider.upload).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateLogo — substituição
// ---------------------------------------------------------------------------
describe("CompanyService.updateLogo - substituição", () => {
  beforeEach(() => {
    companyRepository.findById.mockResolvedValue(
      company({ logo: previousImage }),
    );
  });

  it("entrega a imagem anterior ao provider", async () => {
    await CompanyService.updateLogo(companyId, file, companyId);

    expect(imageProvider.replace).toHaveBeenCalledWith({
      file,
      entity: ImageEntity.COMPANY,
      previous: previousImage,
    });
  });

  it("a referência antiga não é removida manualmente pelo service", async () => {
    await CompanyService.updateLogo(companyId, file, companyId);

    expect(imageProvider.remove).not.toHaveBeenCalled();
    expect(imageProvider.upload).not.toHaveBeenCalled();
  });

  it("propaga o erro do provider sem gravar nada no MongoDB", async () => {
    imageProvider.replace.mockRejectedValue(
      new Error("Falha ao enviar a imagem"),
    );

    await expect(
      CompanyService.updateLogo(companyId, file, companyId),
    ).rejects.toThrow("Falha ao enviar a imagem");

    expect(companyRepository.updateLogo).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateLogo — tenant, existência e soft-delete
// ---------------------------------------------------------------------------
describe("CompanyService.updateLogo - tenant e soft-delete", () => {
  it("impede operar sobre outra empresa (tenancy do módulo Company, 404)", async () => {
    await expect(
      CompanyService.updateLogo(otherCompanyId, file, companyId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });

    expect(companyRepository.findById).not.toHaveBeenCalled();
    expect(imageProvider.replace).not.toHaveBeenCalled();
    expect(companyRepository.updateLogo).not.toHaveBeenCalled();
  });

  it("devolve 404 quando a empresa não existe", async () => {
    companyRepository.findById.mockResolvedValue(null);

    await expect(
      CompanyService.updateLogo(companyId, file, companyId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });

    expect(imageProvider.replace).not.toHaveBeenCalled();
  });

  it("não recebe logo quando a empresa está soft-deleted", async () => {
    /**
     * O `findById` do repository filtra `deletedAt: null`, logo
     * uma empresa eliminada não é encontrada e a operação
     * termina em 404 sem tocar no storage.
     */
    companyRepository.findById.mockResolvedValue(null);

    await expect(
      CompanyService.updateLogo(companyId, file, companyId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });

    expect(imageProvider.replace).not.toHaveBeenCalled();
  });

  it("devolve 404 se o storage aceitou mas o MongoDB não gravou (coerência)", async () => {
    companyRepository.updateLogo.mockResolvedValue(null);

    await expect(
      CompanyService.updateLogo(companyId, file, companyId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });

    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ orphanPublicId: newImage.publicId }),
    );
  });
});

// ---------------------------------------------------------------------------
// removeLogo — remoção
// ---------------------------------------------------------------------------
describe("CompanyService.removeLogo", () => {
  it("remove no storage e persiste logo null", async () => {
    companyRepository.findById.mockResolvedValue(
      company({ logo: previousImage }),
    );
    companyRepository.updateLogo.mockResolvedValue(company({ logo: null }));

    await CompanyService.removeLogo(companyId, companyId);

    expect(imageProvider.remove).toHaveBeenCalledWith({ image: previousImage });
    expect(companyRepository.updateLogo).toHaveBeenCalledWith(companyId, null);
  });

  it("devolve logo null na resposta depois da remoção", async () => {
    companyRepository.findById.mockResolvedValue(
      company({ logo: previousImage }),
    );
    companyRepository.updateLogo.mockResolvedValue(company({ logo: null }));

    const result = await CompanyService.removeLogo(companyId, companyId);

    expect(result).toMatchObject({ id: companyId, logo: null });
  });

  it("é idempotente: sem logo não chama o storage nem o MongoDB", async () => {
    companyRepository.findById.mockResolvedValue(company({ logo: null }));

    const result = await CompanyService.removeLogo(companyId, companyId);

    expect(imageProvider.remove).not.toHaveBeenCalled();
    expect(companyRepository.updateLogo).not.toHaveBeenCalled();
    expect(result).toMatchObject({ id: companyId, logo: null });
  });

  it("propaga o erro do provider e mantém a referência no MongoDB", async () => {
    companyRepository.findById.mockResolvedValue(
      company({ logo: previousImage }),
    );
    imageProvider.remove.mockRejectedValue(new Error("Falha ao remover a imagem."));

    await expect(CompanyService.removeLogo(companyId, companyId)).rejects.toThrow(
      "Falha ao remover a imagem.",
    );

    /**
     * Não apagar o campo se o recurso não foi removido do
     * storage: a referência continua válida e a empresa pode
     * tentar de novo.
     */
    expect(companyRepository.updateLogo).not.toHaveBeenCalled();
  });

  it("bloqueia a remoção por tenant antes de tocar no storage (404)", async () => {
    companyRepository.findById.mockResolvedValue(
      company({ logo: previousImage }),
    );

    await expect(CompanyService.removeLogo(otherCompanyId, companyId)).rejects.toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
    });

    expect(imageProvider.remove).not.toHaveBeenCalled();
  });

  it("devolve 404 quando a empresa não existe", async () => {
    companyRepository.findById.mockResolvedValue(null);

    await expect(CompanyService.removeLogo(companyId, companyId)).rejects.toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
    });

    expect(imageProvider.remove).not.toHaveBeenCalled();
  });

  it("não remove logo de empresa soft-deleted (404 pelo repository ativo)", async () => {
    companyRepository.findById.mockResolvedValue(null);

    await expect(CompanyService.removeLogo(companyId, companyId)).rejects.toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
    });

    expect(imageProvider.remove).not.toHaveBeenCalled();
  });

  it("devolve 404 se o storage removeu mas o MongoDB não gravou (coerência)", async () => {
    companyRepository.findById.mockResolvedValue(
      company({ logo: previousImage }),
    );
    companyRepository.updateLogo.mockResolvedValue(null);

    await expect(CompanyService.removeLogo(companyId, companyId)).rejects.toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
    });

    expect(imageProvider.remove).toHaveBeenCalledWith({ image: previousImage });
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ stalePublicId: previousImage.publicId }),
    );
  });
});

// ---------------------------------------------------------------------------
// Contrato: o endpoint genérico de atualização não mexe na logo
// ---------------------------------------------------------------------------
describe("CompanyService.update — logo fora do contrato", () => {
  it("ignora logo: a logo só muda pelos endpoints de logo", async () => {
    companyRepository.update.mockResolvedValue(company({ logo: previousImage }));

    const payload = {
      name: "empresa atualizada",
      logo: { url: "https://malicioso.example/x.jpg", publicId: "x" },
    } as unknown as Parameters<typeof CompanyService.update>[1];

    await CompanyService.update(companyId, payload, companyId);

    const updateData = companyRepository.update.mock.calls[0][1];
    expect(updateData).toEqual({ name: "empresa atualizada" });
    expect(updateData).not.toHaveProperty("logo");
  });
});