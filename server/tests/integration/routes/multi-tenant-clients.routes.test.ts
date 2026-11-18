import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { activeCompany, ref } from "../helpers/tenant-ids";

const { ids, authUser, clientRepository, userRepository, companyRepository } =
  vi.hoisted(() => {
    const { TENANT_IDS: tenantIds } =
      require("../helpers/tenant-ids.cjs") as typeof import("../helpers/tenant-ids");
    return {
    ids: tenantIds,
    authUser: {
      value: {
        userId: tenantIds.userA,
        companyId: tenantIds.companyA,
        role: "OWNER",
      },
    },
    clientRepository: {
      findByIdAndCompany: vi.fn(),
      findByCompanyId: vi.fn(),
      findByEmailAndCompany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
    },
    userRepository: {
      findByClientIdsAndCompanyIncludingDeleted: vi.fn(),
      findByClientIdIncludingDeleted: vi.fn(),
      findByEmailIncludingDeleted: vi.fn(),
      findByClientId: vi.fn(),
      findById: vi.fn(),
      findByIdForAccessControl: vi.fn(),
    },
    companyRepository: { findById: vi.fn() },
  };
  });

vi.mock("../../../src/middlewares/auth.middleware", () => ({
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
vi.mock("../../../src/modules/Clients/repositories/ClientRepository", () => ({
  default: clientRepository,
}));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({
  default: userRepository,
}));
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({
  default: companyRepository,
}));

import app from "../../../src/app";
import { Role } from "../../../src/constants/roles";

const clientA = {
  _id: ref(ids.clientA),
  companyId: ref(ids.companyA),
  name: "Maria",
  email: "maria@a.test",
  phone: "910000001",
  isActive: true,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const portalEmpty = { exists: false, isActive: false };

beforeEach(() => {
  vi.clearAllMocks();
  authUser.value = {
    userId: ids.userA,
    companyId: ids.companyA,
    role: Role.OWNER,
  };

  companyRepository.findById.mockResolvedValue(activeCompany(ids.companyA));

  userRepository.findById.mockResolvedValue({
    mustChangePassword: false,
    isActive: true,
    lockUntil: null,
    emailVerified: true,
  });
  userRepository.findByIdForAccessControl.mockResolvedValue({
    mustChangePassword: false,
    isActive: true,
    lockUntil: null,
    emailVerified: true,
  });
  userRepository.findByClientIdsAndCompanyIncludingDeleted.mockResolvedValue([]);
  userRepository.findByClientIdIncludingDeleted.mockResolvedValue(null);
  userRepository.findByClientId.mockResolvedValue(null);
  userRepository.findByEmailIncludingDeleted.mockResolvedValue(null);

  clientRepository.findByIdAndCompany.mockImplementation(
    async (id: string, companyId: string) => {
      if (id === ids.clientB && companyId === ids.companyA) {
        return null;
      }
      if (id === ids.clientA && companyId === ids.companyA) {
        return clientA;
      }
      return null;
    },
  );
  clientRepository.findByCompanyId.mockResolvedValue([clientA]);
  clientRepository.findByEmailAndCompany.mockResolvedValue(null);
  clientRepository.create.mockImplementation(async (data: unknown) => ({
    ...clientA,
    ...(data as object),
    _id: ref(ids.clientA),
  }));
  clientRepository.update.mockImplementation(
    async (id: string, companyId: string) => {
      if (id === ids.clientB || companyId !== ids.companyA) {
        return null;
      }
      return clientA;
    },
  );
  clientRepository.softDelete.mockImplementation(
    async (id: string, companyId: string) => {
      if (id === ids.clientB || companyId !== ids.companyA) {
        return null;
      }
    },
  );
  clientRepository.activate.mockResolvedValue(clientA);
  clientRepository.deactivate.mockResolvedValue(clientA);
});

describe("Multi-tenant — Clients HTTP (Bloco A)", () => {
  it("lista apenas clientes da empresa da sessão", async () => {
    const response = await request(app).get("/api/clients");

    expect(response.status).toBe(200);
    expect(clientRepository.findByCompanyId).toHaveBeenCalledWith(ids.companyA);
    expect(clientRepository.findByCompanyId).not.toHaveBeenCalledWith(
      ids.companyB,
    );
  });

  it("ignora companyId injetado na query na listagem", async () => {
    await request(app).get(`/api/clients?companyId=${ids.companyB}`);

    expect(clientRepository.findByCompanyId).toHaveBeenCalledWith(ids.companyA);
  });

  it("não consulta cliente de outra empresa por ID (404)", async () => {
    const response = await request(app).get(`/api/clients/${ids.clientB}`);

    expect(response.status).toBe(404);
    expect(clientRepository.findByIdAndCompany).toHaveBeenCalledWith(
      ids.clientB,
      ids.companyA,
    );
  });

  it("não actualiza cliente de outra empresa (404)", async () => {
    const response = await request(app)
      .patch(`/api/clients/${ids.clientB}`)
      .send({ name: "Intruder", companyId: ids.companyB });

    expect(response.status).toBe(404);
    expect(clientRepository.update).toHaveBeenCalledWith(
      ids.clientB,
      ids.companyA,
      expect.any(Object),
    );
  });

  it("não elimina cliente de outra empresa (404)", async () => {
    const response = await request(app).delete(`/api/clients/${ids.clientB}`);

    expect(response.status).toBe(404);
    expect(clientRepository.softDelete).not.toHaveBeenCalled();
  });

  it("criação ignora companyId no payload e usa a sessão", async () => {
    const response = await request(app).post("/api/clients").send({
      name: "Novo Cliente",
      email: "novo@a.test",
      phone: "910000099",
      companyId: ids.companyB,
    });

    expect(response.status).toBe(201);
    expect(clientRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: expect.objectContaining({
          toString: expect.any(Function),
        }),
      }),
    );
    const createArg = clientRepository.create.mock.calls[0]?.[0] as {
      companyId: { toString: () => string };
    };
    expect(createArg.companyId.toString()).toBe(ids.companyA);
  });
});