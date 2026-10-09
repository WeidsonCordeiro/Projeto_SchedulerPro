import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ids = {
  companyA: "507f1f77bcf86cd799439011",
  companyB: "507f1f77bcf86cd799439012",
  client: "507f1f77bcf86cd799439015",
  otherClient: "507f1f77bcf86cd799439016",
};

const {
  authUser,
  inspectLimitCalls,
  acceptLimitCalls,
  inviteRepository,
  clientRepository,
  userRepository,
  companyRepository,
  notificationDispatcher,
} = vi.hoisted(() => ({
  authUser: {
    value: {
      userId: "507f1f77bcf86cd799439016",
      companyId: "507f1f77bcf86cd799439011",
      role: "OWNER",
    } as { userId: string; companyId: string; role: string } | null,
  },
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
  notificationDispatcher: { dispatchClientInviteEmail: vi.fn() },
}));

vi.mock("../../src/middlewares/auth.middleware", () => ({
  default: {
    authenticate: (
      req: express.Request,
      _res: express.Response,
      next: express.NextFunction,
    ) => {
      req.user = authUser.value as never;
      next();
    },
  },
}));

vi.mock("../../src/middlewares/require-password-change.middleware", () => ({
  default: {
    requirePasswordChangeCompleted: (
      _req: express.Request,
      _res: express.Response,
      next: express.NextFunction,
    ) => next(),
  },
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
vi.mock(
  "../../src/modules/notifications/services/NotificationDispatcher",
  () => ({ default: notificationDispatcher }),
);

import app from "../../src/app";
import { Role } from "../../src/constants/roles";
import { HttpMessages } from "../../src/constants/http-messages";
import { HttpStatus } from "../../src/constants/http-status";

const ref = (id: string) => ({ toString: () => id });

const client = {
  _id: ref(ids.client),
  companyId: ref(ids.companyA),
  name: "Maria Silva",
  email: "maria@email.com",
  isActive: true,
  deletedAt: null,
};

const url = `/api/clients/${ids.client}/invite`;

beforeEach(() => {
  vi.clearAllMocks();
  inspectLimitCalls.count = 0;
  acceptLimitCalls.count = 0;

  authUser.value = {
    userId: "507f1f77bcf86cd799439016",
    companyId: ids.companyA,
    role: Role.OWNER,
  };

  clientRepository.findByIdAndCompany.mockResolvedValue(client);
  userRepository.findByClientIdIncludingDeleted.mockResolvedValue(null);
  userRepository.findByEmailIncludingDeleted.mockResolvedValue(null);
  companyRepository.findById.mockResolvedValue({
    _id: ref(ids.companyA),
    name: "Studio Aurora",
  });
  inviteRepository.create.mockResolvedValue({});
  inviteRepository.revokePendingForClient.mockResolvedValue(undefined);
  notificationDispatcher.dispatchClientInviteEmail.mockResolvedValue(undefined);
});

describe("POST /api/clients/:id/invite (emissão autenticada)", () => {
  it("OWNER pode emitir convite e a resposta não transporta o token", async () => {
    const response = await request(app).post(url).send();

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(HttpMessages.CLIENT_INVITE_SENT);
    expect(response.body.data.expiresAt).toBeDefined();

    const dispatchArg = notificationDispatcher.dispatchClientInviteEmail.mock
      .calls[0][0] as { to: string; inviteUrl: string };
    const token = dispatchArg.inviteUrl.split("/").pop()!;

    expect(response.body.data.token).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain(token);
    expect(inviteRepository.create.mock.calls[0][0].tokenHash).toMatch(
      /^sha256:[0-9a-f]{64}$/,
    );
  });

  it("ADMIN pode emitir convite", async () => {
    authUser.value!.role = Role.ADMIN;

    const response = await request(app).post(url).send();

    expect(response.status).toBe(HttpStatus.OK);
    expect(inviteRepository.create).toHaveBeenCalledTimes(1);
  });

  it("MANAGER não pode emitir convite (403) — RBAC por role", async () => {
    authUser.value!.role = Role.MANAGER;

    const response = await request(app).post(url).send();

    expect(response.status).toBe(HttpStatus.FORBIDDEN);
    expect(response.body.message).toBe(HttpMessages.USER_NOT_PERMISSION);
    expect(inviteRepository.create).not.toHaveBeenCalled();
    expect(
      notificationDispatcher.dispatchClientInviteEmail,
    ).not.toHaveBeenCalled();
  });

  it("EMPLOYEE não pode emitir convite (403)", async () => {
    authUser.value!.role = Role.EMPLOYEE;

    const response = await request(app).post(url).send();

    expect(response.status).toBe(HttpStatus.FORBIDDEN);
    expect(inviteRepository.create).not.toHaveBeenCalled();
  });

  it("CLIENT não pode emitir convite (403)", async () => {
    authUser.value!.role = Role.CLIENT;

    const response = await request(app).post(url).send();

    expect(response.status).toBe(HttpStatus.FORBIDDEN);
    expect(inviteRepository.create).not.toHaveBeenCalled();
  });

  it("sem sessão → 401", async () => {
    authUser.value = null;

    const response = await request(app).post(url).send();

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(inviteRepository.create).not.toHaveBeenCalled();
  });

  it("id inválido → 400 antes do serviço", async () => {
    const response = await request(app)
      .post("/api/clients/nao-e-objectid/invite")
      .send();

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(clientRepository.findByIdAndCompany).not.toHaveBeenCalled();
  });

  it("cross-tenant: cliente de outra empresa → 404 e nenhum convite", async () => {
    clientRepository.findByIdAndCompany.mockResolvedValue(null);

    const response = await request(app).post(url).send();

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body.message).toBe(HttpMessages.CLIENT_NOT_FOUND);
    expect(inviteRepository.create).not.toHaveBeenCalled();
    expect(
      notificationDispatcher.dispatchClientInviteEmail,
    ).not.toHaveBeenCalled();
  });

  it("Cenário B: cliente já com conta → 409 na rota", async () => {
    userRepository.findByClientIdIncludingDeleted.mockResolvedValue({
      _id: ref("user-1"),
      clientId: ref(ids.client),
    });

    const response = await request(app).post(url).send();

    expect(response.status).toBe(HttpStatus.CONFLICT);
    expect(response.body.message).toBe(HttpMessages.CLIENT_ALREADY_HAS_ACCOUNT);
    expect(inviteRepository.create).not.toHaveBeenCalled();
  });
});
