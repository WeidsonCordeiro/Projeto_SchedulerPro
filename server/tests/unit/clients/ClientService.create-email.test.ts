import { beforeEach, describe, expect, it, vi } from "vitest";

const { clientRepository, userRepository, passwordProvider, clientMapper } =
  vi.hoisted(() => ({
    clientRepository: {
      create: vi.fn(),
      update: vi.fn(),
      findByIdAndCompany: vi.fn(),
      findByCompanyId: vi.fn(),
    },
    userRepository: {
      findByEmail: vi.fn(),
      findByClientId: vi.fn(),
      findByEmailIncludingDeleted: vi.fn(),
      findByClientIdIncludingDeleted: vi.fn(),
      findByClientIdsAndCompanyIncludingDeleted: vi.fn(),
      update: vi.fn(),
      updateIncludingDeleted: vi.fn(),
      create: vi.fn(),
    },
    passwordProvider: { hash: vi.fn() },
    clientMapper: {
      toResponse: vi.fn(
        (client: unknown, access?: unknown) => ({
          ...(client as object),
          portalAccess: access ?? { exists: false, isActive: false },
        }),
      ),
    },
  }));

vi.mock("../../../src/modules/Clients/repositories/ClientRepository", () => ({
  default: clientRepository,
}));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({
  default: userRepository,
}));
vi.mock("../../../src/providers/security/PasswordProvider", () => ({
  default: passwordProvider,
}));
vi.mock("../../../src/modules/Clients/mappers/ClientMapper", () => ({
  default: clientMapper,
}));

import ClientService from "../../../src/modules/Clients/services/ClientService";
import { HttpStatus } from "../../../src/constants/http-status";

const companyId = "507f1f77bcf86cd799439011";
const clientId = "507f1f77bcf86cd799439015";

const basicPayload = {
  name: "João",
  email: "joao@email.com",
  phone: "912345678",
};

const createdClient = {
  _id: { toString: () => clientId },
  name: "João",
  email: "joao@email.com",
  phone: "912345678",
  companyId: { toString: () => companyId },
  notes: null,
  isActive: true,
};

const existingUser = {
  _id: { toString: () => "user-1" },
  clientId: { toString: () => "client-other" },
  email: "joao@email.com",
};

beforeEach(() => {
  vi.clearAllMocks();
  passwordProvider.hash.mockResolvedValue("hashed-password");
  userRepository.findByEmailIncludingDeleted.mockResolvedValue(null);
  userRepository.findByClientIdIncludingDeleted.mockResolvedValue(null);
  clientRepository.create.mockResolvedValue(createdClient);
});

// ---------------------------------------------------------------------------
// create — validação de conflito de e-mail
// ---------------------------------------------------------------------------
describe("ClientService.create — validação de conflito de e-mail", () => {
  it("Caso 1 — cria normalmente sem e-mail e sem criar User", async () => {
    const { email: _ignored, ...payloadSemEmail } = basicPayload;

    const result = await ClientService.create(payloadSemEmail, companyId);

    expect(userRepository.findByEmailIncludingDeleted).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
    expect(clientRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: payloadSemEmail.name,
        phone: payloadSemEmail.phone,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        portalAccess: { exists: false, isActive: false },
      }),
    );
  });

  it("Caso 2 — cria normalmente quando o e-mail não está em uso", async () => {
    userRepository.findByEmailIncludingDeleted.mockResolvedValue(null);

    const result = await ClientService.create(basicPayload, companyId);

    expect(userRepository.findByEmailIncludingDeleted).toHaveBeenCalledWith(
      "joao@email.com",
    );
    expect(userRepository.create).not.toHaveBeenCalled();
    expect(clientRepository.create).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        portalAccess: { exists: false, isActive: false },
      }),
    );
  });

  it("Caso 3 — 409 quando o e-mail pertence a um User ativo", async () => {
    userRepository.findByEmailIncludingDeleted.mockResolvedValue(existingUser);

    await expect(
      ClientService.create(basicPayload, companyId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.CONFLICT });

    expect(clientRepository.create).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("Caso 4 — 409 quando o e-mail pertence a outro User CLIENT", async () => {
    const outroClient = {
      _id: { toString: () => "user-client" },
      clientId: { toString: () => "client-existente" },
      role: "CLIENT",
      email: "joao@email.com",
    };
    userRepository.findByEmailIncludingDeleted.mockResolvedValue(outroClient);

    await expect(
      ClientService.create(basicPayload, companyId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.CONFLICT });

    expect(clientRepository.create).not.toHaveBeenCalled();
  });

  it("Caso 5 — 409 para User de outra company (índice unique global)", async () => {
    const userOutraEmpresa = {
      _id: { toString: () => "user-B" },
      clientId: { toString: () => "client-B" },
      companyId: { toString: () => "507f1f77bcf86cd799439099" },
      email: "joao@email.com",
    };
    userRepository.findByEmailIncludingDeleted.mockResolvedValue(userOutraEmpresa);

    await expect(
      ClientService.create(basicPayload, companyId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.CONFLICT });

    expect(clientRepository.create).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
    expect(userRepository.update).not.toHaveBeenCalled();
    expect(userRepository.updateIncludingDeleted).not.toHaveBeenCalled();
  });

  it("Caso 6 — 409 para User soft-deleted (índice unique reserva o e-mail)", async () => {
    const userSoftDeleted = {
      _id: { toString: () => "user-deleted" },
      clientId: { toString: () => "client-deleted" },
      email: "joao@email.com",
      deletedAt: new Date("2025-01-01"),
    };
    userRepository.findByEmailIncludingDeleted.mockResolvedValue(userSoftDeleted);

    await expect(
      ClientService.create(basicPayload, companyId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.CONFLICT });

    expect(clientRepository.create).not.toHaveBeenCalled();
  });

  it("normaliza o e-mail antes da checagem (case/trim)", async () => {
    const result = await ClientService.create(
      { ...basicPayload, email: "  Joao@Email.com  " },
      companyId,
    );

    expect(userRepository.findByEmailIncludingDeleted).toHaveBeenCalledWith(
      "joao@email.com",
    );
    expect(clientRepository.create).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// update — conflito de e-mail para cliente SEM User vinculado (regressão 26.3)
// ---------------------------------------------------------------------------
describe("ClientService.update — conflito de e-mail sem User vinculado", () => {
  const updatedClient = {
    _id: { toString: () => clientId },
    name: "João",
    email: "joao@email.com",
    phone: "912345678",
    companyId: { toString: () => companyId },
    notes: null,
    isActive: true,
  };

  it("409 quando cliente sem User tenta usar e-mail já reservado", async () => {
    clientRepository.update.mockResolvedValue(updatedClient);
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(null);
    userRepository.findByEmailIncludingDeleted.mockResolvedValue(existingUser);

    await expect(
      ClientService.update(clientId, { email: "joao@email.com" }, companyId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.CONFLICT });

    expect(clientRepository.update).not.toHaveBeenCalled();
    expect(userRepository.update).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("atualiza normalmente quando cliente sem User usa e-mail livre", async () => {
    clientRepository.update.mockResolvedValue(updatedClient);
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(null);
    userRepository.findByEmailIncludingDeleted.mockResolvedValue(null);

    const result = await ClientService.update(
      clientId,
      { email: "joao@email.com" },
      companyId,
    );

    expect(clientRepository.update).toHaveBeenCalledWith(
      clientId,
      companyId,
      { email: "joao@email.com" },
    );
    expect(userRepository.update).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        portalAccess: { exists: false, isActive: false },
      }),
    );
  });

  it("normaliza o e-mail na atualização antes da checagem de conflito", async () => {
    clientRepository.update.mockResolvedValue(updatedClient);
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(null);
    userRepository.findByEmailIncludingDeleted.mockResolvedValue(existingUser);

    await expect(
      ClientService.update(
        clientId,
        { email: "  Joao@Email.com  " },
        companyId,
      ),
    ).rejects.toMatchObject({ statusCode: HttpStatus.CONFLICT });

    expect(userRepository.findByEmailIncludingDeleted).toHaveBeenCalledWith(
      "joao@email.com",
    );
    expect(clientRepository.update).not.toHaveBeenCalled();
  });

  it("mantém próprio e-mail da conta vinculada (sem conflito)", async () => {
    const linkedUser = {
      _id: { toString: () => "user-active" },
      clientId: { toString: () => clientId },
      email: "joao@email.com",
      isActive: true,
      deletedAt: null,
    };
    clientRepository.update.mockResolvedValue(updatedClient);
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(linkedUser);

    await ClientService.update(
      clientId,
      { email: "joao@email.com" },
      companyId,
    );

    expect(userRepository.findByEmailIncludingDeleted).not.toHaveBeenCalled();
    expect(userRepository.update).not.toHaveBeenCalled();
  });
});