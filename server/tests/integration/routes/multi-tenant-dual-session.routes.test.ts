/**
 * Bloco C — sessões alternadas (empresa A vs B) sem contaminação de contexto.
 * AuthMiddleware real mockado: injecta req.user conforme authUser (simula BD).
 */
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
    },
    userRepository: {
      findByClientIdsAndCompanyIncludingDeleted: vi.fn(),
      findByClientIdIncludingDeleted: vi.fn(),
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

const clientDoc = (companyId: string, clientId: string) => ({
  _id: ref(clientId),
  companyId: ref(companyId),
  name: "Cliente",
  email: "c@test",
  phone: "910000001",
  isActive: true,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

beforeEach(() => {
  vi.clearAllMocks();

  companyRepository.findById.mockImplementation(async (id: string) =>
    activeCompany(id.toString()),
  );
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

  clientRepository.findByCompanyId.mockImplementation(
    async (companyId: string) => {
      if (companyId === ids.companyA) {
        return [clientDoc(ids.companyA, ids.clientA)];
      }
      return [clientDoc(ids.companyB, ids.clientB)];
    },
  );
  clientRepository.findByIdAndCompany.mockImplementation(
    async (id: string, companyId: string) => {
      if (id === ids.clientA && companyId === ids.companyA) {
        return clientDoc(ids.companyA, ids.clientA);
      }
      if (id === ids.clientB && companyId === ids.companyB) {
        return clientDoc(ids.companyB, ids.clientB);
      }
      return null;
    },
  );
});

describe("Bloco C — dual session tenant isolation", () => {
  it("empresa A consulta o seu cliente; empresa B não vê o cliente de A", async () => {
    authUser.value = {
      userId: ids.userA,
      companyId: ids.companyA,
      role: Role.OWNER,
    };
    const resA = await request(app).get(`/api/clients/${ids.clientA}`);
    expect(resA.status).toBe(200);

    authUser.value = {
      userId: ids.userB,
      companyId: ids.companyB,
      role: Role.OWNER,
    };
    const resBOnA = await request(app).get(`/api/clients/${ids.clientA}`);
    expect(resBOnA.status).toBe(404);

    const resB = await request(app).get(`/api/clients/${ids.clientB}`);
    expect(resB.status).toBe(200);
  });

  it("alternância de listagem não contamina companyId", async () => {
    authUser.value = {
      userId: ids.userA,
      companyId: ids.companyA,
      role: Role.OWNER,
    };
    await request(app).get("/api/clients");
    expect(clientRepository.findByCompanyId).toHaveBeenLastCalledWith(
      ids.companyA,
    );

    authUser.value = {
      userId: ids.userB,
      companyId: ids.companyB,
      role: Role.OWNER,
    };
    await request(app).get("/api/clients");
    expect(clientRepository.findByCompanyId).toHaveBeenLastCalledWith(
      ids.companyB,
    );
  });
});