import { beforeEach, describe, expect, it, vi } from "vitest";

const { clientRepository, userRepository, passwordProvider, clientMapper } =
  vi.hoisted(() => ({
    clientRepository: {
      create: vi.fn(),
      findByCompanyId: vi.fn(),
      findByIdAndCompany: vi.fn(),
      update: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
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

const activeUser = {
  _id: { toString: () => "user-active" },
  clientId: { toString: () => clientId },
  name: "Ana Silva",
  email: "ana@example.com",
  isActive: true,
  deletedAt: null,
};

const inactiveUser = {
  _id: { toString: () => "user-inactive" },
  clientId: { toString: () => clientId },
  name: "Ana Silva",
  email: "ana@example.com",
  isActive: false,
  deletedAt: null,
};

const deletedUser = {
  _id: { toString: () => "user-deleted" },
  clientId: { toString: () => clientId },
  name: "Ana Silva",
  email: "ana@example.com",
  isActive: true,
  deletedAt: new Date("2025-01-01"),
};

const updatedClient = {
  _id: { toString: () => clientId },
  name: "Ana Silva",
  email: "ana@example.com",
  phone: "912345678",
  companyId: { toString: () => companyId },
  notes: null,
  isActive: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  passwordProvider.hash.mockResolvedValue("hashed-password");
  userRepository.findByClientIdIncludingDeleted.mockResolvedValue(null);
  userRepository.findByEmailIncludingDeleted.mockResolvedValue(null);
  userRepository.findByClientIdsAndCompanyIncludingDeleted.mockResolvedValue(
    [],
  );
});

// ---------------------------------------------------------------------------
// update — sincronização Client → User
// ---------------------------------------------------------------------------
describe("ClientService.update — sincronização com conta de acesso", () => {
  it("sincroniza name quando o nome do cliente é alterado", async () => {
    clientRepository.update.mockResolvedValue({
      ...updatedClient,
      name: "Ana Souza",
    });
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(activeUser);

    await ClientService.update(
      clientId,
      { name: "Ana Souza" },
      companyId,
    );

    expect(userRepository.update).toHaveBeenCalledWith(
      "user-active",
      { name: "Ana Souza" },
    );
  });

  it("sincroniza email quando o e-mail do cliente é alterado", async () => {
    clientRepository.update.mockResolvedValue({
      ...updatedClient,
      email: "novo@example.com",
    });
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(activeUser);

    await ClientService.update(
      clientId,
      { email: "novo@example.com" },
      companyId,
    );

    expect(userRepository.update).toHaveBeenCalledWith(
      "user-active",
      { email: "novo@example.com" },
    );
  });

  it("sincroniza name e email quando ambos são alterados", async () => {
    clientRepository.update.mockResolvedValue({
      ...updatedClient,
      name: "Ana Souza",
      email: "novo@example.com",
    });
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(activeUser);

    await ClientService.update(
      clientId,
      { name: "Ana Souza", email: "novo@example.com" },
      companyId,
    );

    expect(userRepository.update).toHaveBeenCalledWith(
      "user-active",
      { name: "Ana Souza", email: "novo@example.com" },
    );
  });

  it("não altera passwordHash, role, clientId, companyId do User vinculado", async () => {
    clientRepository.update.mockResolvedValue({
      ...updatedClient,
      name: "Ana Souza",
    });
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(activeUser);

    await ClientService.update(
      clientId,
      { name: "Ana Souza" },
      companyId,
    );

    const [, payload] = userRepository.update.mock.calls[0];
    expect(payload).toEqual({ name: "Ana Souza" });
    expect(payload).not.toHaveProperty("passwordHash");
    expect(payload).not.toHaveProperty("role");
    expect(payload).not.toHaveProperty("clientId");
    expect(payload).not.toHaveProperty("companyId");
  });

  it("não chama update do User quando name/email não são alterados", async () => {
    clientRepository.update.mockResolvedValue(updatedClient);
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(activeUser);

    await ClientService.update(
      clientId,
      { phone: "999999999" },
      companyId,
    );

    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it("não cria User vinculado quando o cliente não possui conta de acesso", async () => {
    clientRepository.update.mockResolvedValue(updatedClient);
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(null);

    await ClientService.update(
      clientId,
      { name: "Ana Silva" },
      companyId,
    );

    expect(userRepository.create).not.toHaveBeenCalled();
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it("mantém o próprio e-mail do vínculo sem conflito", async () => {
    clientRepository.update.mockResolvedValue(updatedClient);
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(activeUser);

    await ClientService.update(
      clientId,
      { email: "ana@example.com" },
      companyId,
    );

    expect(userRepository.findByEmailIncludingDeleted).not.toHaveBeenCalled();
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it("lança CONFLICT quando o novo e-mail pertence a outro usuário", async () => {
    const otherUser = {
      _id: { toString: () => "other-user" },
      clientId: { toString: () => "other-client" },
      email: "novo@example.com",
    };
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(activeUser);
    userRepository.findByEmailIncludingDeleted.mockResolvedValue(otherUser);

    await expect(
      ClientService.update(
        clientId,
        { email: "novo@example.com" },
        companyId,
      ),
    ).rejects.toMatchObject({ statusCode: HttpStatus.CONFLICT });

    expect(clientRepository.update).not.toHaveBeenCalled();
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it("permite manter o e-mail já reservado pelo próprio vínculo", async () => {
    clientRepository.update.mockResolvedValue(updatedClient);
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(activeUser);
    userRepository.findByEmailIncludingDeleted.mockResolvedValue(activeUser);

    await ClientService.update(
      clientId,
      { email: "ana@example.com" },
      companyId,
    );

    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it("não sincroniza com vínculo soft-deleted", async () => {
    clientRepository.update.mockResolvedValue(updatedClient);
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(deletedUser);

    const client = await ClientService.update(
      clientId,
      { name: "Ana Silva" },
      companyId,
    );

    expect(userRepository.update).not.toHaveBeenCalled();
    expect(client).toEqual(
      expect.objectContaining({
        portalAccess: { exists: true, isActive: false },
      }),
    );
  });

  it("lança CLIENT_NOT_FOUND quando o cliente não existe na empresa", async () => {
    clientRepository.update.mockResolvedValue(null);

    await expect(
      ClientService.update(
        clientId,
        { name: "Ana Silva" },
        companyId,
      ),
    ).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });

    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it("retorna portalAccess { exists: false } quando não há conta vinculada", async () => {
    clientRepository.update.mockResolvedValue(updatedClient);
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(null);

    const result = await ClientService.update(
      clientId,
      { phone: "999999999" },
      companyId,
    );

    expect(result).toEqual(
      expect.objectContaining({
        portalAccess: { exists: false, isActive: false },
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Isolamento por empresa
// ---------------------------------------------------------------------------
describe("ClientService.update — isolamento por empresa", () => {
  it("não encontra nem sincroniza o User de outra empresa", async () => {
    clientRepository.update.mockResolvedValue(updatedClient);
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(null);

    const result = await ClientService.update(
      clientId,
      { name: "Ana Souza" },
      companyId,
    );

    expect(userRepository.findByClientIdIncludingDeleted).toHaveBeenCalledWith(
      clientId,
      companyId,
    );
    expect(userRepository.update).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        portalAccess: { exists: false, isActive: false },
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// findAll — portalAccess em lote
// ---------------------------------------------------------------------------
describe("ClientService.findAll — portalAccess em lote", () => {
  const client1 = {
    _id: { toString: () => "client-1" },
    name: "Cliente A",
    email: "a@test.com",
    phone: "111",
    companyId: { toString: () => companyId },
    notes: null,
    isActive: true,
  };

  const client2 = {
    _id: { toString: () => "client-2" },
    name: "Cliente B",
    email: "b@test.com",
    phone: "222",
    companyId: { toString: () => companyId },
    notes: null,
    isActive: true,
  };

  it("retorna portalAccess { exists: false } para clientes sem conta", async () => {
    clientRepository.findByCompanyId.mockResolvedValue([client1, client2]);
    userRepository.findByClientIdsAndCompanyIncludingDeleted.mockResolvedValue(
      [],
    );

    const result = await ClientService.findAll(companyId);

    expect(result[0]).toEqual(
      expect.objectContaining({
        portalAccess: { exists: false, isActive: false },
      }),
    );
    expect(result[1]).toEqual(
      expect.objectContaining({
        portalAccess: { exists: false, isActive: false },
      }),
    );
  });

  it("resolve portalAccess a partir dos User vinculados (incluindo soft-deleted)", async () => {
    clientRepository.findByCompanyId.mockResolvedValue([client1, client2]);
    userRepository.findByClientIdsAndCompanyIncludingDeleted.mockResolvedValue([
      {
        _id: { toString: () => "u1" },
        clientId: { toString: () => "client-1" },
        isActive: true,
        deletedAt: null,
      },
      {
        _id: { toString: () => "u2" },
        clientId: { toString: () => "client-2" },
        isActive: true,
        deletedAt: new Date("2025-01-01"),
      },
    ]);

    const result = await ClientService.findAll(companyId);

    expect(result[0]).toEqual(
      expect.objectContaining({
        portalAccess: { exists: true, isActive: true },
      }),
    );
    expect(result[1]).toEqual(
      expect.objectContaining({
        portalAccess: { exists: true, isActive: false },
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// findById — portalAccess
// ---------------------------------------------------------------------------
describe("ClientService.findById — portalAccess", () => {
  it("retorna portalAccess { exists: true, isActive: false } para vínculo inativo", async () => {
    clientRepository.findByIdAndCompany.mockResolvedValue(updatedClient);
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(
      inactiveUser,
    );

    const result = await ClientService.findById(clientId, companyId);

    expect(result).toEqual(
      expect.objectContaining({
        portalAccess: { exists: true, isActive: false },
      }),
    );
  });

  it("retorna portalAccess { exists: false } quando não há vínculo", async () => {
    clientRepository.findByIdAndCompany.mockResolvedValue(updatedClient);
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(null);

    const result = await ClientService.findById(clientId, companyId);

    expect(result).toEqual(
      expect.objectContaining({
        portalAccess: { exists: false, isActive: false },
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// setCredentials — response com portalAccess
// ---------------------------------------------------------------------------
describe("ClientService.setCredentials — portalAccess na resposta", () => {
  it("retorna portalAccess { exists: true, isActive: true } após criar conta", async () => {
    clientRepository.findByIdAndCompany.mockResolvedValue(updatedClient);

    const result = await ClientService.setCredentials(clientId, companyId, {
      password: "12345678",
      confirmPassword: "12345678",
    });

    expect(result).toEqual(
      expect.objectContaining({
        portalAccess: { exists: true, isActive: true },
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// create — portalAccess
// ---------------------------------------------------------------------------
describe("ClientService.create — portalAccess", () => {
  it("retorna portalAccess { exists: false, isActive: false } para cliente novo", async () => {
    clientRepository.create.mockResolvedValue(updatedClient);

    const result = await ClientService.create(
      { name: "Ana", email: "ana@test.com", phone: "111" },
      companyId,
    );

    expect(result).toEqual(
      expect.objectContaining({
        portalAccess: { exists: false, isActive: false },
      }),
    );
  });
});
