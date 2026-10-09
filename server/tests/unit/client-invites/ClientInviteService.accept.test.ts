import { Types } from "mongoose";

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  inviteRepository,
  clientRepository,
  userRepository,
  companyRepository,
  passwordProvider,
  notificationDispatcher,
  logger,
} = vi.hoisted(() => ({
  inviteRepository: {
    create: vi.fn(),
    findByTokenHash: vi.fn(),
    claim: vi.fn(),
    release: vi.fn(),
    revokePendingForClient: vi.fn(),
  },
  clientRepository: { findByIdAndCompany: vi.fn() },
  userRepository: {
    findByClientIdIncludingDeleted: vi.fn(),
    findByEmailIncludingDeleted: vi.fn(),
    create: vi.fn(),
  },
  companyRepository: { findById: vi.fn() },
  passwordProvider: { hash: vi.fn() },
  notificationDispatcher: { dispatchClientInviteEmail: vi.fn() },
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), email: vi.fn() },
}));

vi.mock(
  "../../../src/modules/client-invites/repositories/ClientInviteRepository",
  () => ({ default: inviteRepository }),
);
vi.mock("../../../src/modules/Clients/repositories/ClientRepository", () => ({
  default: clientRepository,
}));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({
  default: userRepository,
}));
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({
  default: companyRepository,
}));
vi.mock("../../../src/providers/security/PasswordProvider", () => ({
  default: passwordProvider,
}));
vi.mock(
  "../../../src/modules/notifications/services/NotificationDispatcher",
  () => ({ default: notificationDispatcher }),
);
vi.mock("../../../src/providers/logger/Logger", () => ({ default: logger }));

import ClientInviteService from "../../../src/modules/client-invites/services/ClientInviteService";
import ClientInviteTokenProvider from "../../../src/providers/security/ClientInviteTokenProvider";
import { HttpStatus } from "../../../src/constants/http-status";
import { HttpMessages } from "../../../src/constants/http-messages";

const companyId = "507f1f77bcf86cd799439011";
const clientId = "507f1f77bcf86cd799439015";

const ref = (id: string) => ({ toString: () => id });

const TOKEN = ClientInviteTokenProvider.generate();
const TOKEN_HASH = ClientInviteTokenProvider.hash(TOKEN);

const inviteId = new Types.ObjectId();

const client = {
  _id: ref(clientId),
  companyId: ref(companyId),
  name: "Maria Silva",
  email: "maria@email.com",
  isActive: true,
  deletedAt: null,
};

const validInvite = () => ({
  _id: inviteId,
  companyId: ref(companyId),
  clientId: ref(clientId),
  tokenHash: TOKEN_HASH,
  expiresAt: new Date(Date.now() + 60_000),
  usedAt: null,
  revokedAt: null,
});

const dto = (overrides: Record<string, unknown> = {}) => ({
  token: TOKEN,
  password: "senhaForte123",
  confirmPassword: "senhaForte123",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  inviteRepository.findByTokenHash.mockResolvedValue(validInvite());
  inviteRepository.claim.mockResolvedValue({ usedAt: new Date() });
  inviteRepository.release.mockResolvedValue(undefined);
  clientRepository.findByIdAndCompany.mockResolvedValue(client);
  userRepository.findByClientIdIncludingDeleted.mockResolvedValue(null);
  userRepository.findByEmailIncludingDeleted.mockResolvedValue(null);
  userRepository.create.mockResolvedValue({ _id: ref("user-new") });
  companyRepository.findById.mockResolvedValue({
    _id: ref(companyId),
    name: "Studio Aurora",
  });
  passwordProvider.hash.mockResolvedValue("hashed-password");
});

describe("ClientInviteService.accept", () => {
  it("Cenário A: cria a conta CLIENT com role e tenant DERIVADOS", async () => {
    const result = await ClientInviteService.accept(TOKEN, dto());

    expect(inviteRepository.claim).toHaveBeenCalledWith(inviteId);

    expect(userRepository.create).toHaveBeenCalledTimes(1);
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Maria Silva",
        email: "maria@email.com",
        passwordHash: "hashed-password",
        companyId: client.companyId,
        role: "CLIENT",
        clientId: client._id,
        mustChangePassword: false,
        isActive: true,
        emailVerified: true,
      }),
    );

    expect(inviteRepository.release).not.toHaveBeenCalled();
    expect(result).toEqual({ email: "maria@email.com" });
  });

  it("ignora companyId/role/clientId vindos do corpo do pedido", async () => {
    await ClientInviteService.accept(
      TOKEN,
      dto({
        companyId: "507f1f77bcf86cd799439012",
        role: "OWNER",
        clientId: "507f1f77bcf86cd799439099",
      }) as never,
    );

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: client.companyId,
        role: "CLIENT",
        clientId: client._id,
      }),
    );
  });

  it("hash da senha nunca é a senha em plaintext", async () => {
    await ClientInviteService.accept(TOKEN, dto());

    expect(passwordProvider.hash).toHaveBeenCalledWith("senhaForte123");

    const payload = userRepository.create.mock.calls[0][0] as {
      passwordHash: string;
    };
    expect(payload.passwordHash).toBe("hashed-password");
    expect(payload.passwordHash).not.toBe("senhaForte123");
  });

  it("token malformado → 404 sem tocar na base de dados", async () => {
    await expect(
      ClientInviteService.accept("curto", dto({ token: "curto" })),
    ).rejects.toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
      message: HttpMessages.CLIENT_INVITE_INVALID,
    });

    expect(inviteRepository.findByTokenHash).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("token malformado e inexistente respondem a MESMA mensagem", async () => {
    const malformed = await ClientInviteService.accept(
      "não-é-base64url/!!!",
      dto({ token: "não-é-base64url/!!!x".padEnd(43, "!") }),
    ).catch((error: { message: string }) => error.message);

    inviteRepository.findByTokenHash.mockResolvedValue(null);
    const missing = await ClientInviteService.accept(TOKEN, dto()).catch(
      (error: { message: string }) => error.message,
    );

    expect(malformed).toBe(HttpMessages.CLIENT_INVITE_INVALID);
    expect(missing).toBe(HttpMessages.CLIENT_INVITE_INVALID);
  });

  it("token expirado → 404 CLIENT_INVITE_EXPIRED", async () => {
    inviteRepository.findByTokenHash.mockResolvedValue({
      ...validInvite(),
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(ClientInviteService.accept(TOKEN, dto())).rejects.toMatchObject(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: HttpMessages.CLIENT_INVITE_EXPIRED,
      },
    );

    expect(inviteRepository.claim).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("token já consumido → 404 genérico (sem oracle de causa)", async () => {
    inviteRepository.findByTokenHash.mockResolvedValue({
      ...validInvite(),
      usedAt: new Date(),
    });

    await expect(ClientInviteService.accept(TOKEN, dto())).rejects.toMatchObject(
      { message: HttpMessages.CLIENT_INVITE_INVALID },
    );

    expect(inviteRepository.claim).not.toHaveBeenCalled();
  });

  it("token revogado → 404 genérico (sem oracle de causa)", async () => {
    inviteRepository.findByTokenHash.mockResolvedValue({
      ...validInvite(),
      revokedAt: new Date(),
    });

    await expect(ClientInviteService.accept(TOKEN, dto())).rejects.toMatchObject(
      { message: HttpMessages.CLIENT_INVITE_INVALID },
    );

    expect(inviteRepository.claim).not.toHaveBeenCalled();
  });

  it("Cenário B: cliente ganhou conta entretanto → 409, sem claim", async () => {
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue({
      _id: ref("user-1"),
      clientId: ref(clientId),
    });

    await expect(ClientInviteService.accept(TOKEN, dto())).rejects.toMatchObject(
      {
        statusCode: HttpStatus.CONFLICT,
        message: HttpMessages.CLIENT_ALREADY_HAS_ACCOUNT,
      },
    );

    expect(inviteRepository.claim).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("Cenário C: e-mail de outra conta → 409, sem claim", async () => {
    userRepository.findByEmailIncludingDeleted.mockResolvedValue({
      _id: ref("user-2"),
      clientId: ref("other-client"),
    });

    await expect(ClientInviteService.accept(TOKEN, dto())).rejects.toMatchObject(
      {
        statusCode: HttpStatus.CONFLICT,
        message: HttpMessages.EMAIL_ALREADY_EXISTS,
      },
    );

    expect(inviteRepository.claim).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("uso único: claim sem resultado → 404 e nenhuma conta criada", async () => {
    inviteRepository.claim.mockResolvedValue(null);

    await expect(ClientInviteService.accept(TOKEN, dto())).rejects.toMatchObject(
      { message: HttpMessages.CLIENT_INVITE_INVALID },
    );

    expect(userRepository.create).not.toHaveBeenCalled();
    expect(inviteRepository.release).not.toHaveBeenCalled();
  });

  it("falha ao criar o utilizador DEVOLVE o convite ao estado pendente", async () => {
    userRepository.create.mockRejectedValue(new Error("db em baixo"));

    await expect(ClientInviteService.accept(TOKEN, dto())).rejects.toThrow(
      "db em baixo",
    );

    expect(inviteRepository.release).toHaveBeenCalledWith(
      inviteId,
      expect.any(Date),
    );
  });

  it("corrida pelo índice unique de email → 409 com release", async () => {
    userRepository.create.mockRejectedValue({ code: 11000 });

    await expect(ClientInviteService.accept(TOKEN, dto())).rejects.toMatchObject(
      {
        statusCode: HttpStatus.CONFLICT,
        message: HttpMessages.EMAIL_ALREADY_EXISTS,
      },
    );

    expect(inviteRepository.release).toHaveBeenCalledWith(
      inviteId,
      expect.any(Date),
    );
  });

  it("nenhum log de aceite contém o token puro", async () => {
    await ClientInviteService.accept(TOKEN, dto());

    const logged = [
      ...logger.info.mock.calls,
      ...logger.error.mock.calls,
    ];

    expect(logged.length).toBeGreaterThan(0);
    for (const call of logged) {
      expect(JSON.stringify(call)).not.toContain(TOKEN);
    }
  });
});
