import { createHash } from "crypto";

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

import ClientInviteService, {
  CLIENT_INVITE_TTL_MS,
} from "../../../src/modules/client-invites/services/ClientInviteService";
import { HttpStatus } from "../../../src/constants/http-status";
import { HttpMessages } from "../../../src/constants/http-messages";

const companyId = "507f1f77bcf86cd799439011";
const clientId = "507f1f77bcf86cd799439015";
const actorId = "507f1f77bcf86cd799439016";

const ref = (id: string) => ({ toString: () => id });

const client = {
  _id: ref(clientId),
  companyId: ref(companyId),
  name: "Maria Silva",
  email: "maria@email.com",
  isActive: true,
  deletedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  clientRepository.findByIdAndCompany.mockResolvedValue(client);
  userRepository.findByClientIdIncludingDeleted.mockResolvedValue(null);
  userRepository.findByEmailIncludingDeleted.mockResolvedValue(null);
  companyRepository.findById.mockResolvedValue({
    _id: ref(companyId),
    name: "Studio Aurora",
  });
  inviteRepository.create.mockResolvedValue({});
  inviteRepository.revokePendingForClient.mockResolvedValue(undefined);
  notificationDispatcher.dispatchClientInviteEmail.mockResolvedValue(undefined);
});

describe("ClientInviteService.createInvite", () => {
  it("emite o convite persistindo APENAS o hash do token", async () => {
    const result = await ClientInviteService.createInvite(
      clientId,
      companyId,
      actorId,
    );

    expect(inviteRepository.create).toHaveBeenCalledTimes(1);

    const payload = inviteRepository.create.mock.calls[0][0] as {
      tokenHash: string;
      companyId: unknown;
      clientId: unknown;
      expiresAt: Date;
      createdBy: unknown;
    };

    expect(payload.tokenHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(payload.companyId).toBe(client.companyId);
    expect(payload.clientId).toBe(client._id);
    expect(payload.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(payload.expiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + CLIENT_INVITE_TTL_MS + 1000,
    );

    /**
     * O link entregue ao e-mail deve conter um token cujo hash
     * é exatamente o persistido — prova de que o servidor não
     * guarda o plaintext.
     */
    const dispatchArg = notificationDispatcher.dispatchClientInviteEmail.mock
      .calls[0][0] as { to: string; inviteUrl: string };
    const tokenFromUrl = dispatchArg.inviteUrl.split("/").pop()!;

    expect(createHash("sha256").update(tokenFromUrl, "utf8").digest("hex")).toBe(
      payload.tokenHash.slice("sha256:".length),
    );
    expect(dispatchArg.to).toBe("maria@email.com");

    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it("revoga convites pendentes anteriores ANTES de criar o novo", async () => {
    await ClientInviteService.createInvite(clientId, companyId, actorId);

    expect(inviteRepository.revokePendingForClient).toHaveBeenCalledWith(
      clientId,
    );

    const revokeOrder = inviteRepository.revokePendingForClient.mock
      .invocationCallOrder[0];
    const createOrder = inviteRepository.create.mock.invocationCallOrder[0];
    expect(revokeOrder).toBeLessThan(createOrder);
  });

  it("não devolve nem registra o token puro", async () => {
    const result = await ClientInviteService.createInvite(
      clientId,
      companyId,
      actorId,
    );

    const dispatchArg = notificationDispatcher.dispatchClientInviteEmail.mock
      .calls[0][0] as { inviteUrl: string };
    const token = dispatchArg.inviteUrl.split("/").pop()!;

    expect(JSON.stringify(result)).not.toContain(token);

    const logged = [
      ...logger.info.mock.calls,
      ...logger.error.mock.calls,
      ...logger.email.mock.calls,
    ];
    for (const call of logged) {
      expect(JSON.stringify(call)).not.toContain(token);
    }
  });

  it("Cenário B: cliente já com conta → 409 e nada muda", async () => {
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue({
      _id: ref("user-1"),
      clientId: ref(clientId),
    });

    await expect(
      ClientInviteService.createInvite(clientId, companyId, actorId),
    ).rejects.toMatchObject({
      statusCode: HttpStatus.CONFLICT,
      message: HttpMessages.CLIENT_ALREADY_HAS_ACCOUNT,
    });

    expect(inviteRepository.create).not.toHaveBeenCalled();
    expect(inviteRepository.revokePendingForClient).not.toHaveBeenCalled();
    expect(
      notificationDispatcher.dispatchClientInviteEmail,
    ).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("Cenário C: e-mail pertence a outra conta → 409, sem associação", async () => {
    userRepository.findByEmailIncludingDeleted.mockResolvedValue({
      _id: ref("user-2"),
      clientId: ref("other-client"),
    });

    await expect(
      ClientInviteService.createInvite(clientId, companyId, actorId),
    ).rejects.toMatchObject({
      statusCode: HttpStatus.CONFLICT,
      message: HttpMessages.EMAIL_ALREADY_EXISTS,
    });

    expect(inviteRepository.create).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("cross-tenant: cliente de outra empresa → 404, sem convite", async () => {
    clientRepository.findByIdAndCompany.mockResolvedValue(null);

    await expect(
      ClientInviteService.createInvite(clientId, "507f1f77bcf86cd799439012", actorId),
    ).rejects.toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
      message: HttpMessages.CLIENT_NOT_FOUND,
    });

    expect(inviteRepository.create).not.toHaveBeenCalled();
    expect(userRepository.findByClientIdIncludingDeleted).not.toHaveBeenCalled();
  });

  it("cliente soft-deleted → 404 (repositório filtra deletedAt)", async () => {
    clientRepository.findByIdAndCompany.mockResolvedValue(null);

    await expect(
      ClientInviteService.createInvite(clientId, companyId, actorId),
    ).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });

    expect(inviteRepository.create).not.toHaveBeenCalled();
  });

  it("cliente sem e-mail → 400", async () => {
    clientRepository.findByIdAndCompany.mockResolvedValue({
      ...client,
      email: undefined,
    });

    await expect(
      ClientInviteService.createInvite(clientId, companyId, actorId),
    ).rejects.toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      message: HttpMessages.CLIENT_EMAIL_REQUIRED,
    });

    expect(inviteRepository.create).not.toHaveBeenCalled();
  });

  it("e-mail malformado → 400 e nenhum convite emitido", async () => {
    clientRepository.findByIdAndCompany.mockResolvedValue({
      ...client,
      email: "sem-arroba",
    });

    await expect(
      ClientInviteService.createInvite(clientId, companyId, actorId),
    ).rejects.toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      message: HttpMessages.CLIENT_EMAIL_INVALID,
    });

    expect(inviteRepository.create).not.toHaveBeenCalled();
  });

  it("falha no envio do e-mail revoga o convite e devolve 500", async () => {
    notificationDispatcher.dispatchClientInviteEmail.mockRejectedValue(
      new Error("smtp indisponível"),
    );

    await expect(
      ClientInviteService.createInvite(clientId, companyId, actorId),
    ).rejects.toMatchObject({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: HttpMessages.EMAIL_SEND_FAILED,
    });

    /**
     * Duas revogações: a preventiva de sempre + a da falha.
     */
    expect(inviteRepository.revokePendingForClient).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalled();
  });

  it("o registo operacional não contém token, hash nem URL", async () => {
    await ClientInviteService.createInvite(clientId, companyId, actorId);

    const infoArgs = logger.info.mock.calls[0][0];
    expect(infoArgs).toBe("Convite de conta CLIENT emitido");

    const infoMeta = JSON.stringify(logger.info.mock.calls[0][1]);
    expect(infoMeta).not.toMatch(/sha256:/);
    expect(infoMeta).not.toContain("/convite/cliente/");
    expect(infoMeta).not.toContain("token");
  });
});
