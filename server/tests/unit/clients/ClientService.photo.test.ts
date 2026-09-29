import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ==========================================================
 * Foto do cliente — regras de negócio.
 *
 * O `imageProvider` é mockado: nenhum teste toca no
 * Cloudinary. A validação binária e o limite de 5 MB já
 * estão cobertos pelos testes do provider (Parte 1); aqui
 * verifica-se o que o serviço garante: tenant, soft-delete,
 * delegação no provider e persistência.
 * ==========================================================
 */

const { clientRepository, userRepository, imageProvider, clientMapper, loggerMock } =
  vi.hoisted(() => ({
    clientRepository: {
      findById: vi.fn(),
      findByIdAndCompany: vi.fn(),
      findByCompanyId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateAvatar: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      softDelete: vi.fn(),
    },
    userRepository: {
      findByClientIdIncludingDeleted: vi.fn(),
    },
    imageProvider: {
      upload: vi.fn(),
      remove: vi.fn(),
      replace: vi.fn(),
    },
    clientMapper: {
      toResponse: vi.fn(
        (client: unknown, access?: unknown) => ({
          ...(client as object),
          portalAccess: access ?? { exists: false, isActive: false },
        }),
      ),
    },
    loggerMock: { error: vi.fn(), info: vi.fn(), upload: vi.fn() },
  }));

vi.mock("../../../src/modules/Clients/repositories/ClientRepository", () => ({
  default: clientRepository,
}));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({
  default: userRepository,
}));
vi.mock("../../../src/providers/images/CloudinaryImageProvider", () => ({
  default: imageProvider,
}));
vi.mock("../../../src/modules/Clients/mappers/ClientMapper", () => ({
  default: clientMapper,
}));
vi.mock("../../../src/providers/logger", () => ({ default: loggerMock }));

import ClientService from "../../../src/modules/Clients/services/ClientService";
import { HttpStatus } from "../../../src/constants/http-status";
import {
  ImageEntity,
  type StoredImage,
  type UploadedFile,
} from "../../../src/providers/images/types";

const companyId = "507f1f77bcf86cd799439011";
const clientId = "507f1f77bcf86cd799439015";
const otherCompanyId = "507f1f77bcf86cd799439099";

const previousImage: StoredImage = {
  url: "https://res.cloudinary.com/demo/image/upload/v1/schedulerpro/client/antiga",
  publicId: "schedulerpro/client/antiga",
};

const newImage: StoredImage = {
  url: "https://res.cloudinary.com/demo/image/upload/v1/schedulerpro/client/nova",
  publicId: "schedulerpro/client/nova",
};

/** Buffer com assinatura PNG válida. */
const file: UploadedFile = {
  buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  originalname: "foto.png",
  mimetype: "image/png",
  size: 8,
};

function client(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => clientId },
    id: clientId,
    name: "Cliente",
    email: "cliente@example.com",
    phone: "912345678",
    companyId: { toString: () => companyId },
    notes: null,
    avatar: null,
    isActive: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  clientRepository.findById.mockResolvedValue(client());
  clientRepository.updateAvatar.mockResolvedValue(client({ avatar: newImage }));
  userRepository.findByClientIdIncludingDeleted.mockResolvedValue(null);
  imageProvider.replace.mockResolvedValue(newImage);
  imageProvider.remove.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// updatePhoto — upload
// ---------------------------------------------------------------------------
describe("ClientService.updatePhoto - primeiro envio", () => {
  it("persiste o par { url, publicId } devolvido pelo provider", async () => {
    const result = await ClientService.updatePhoto(clientId, file, companyId);

    expect(clientRepository.updateAvatar).toHaveBeenCalledWith(
      clientId,
      companyId,
      { url: newImage.url, publicId: newImage.publicId },
    );
    expect(result).toMatchObject({ id: clientId, avatar: newImage });
  });

  it("envia previous null quando o cliente ainda não tem foto", async () => {
    await ClientService.updatePhoto(clientId, file, companyId);

    expect(imageProvider.replace).toHaveBeenCalledWith({
      file,
      entity: ImageEntity.CLIENT,
      previous: null,
    });
  });

  it("usa a pasta de cliente no storage (ImageEntity.CLIENT)", async () => {
    await ClientService.updatePhoto(clientId, file, companyId);

    expect(imageProvider.replace).toHaveBeenCalledWith(
      expect.objectContaining({ entity: ImageEntity.CLIENT }),
    );
  });

  it("nunca executa remove+upload manual: a substituição é do provider", async () => {
    await ClientService.updatePhoto(clientId, file, companyId);

    expect(imageProvider.remove).not.toHaveBeenCalled();
    expect(imageProvider.upload).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updatePhoto — substituição
// ---------------------------------------------------------------------------
describe("ClientService.updatePhoto - substituição", () => {
  beforeEach(() => {
    clientRepository.findById.mockResolvedValue(
      client({ avatar: previousImage }),
    );
  });

  it("entrega a imagem anterior ao provider", async () => {
    await ClientService.updatePhoto(clientId, file, companyId);

    expect(imageProvider.replace).toHaveBeenCalledWith({
      file,
      entity: ImageEntity.CLIENT,
      previous: previousImage,
    });
  });

  it("a referência antiga não é removida manualmente pelo service", async () => {
    await ClientService.updatePhoto(clientId, file, companyId);

    expect(imageProvider.remove).not.toHaveBeenCalled();
    expect(imageProvider.upload).not.toHaveBeenCalled();
  });

  it("propaga o erro do provider sem gravar nada no MongoDB", async () => {
    imageProvider.replace.mockRejectedValue(
      new Error("Falha ao enviar a imagem"),
    );

    await expect(
      ClientService.updatePhoto(clientId, file, companyId),
    ).rejects.toThrow("Falha ao enviar a imagem");

    expect(clientRepository.updateAvatar).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updatePhoto — tenant, existência e soft-delete
// ---------------------------------------------------------------------------
describe("ClientService.updatePhoto - tenant e soft-delete", () => {
  it("impede alterar a foto de um cliente de outra empresa (403)", async () => {
    clientRepository.findById.mockResolvedValue(
      client({ companyId: { toString: () => otherCompanyId } }),
    );

    await expect(
      ClientService.updatePhoto(clientId, file, companyId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.FORBIDDEN });

    expect(imageProvider.replace).not.toHaveBeenCalled();
    expect(clientRepository.updateAvatar).not.toHaveBeenCalled();
  });

  it("devolve 404 quando o cliente não existe", async () => {
    clientRepository.findById.mockResolvedValue(null);

    await expect(
      ClientService.updatePhoto(clientId, file, companyId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });

    expect(imageProvider.replace).not.toHaveBeenCalled();
  });

  it("não recebe foto quando o cliente está soft-deleted", async () => {
    /**
     * O `findById` do repository filtra `deletedAt: null`, logo
     * um cliente eliminado não é encontrado e a operação
     * termina em 404 sem tocar no storage.
     */
    clientRepository.findById.mockResolvedValue(null);

    await expect(
      ClientService.updatePhoto(clientId, file, companyId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });

    expect(imageProvider.replace).not.toHaveBeenCalled();
  });

  it("devolve 404 se o storage aceitou mas o MongoDB não gravou (coerência)", async () => {
    clientRepository.updateAvatar.mockResolvedValue(null);

    await expect(
      ClientService.updatePhoto(clientId, file, companyId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });

    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ orphanPublicId: newImage.publicId }),
    );
  });
});

// ---------------------------------------------------------------------------
// removePhoto — remoção
// ---------------------------------------------------------------------------
describe("ClientService.removePhoto", () => {
  it("remove no storage e persiste avatar null", async () => {
    clientRepository.findById.mockResolvedValue(
      client({ avatar: previousImage }),
    );
    clientRepository.updateAvatar.mockResolvedValue(client({ avatar: null }));

    await ClientService.removePhoto(clientId, companyId);

    expect(imageProvider.remove).toHaveBeenCalledWith({ image: previousImage });
    expect(clientRepository.updateAvatar).toHaveBeenCalledWith(
      clientId,
      companyId,
      null,
    );
  });

  it("devolve avatar null na resposta depois da remoção", async () => {
    clientRepository.findById.mockResolvedValue(
      client({ avatar: previousImage }),
    );
    clientRepository.updateAvatar.mockResolvedValue(client({ avatar: null }));

    const result = await ClientService.removePhoto(clientId, companyId);

    expect(result).toMatchObject({ id: clientId, avatar: null });
  });

  it("é idempotente: sem foto não chama o storage nem o MongoDB", async () => {
    clientRepository.findById.mockResolvedValue(client({ avatar: null }));

    const result = await ClientService.removePhoto(clientId, companyId);

    expect(imageProvider.remove).not.toHaveBeenCalled();
    expect(clientRepository.updateAvatar).not.toHaveBeenCalled();
    expect(result).toMatchObject({ id: clientId, avatar: null });
  });

  it("propaga o erro do provider e mantém a referência no MongoDB", async () => {
    clientRepository.findById.mockResolvedValue(
      client({ avatar: previousImage }),
    );
    imageProvider.remove.mockRejectedValue(new Error("Falha ao remover a imagem."));

    await expect(ClientService.removePhoto(clientId, companyId)).rejects.toThrow(
      "Falha ao remover a imagem.",
    );

    /**
     * Não apagar o campo se o recurso não foi removido do
     * storage: a referência continua válida e o cliente pode
     * tentar de novo.
     */
    expect(clientRepository.updateAvatar).not.toHaveBeenCalled();
  });

  it("bloqueia a remoção por tenant antes de tocar no storage (403)", async () => {
    clientRepository.findById.mockResolvedValue(
      client({
        avatar: previousImage,
        companyId: { toString: () => otherCompanyId },
      }),
    );

    await expect(ClientService.removePhoto(clientId, companyId)).rejects.toMatchObject({
      statusCode: HttpStatus.FORBIDDEN,
    });

    expect(imageProvider.remove).not.toHaveBeenCalled();
  });

  it("devolve 404 quando o cliente não existe", async () => {
    clientRepository.findById.mockResolvedValue(null);

    await expect(ClientService.removePhoto(clientId, companyId)).rejects.toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
    });

    expect(imageProvider.remove).not.toHaveBeenCalled();
  });

  it("não remove foto de cliente soft-deleted (404 pelo repository ativo)", async () => {
    clientRepository.findById.mockResolvedValue(null);

    await expect(ClientService.removePhoto(clientId, companyId)).rejects.toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
    });

    expect(imageProvider.remove).not.toHaveBeenCalled();
  });

  it("devolve 404 se o storage removeu mas o MongoDB não gravou (coerência)", async () => {
    clientRepository.findById.mockResolvedValue(
      client({ avatar: previousImage }),
    );
    clientRepository.updateAvatar.mockResolvedValue(null);

    await expect(ClientService.removePhoto(clientId, companyId)).rejects.toMatchObject({
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
// Contrato: o endpoint genérico de atualização não mexe na foto
// ---------------------------------------------------------------------------
describe("ClientService.update — avatar fora do contrato", () => {
  it("ignora avatar: a foto só muda pelos endpoints de foto", async () => {
    clientRepository.update.mockResolvedValue(client({ avatar: previousImage }));
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(null);

    const payload = {
      name: "Cliente",
      avatar: { url: "https://malicioso.example/x.jpg", publicId: "x" },
    } as unknown as Parameters<typeof ClientService.update>[1];

    await ClientService.update(clientId, payload, companyId);

    const [, , updateData] = clientRepository.update.mock.calls[0];
    expect(updateData).toEqual({ name: "Cliente" });
    expect(updateData).not.toHaveProperty("avatar");
  });
});