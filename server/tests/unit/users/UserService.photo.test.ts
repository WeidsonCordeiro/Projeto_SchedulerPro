import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ==========================================================
 * Foto do funcionário — regras de negócio.
 *
 * O `imageProvider` é mockado: nenhum teste toca no
 * Cloudinary. A validação binária e o limite de 5 MB já
 * estão cobertos pelos testes do provider (Parte 1); aqui
 * verifica-se o que o serviço garante: tenant, perfil,
 * delegação no provider e persistência.
 * ==========================================================
 */

const { userRepository, imageProvider, userMapper, loggerMock, otherMocks } = vi.hoisted(() => ({
  userRepository: {
    findById: vi.fn(),
    update: vi.fn(),
    existsByEmail: vi.fn(),
    create: vi.fn(),
    findByCompanyId: vi.fn(),
  },
  imageProvider: {
    upload: vi.fn(),
    remove: vi.fn(),
    replace: vi.fn(),
  },
  userMapper: { toResponse: vi.fn((value: unknown) => value), toResponseList: vi.fn() },
  loggerMock: { auth: vi.fn(), error: vi.fn(), info: vi.fn(), upload: vi.fn() },
  otherMocks: {
    companyRepository: { findById: vi.fn() },
    passwordProvider: { hash: vi.fn() },
    resendProvider: { send: vi.fn() },
    jwtProvider: { generateEmailVerificationToken: vi.fn() },
  },
}));

vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({ default: userRepository }));
vi.mock("../../../src/providers/images/CloudinaryImageProvider", () => ({ default: imageProvider }));
vi.mock("../../../src/modules/users/mappers/UserMapper", () => ({ default: userMapper }));
vi.mock("../../../src/providers/logger", () => ({ default: loggerMock }));
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({ default: otherMocks.companyRepository }));
vi.mock("../../../src/providers/security/PasswordProvider", () => ({ default: otherMocks.passwordProvider }));
vi.mock("../../../src/providers/mail/ResendProvider", () => ({ default: otherMocks.resendProvider }));
vi.mock("../../../src/providers/security/JwtProvider", () => ({ default: otherMocks.jwtProvider }));
vi.mock("../../../src/providers/mail/templates/welcome.template", () => ({ welcomeTemplate: vi.fn(() => "html") }));
vi.mock("../../../src/config/env", () => ({ env: { frontend: { FRONTEND_URL: "http://localhost" } } }));

import UserService from "../../../src/modules/users/services/UserService";
import { Role } from "../../../src/constants/roles";
import { HttpStatus } from "../../../src/constants/http-status";
import { ImageEntity, type StoredImage, type UploadedFile } from "../../../src/providers/images/types";

const companyId = "507f1f77bcf86cd799439011";
const userId = "507f1f77bcf86cd799439012";
const otherCompanyId = "507f1f77bcf86cd799439099";

const previousImage: StoredImage = {
  url: "https://res.cloudinary.com/demo/image/upload/v1/schedulerpro/employee/antiga",
  publicId: "schedulerpro/employee/antiga",
};

const newImage: StoredImage = {
  url: "https://res.cloudinary.com/demo/image/upload/v1/schedulerpro/employee/nova",
  publicId: "schedulerpro/employee/nova",
};

/** Buffer com assinatura PNG válida. */
const file: UploadedFile = {
  buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  originalname: "foto.png",
  mimetype: "image/png",
  size: 8,
};

function employee(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => userId },
    id: userId,
    name: "Funcionário",
    email: "func@example.com",
    companyId: { toString: () => companyId },
    role: Role.EMPLOYEE,
    avatar: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  userRepository.findById.mockResolvedValue(employee());
  userRepository.update.mockResolvedValue(employee({ avatar: newImage }));
  imageProvider.replace.mockResolvedValue(newImage);
  imageProvider.remove.mockResolvedValue(undefined);
});

describe("UserService.updatePhoto - primeiro envio", () => {
  it("persiste o par { url, publicId } devolvido pelo provider", async () => {
    const result = await UserService.updatePhoto(userId, file, companyId);

    expect(userRepository.update).toHaveBeenCalledWith(userId, {
      avatar: { url: newImage.url, publicId: newImage.publicId },
    });
    expect(result).toMatchObject({ id: userId, avatar: newImage });
  });

  it("envia previous null quando o funcionário ainda não tem foto", async () => {
    await UserService.updatePhoto(userId, file, companyId);

    expect(imageProvider.replace).toHaveBeenCalledWith({
      file,
      entity: ImageEntity.EMPLOYEE,
      previous: null,
    });
  });

  it("usa a pasta de funcionário no storage", async () => {
    await UserService.updatePhoto(userId, file, companyId);

    expect(imageProvider.replace).toHaveBeenCalledWith(
      expect.objectContaining({ entity: ImageEntity.EMPLOYEE }),
    );
  });
});

describe("UserService.updatePhoto - substituição", () => {
  beforeEach(() => {
    userRepository.findById.mockResolvedValue(employee({ avatar: previousImage }));
  });

  it("entrega a imagem anterior ao provider, sem remover e enviar à mão", async () => {
    await UserService.updatePhoto(userId, file, companyId);

    expect(imageProvider.replace).toHaveBeenCalledWith({
      file,
      entity: ImageEntity.EMPLOYEE,
      previous: previousImage,
    });
  });

  it("nunca chama remove diretamente: a substituição é do provider", async () => {
    await UserService.updatePhoto(userId, file, companyId);

    expect(imageProvider.remove).not.toHaveBeenCalled();
    expect(imageProvider.upload).not.toHaveBeenCalled();
  });

  it("persiste o novo par e descarta o publicId antigo", async () => {
    await UserService.updatePhoto(userId, file, companyId);

    const [, persisted] = userRepository.update.mock.calls[0];

    expect(persisted.avatar.publicId).toBe(newImage.publicId);
    expect(persisted.avatar.publicId).not.toBe(previousImage.publicId);
  });

  it("propaga o erro do provider sem gravar nada no MongoDB", async () => {
    imageProvider.replace.mockRejectedValue(
      new Error("Falha ao enviar a imagem"),
    );

    await expect(
      UserService.updatePhoto(userId, file, companyId),
    ).rejects.toThrow("Falha ao enviar a imagem");

    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it("não apaga a imagem existente quando a validação falha", async () => {
    const invalid = { ...file, buffer: Buffer.from("MZ nao sou imagem"), size: 15 };
    imageProvider.replace.mockRejectedValue(
      new Error("Formato de imagem não permitido."),
    );

    await expect(
      UserService.updatePhoto(userId, invalid, companyId),
    ).rejects.toThrow("Formato de imagem não permitido.");

    expect(userRepository.update).not.toHaveBeenCalled();
    expect(imageProvider.remove).not.toHaveBeenCalled();
  });

  it("devolve 404 quando o storage aceitou mas o MongoDB não gravou (coerência)", async () => {
    /**
     * Caso raro de corrida: a imagem já está no Cloudinary,
     * mas o update retorna null (registo eliminado entre a
     * leitura e a escrita). Não se pode devolver sucesso
     * quando nada foi persistido.
     */
    userRepository.update.mockResolvedValue(null);

    await expect(
      UserService.updatePhoto(userId, file, companyId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });

    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ orphanPublicId: newImage.publicId }),
    );
  });
});

describe("UserService.updatePhoto - tenant e perfil", () => {
  it("impede alterar a foto de um funcionário de outra empresa", async () => {
    userRepository.findById.mockResolvedValue(
      employee({ companyId: { toString: () => otherCompanyId } }),
    );

    await expect(
      UserService.updatePhoto(userId, file, companyId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.FORBIDDEN });

    expect(imageProvider.replace).not.toHaveBeenCalled();
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it("devolve 404 quando o funcionário não existe", async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(
      UserService.updatePhoto(userId, file, companyId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });

    expect(imageProvider.replace).not.toHaveBeenCalled();
  });

  it.each([
    ["OWNER", Role.OWNER],
    ["ADMIN", Role.ADMIN],
    ["MANAGER", Role.MANAGER],
    ["CLIENT", Role.CLIENT],
  ])("recusa o perfil %s: apenas EMPLOYEE tem foto", async (_label, role) => {
    userRepository.findById.mockResolvedValue(employee({ role }));

    await expect(
      UserService.updatePhoto(userId, file, companyId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.FORBIDDEN });

    expect(imageProvider.replace).not.toHaveBeenCalled();
  });

  it("não encontra o utilizador através do repository soft-delete", async () => {
    /**
     * O `findById` do repository filtra `deletedAt: null`, logo
     * um funcionário eliminado não é encontrado e a operação
     * termina em 404 sem tocar no storage.
     */
    userRepository.findById.mockResolvedValue(null);

    await expect(
      UserService.updatePhoto(userId, file, companyId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });
  });
});

describe("UserService.removePhoto", () => {
  it("remove no storage e persiste avatar null", async () => {
    userRepository.findById.mockResolvedValue(employee({ avatar: previousImage }));
    userRepository.update.mockResolvedValue(employee({ avatar: null }));

    await UserService.removePhoto(userId, companyId);

    expect(imageProvider.remove).toHaveBeenCalledWith({ image: previousImage });
    expect(userRepository.update).toHaveBeenCalledWith(userId, { avatar: null });
  });

  it("é idempotente: sem foto não chama o storage nem o MongoDB", async () => {
    userRepository.findById.mockResolvedValue(employee({ avatar: null }));

    const result = await UserService.removePhoto(userId, companyId);

    expect(imageProvider.remove).not.toHaveBeenCalled();
    expect(userRepository.update).not.toHaveBeenCalled();
    expect(result).toMatchObject({ id: userId, avatar: null });
  });

  it("propaga o erro do provider e mantém a referência no MongoDB", async () => {
    userRepository.findById.mockResolvedValue(employee({ avatar: previousImage }));
    imageProvider.remove.mockRejectedValue(new Error("Falha ao remover a imagem."));

    await expect(UserService.removePhoto(userId, companyId)).rejects.toThrow(
      "Falha ao remover a imagem.",
    );

    /**
     * Não apagar o campo se o recurso não foi removido do
     * storage: a referência continua válida e o cliente pode
     * tentar de novo.
     */
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it("devolve 404 quando o storage removeu mas o MongoDB não gravou (coerência)", async () => {
    userRepository.findById.mockResolvedValue(employee({ avatar: previousImage }));
    userRepository.update.mockResolvedValue(null);

    await expect(UserService.removePhoto(userId, companyId)).rejects.toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
    });

    expect(imageProvider.remove).toHaveBeenCalledWith({ image: previousImage });
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ stalePublicId: previousImage.publicId }),
    );
  });

  it("bloqueia a remoção por tenant antes de tocar no storage", async () => {
    userRepository.findById.mockResolvedValue(
      employee({
        avatar: previousImage,
        companyId: { toString: () => otherCompanyId },
      }),
    );

    await expect(UserService.removePhoto(userId, companyId)).rejects.toMatchObject({
      statusCode: HttpStatus.FORBIDDEN,
    });

    expect(imageProvider.remove).not.toHaveBeenCalled();
  });

  it("recusa remover a foto de um perfil que não é EMPLOYEE", async () => {
    userRepository.findById.mockResolvedValue(
      employee({ role: Role.MANAGER, avatar: previousImage }),
    );

    await expect(UserService.removePhoto(userId, companyId)).rejects.toMatchObject({
      statusCode: HttpStatus.FORBIDDEN,
    });

    expect(imageProvider.remove).not.toHaveBeenCalled();
  });
});
