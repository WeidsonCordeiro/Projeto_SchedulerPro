import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ids = {
  companyA: "507f1f77bcf86cd799439011",
  client: "507f1f77bcf86cd799439015",
  otherClient: "507f1f77bcf86cd799439016",
};

const {
  inspectLimitCalls,
  acceptLimitCalls,
  inviteRepository,
  clientRepository,
  userRepository,
  companyRepository,
  passwordProvider,
  notificationDispatcher,
} = vi.hoisted(() => ({
  /**
   * Contadores simples (não `vi.fn`): `restoreMocks` apagaria
   * a implementação de um mock de middleware.
   */
  inspectLimitCalls: { count: 0 },
  acceptLimitCalls: { count: 0 },
  inviteRepository: {
    create: vi.fn(),
    findByTokenHash: vi.fn(),
    claim: vi.fn(),
    release: vi.fn(),
    revokePendingForClient: vi.fn(),
  },
  clientRepository: {
    findByIdAndCompany: vi.fn(),
    findByEmailAndCompany: vi.fn(),
    create: vi.fn(),
  },
  userRepository: {
    findByClientIdIncludingDeleted: vi.fn(),
    findByEmailIncludingDeleted: vi.fn(),
    create: vi.fn(),
  },
  companyRepository: { findById: vi.fn() },
  passwordProvider: { hash: vi.fn() },
  notificationDispatcher: { dispatchClientInviteEmail: vi.fn() },
}));

vi.mock("../../src/middlewares/client-invite-rate-limit.middleware", () => {
  const pass = (counter: { count: number }) =>
    (_req: never, _res: never, next: () => void) => {
      counter.count += 1;
      next();
    };

  return {
    clientInviteInspectRateLimit: pass(inspectLimitCalls),
    clientInviteAcceptRateLimit: pass(acceptLimitCalls),
  };
});

vi.mock(
  "../../src/modules/client-invites/repositories/ClientInviteRepository",
  () => ({ default: inviteRepository }),
);
vi.mock("../../src/modules/Clients/repositories/ClientRepository", () => ({
  default: clientRepository,
}));
vi.mock("../../src/modules/users/repositories/UserRepository", () => ({
  default: userRepository,
}));
vi.mock("../../src/modules/companies/repositories/CompanyRepository", () => ({
  default: companyRepository,
}));
vi.mock("../../src/providers/security/PasswordProvider", () => ({
  default: passwordProvider,
}));
vi.mock(
  "../../src/modules/notifications/services/NotificationDispatcher",
  () => ({ default: notificationDispatcher }),
);

import app from "../../src/app";
import ClientInviteTokenProvider from "../../src/providers/security/ClientInviteTokenProvider";
import { HttpMessages } from "../../src/constants/http-messages";
import { HttpStatus } from "../../src/constants/http-status";
import { Role } from "../../src/constants/roles";

const ref = (id: string) => ({ toString: () => id });

const TOKEN = ClientInviteTokenProvider.generate();

const client = {
  _id: ref(ids.client),
  companyId: ref(ids.companyA),
  name: "Maria Silva",
  email: "maria@email.com",
  isActive: true,
  deletedAt: null,
};

const validInvite = () => ({
  _id: ref("507f1f77bcf86cd799439099"),
  companyId: ref(ids.companyA),
  clientId: ref(ids.client),
  tokenHash: ClientInviteTokenProvider.hash(TOKEN),
  expiresAt: new Date(Date.now() + 60_000),
  usedAt: null,
  revokedAt: null,
});

const inspectUrl = "/api/public/client-invites/inspect";
const acceptUrl = "/api/public/client-invites/accept";

const acceptBody = (overrides: Record<string, unknown> = {}) => ({
  token: TOKEN,
  password: "senhaForte123",
  confirmPassword: "senhaForte123",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  inspectLimitCalls.count = 0;
  acceptLimitCalls.count = 0;

  inviteRepository.findByTokenHash.mockResolvedValue(validInvite());
  inviteRepository.claim.mockResolvedValue({ usedAt: new Date() });
  inviteRepository.release.mockResolvedValue(undefined);
  inviteRepository.create.mockResolvedValue({});
  inviteRepository.revokePendingForClient.mockResolvedValue(undefined);

  clientRepository.findByIdAndCompany.mockResolvedValue(client);
  userRepository.findByClientIdIncludingDeleted.mockResolvedValue(null);
  userRepository.findByEmailIncludingDeleted.mockResolvedValue(null);
  userRepository.create.mockResolvedValue({ _id: ref("user-new") });

  companyRepository.findById.mockResolvedValue({
    _id: ref(ids.companyA),
    name: "Studio Aurora",
  });
  passwordProvider.hash.mockResolvedValue("hashed-password");
  notificationDispatcher.dispatchClientInviteEmail.mockResolvedValue(undefined);
});

describe("POST /api/public/client-invites/inspect", () => {
  it("resolve o convite válido sem autenticação e sem expor internals", async () => {
    const response = await request(app)
      .post(inspectUrl)
      .send({ token: TOKEN });

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body.message).toBe(HttpMessages.CLIENT_INVITE_FOUND);
    expect(response.body.data).toEqual({
      clientName: "Maria Silva",
      companyName: "Studio Aurora",
      email: "maria@email.com",
      expiresAt: expect.any(String),
    });

    const raw = JSON.stringify(response.body);
    expect(raw).not.toContain(TOKEN);
    expect(raw).not.toContain("sha256:");
    expect(raw).not.toContain(ids.companyA);
    expect(raw).not.toContain(ids.client);
    expect(inspectLimitCalls.count).toBe(1);
  });

  it("token malformado e inexistente respondem EXATAMENTE igual", async () => {
    const malformed = await request(app)
      .post(inspectUrl)
      .send({ token: "abc" });

    inviteRepository.findByTokenHash.mockResolvedValue(null);
    const missing = await request(app).post(inspectUrl).send({ token: TOKEN });

    expect(malformed.status).toBe(HttpStatus.NOT_FOUND);
    expect(missing.status).toBe(HttpStatus.NOT_FOUND);
    expect(malformed.body.message).toBe(HttpMessages.CLIENT_INVITE_INVALID);
    expect(missing.body.message).toBe(HttpMessages.CLIENT_INVITE_INVALID);
    expect(malformed.body.message).toBe(missing.body.message);
  });

  it("token expirado → 404 com mensagem própria", async () => {
    inviteRepository.findByTokenHash.mockResolvedValue({
      ...validInvite(),
      expiresAt: new Date(Date.now() - 1000),
    });

    const response = await request(app)
      .post(inspectUrl)
      .send({ token: TOKEN });

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body.message).toBe(HttpMessages.CLIENT_INVITE_EXPIRED);
  });

  it("Cenário B: cliente já com conta → 409", async () => {
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue({
      _id: ref("user-1"),
      clientId: ref(ids.client),
    });

    const response = await request(app)
      .post(inspectUrl)
      .send({ token: TOKEN });

    expect(response.status).toBe(HttpStatus.CONFLICT);
    expect(response.body.message).toBe(HttpMessages.CLIENT_ALREADY_HAS_ACCOUNT);
  });

  it("pedido sem token → 400 de validação", async () => {
    const response = await request(app).post(inspectUrl).send({});

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(inviteRepository.findByTokenHash).not.toHaveBeenCalled();
  });

  it("mass assignment: campos extra no corpo → 400", async () => {
    const response = await request(app)
      .post(inspectUrl)
      .send({ token: TOKEN, companyId: ids.companyA, role: "OWNER" });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(inviteRepository.findByTokenHash).not.toHaveBeenCalled();
  });
});

describe("POST /api/public/client-invites/accept", () => {
  it("Cenário A: cria a conta CLIENT sem sessão, com dados derivados", async () => {
    const response = await request(app).post(acceptUrl).send(acceptBody());

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body.message).toBe(HttpMessages.CLIENT_ACCOUNT_CREATED);
    expect(response.body.data).toEqual({ email: "maria@email.com" });

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "maria@email.com",
        role: Role.CLIENT,
        clientId: client._id,
        companyId: client.companyId,
        mustChangePassword: false,
        emailVerified: true,
      }),
    );
    expect(passwordProvider.hash).toHaveBeenCalledWith("senhaForte123");
    expect(acceptLimitCalls.count).toBe(1);
    expect(JSON.stringify(response.body)).not.toContain(TOKEN);
  });

  it("o token nunca aparece na resposta nem em erro", async () => {
    const ok = await request(app).post(acceptUrl).send(acceptBody());

    inviteRepository.findByTokenHash.mockResolvedValue(null);
    const rejected = await request(app)
      .post(acceptUrl)
      .send(acceptBody());

    expect(JSON.stringify(ok.body)).not.toContain(TOKEN);
    expect(JSON.stringify(rejected.body)).not.toContain(TOKEN);
  });

  it("token já consumido → 404 e nenhuma conta criada", async () => {
    inviteRepository.findByTokenHash.mockResolvedValue({
      ...validInvite(),
      usedAt: new Date(),
    });

    const response = await request(app)
      .post(acceptUrl)
      .send(acceptBody());

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body.message).toBe(HttpMessages.CLIENT_INVITE_INVALID);
    expect(inviteRepository.claim).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("Cenário B: cliente já com conta → 409 e claim não acontece", async () => {
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue({
      _id: ref("user-1"),
      clientId: ref(ids.client),
    });

    const response = await request(app)
      .post(acceptUrl)
      .send(acceptBody());

    expect(response.status).toBe(HttpStatus.CONFLICT);
    expect(inviteRepository.claim).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("senha curta → 400 e o serviço nunca corre", async () => {
    const response = await request(app)
      .post(acceptUrl)
      .send(acceptBody({ password: "123", confirmPassword: "123" }));

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(inviteRepository.findByTokenHash).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("confirmação diferente → 400", async () => {
    const response = await request(app)
      .post(acceptUrl)
      .send(acceptBody({ confirmPassword: "outra-senha" }));

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("mass assignment: companyId/role/clientId no corpo → 400", async () => {
    const response = await request(app)
      .post(acceptUrl)
      .send(
        acceptBody({
          companyId: "507f1f77bcf86cd799439012",
          role: "OWNER",
          clientId: ids.otherClient,
        }),
      );

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(inviteRepository.findByTokenHash).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });
});
