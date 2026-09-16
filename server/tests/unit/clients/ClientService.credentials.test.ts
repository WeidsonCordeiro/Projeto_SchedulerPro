import { beforeEach, describe, expect, it, vi } from "vitest";

const { clientRepository, userRepository, passwordProvider, clientMapper } = vi.hoisted(() => ({
  clientRepository: { findByIdAndCompany: vi.fn() },
  userRepository: {
    findByEmail: vi.fn(),
    findByClientId: vi.fn(),
    findByEmailIncludingDeleted: vi.fn(),
    findByClientIdIncludingDeleted: vi.fn(),
    update: vi.fn(),
    updateIncludingDeleted: vi.fn(),
    create: vi.fn(),
  },
  passwordProvider: { hash: vi.fn() },
  clientMapper: { toResponse: vi.fn((value: unknown) => value) },
}));

vi.mock("../../../src/modules/Clients/repositories/ClientRepository", () => ({ default: clientRepository }));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({ default: userRepository }));
vi.mock("../../../src/providers/security/PasswordProvider", () => ({ default: passwordProvider }));
vi.mock("../../../src/modules/Clients/mappers/ClientMapper", () => ({ default: clientMapper }));

import ClientService from "../../../src/modules/Clients/services/ClientService";
import { HttpStatus } from "../../../src/constants/http-status";

const companyId = "507f1f77bcf86cd799439011";
const clientId = "507f1f77bcf86cd799439015";

const client = {
  _id: { toString: () => clientId },
  email: "client@test.com",
  name: "Cliente",
};

beforeEach(() => {
  vi.clearAllMocks();
  clientRepository.findByIdAndCompany.mockResolvedValue(client);
  passwordProvider.hash.mockResolvedValue("hashed-password");
  userRepository.findByEmailIncludingDeleted.mockResolvedValue(null);
  userRepository.findByClientIdIncludingDeleted.mockResolvedValue(null);
  userRepository.create.mockResolvedValue({ _id: { toString: () => "new-user" } });
});

describe("ClientService.setCredentials", () => {
  it("cria novo CLIENT vinculado quando não existe usuário para o cliente", async () => {
    await ClientService.setCredentials(clientId, companyId, {
      password: "12345678",
      confirmPassword: "12345678",
    });

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "client@test.com",
        role: "CLIENT",
        emailVerified: true,
        mustChangePassword: true,
        clientId: client._id,
      }),
    );
    expect(userRepository.updateIncludingDeleted).not.toHaveBeenCalled();
  });

  it("atualiza usuário CLIENT ativo vinculado sem criar duplicata", async () => {
    const linkedUser = {
      _id: { toString: () => "user-active" },
      clientId: { toString: () => clientId },
      email: "client@test.com",
    };
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(linkedUser);
    userRepository.findByEmailIncludingDeleted.mockResolvedValue(linkedUser);

    await ClientService.setCredentials(clientId, companyId, {
      password: "12345678",
      confirmPassword: "12345678",
    });

    expect(userRepository.updateIncludingDeleted).toHaveBeenCalledWith(
      "user-active",
      expect.objectContaining({
        passwordHash: "hashed-password",
        mustChangePassword: true,
        emailVerified: true,
        isActive: true,
        deletedAt: null,
      }),
    );
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("restaura CLIENT soft-deleted e atualiza o e-mail quando necessário", async () => {
    const deletedUser = {
      _id: { toString: () => "user-deleted" },
      clientId: { toString: () => clientId },
      email: "old@test.com",
    };
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue(deletedUser);

    await ClientService.setCredentials(clientId, companyId, {
      password: "12345678",
      confirmPassword: "12345678",
    });

    expect(userRepository.updateIncludingDeleted).toHaveBeenCalledWith(
      "user-deleted",
      expect.objectContaining({
        deletedAt: null,
        emailVerified: true,
        isActive: true,
        email: "client@test.com",
      }),
    );
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("lança CONFLICT (409) quando o e-mail está reservado por outro usuário", async () => {
    const otherUser = {
      _id: { toString: () => "other-user" },
      clientId: { toString: () => "other-client" },
      email: "client@test.com",
    };
    userRepository.findByEmailIncludingDeleted.mockResolvedValue(otherUser);

    await expect(
      ClientService.setCredentials(clientId, companyId, {
        password: "12345678",
        confirmPassword: "12345678",
      }),
    ).rejects.toMatchObject({ statusCode: HttpStatus.CONFLICT });

    expect(userRepository.create).not.toHaveBeenCalled();
    expect(userRepository.updateIncludingDeleted).not.toHaveBeenCalled();
  });

  it("lança CLIENT_NOT_FOUND quando cliente não existe", async () => {
    clientRepository.findByIdAndCompany.mockResolvedValue(null);

    await expect(
      ClientService.setCredentials(clientId, companyId, {
        password: "12345678",
        confirmPassword: "12345678",
      }),
    ).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });
  });

  it("lança CLIENT_EMAIL_REQUIRED quando cliente não possui e-mail", async () => {
    clientRepository.findByIdAndCompany.mockResolvedValue({
      ...client,
      email: null,
    });

    await expect(
      ClientService.setCredentials(clientId, companyId, {
        password: "12345678",
        confirmPassword: "12345678",
      }),
    ).rejects.toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });
  });
});
