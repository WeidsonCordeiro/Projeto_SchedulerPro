import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { activeCompany, ref } from "../helpers/tenant-ids";

const { ids, authUser, serviceRepository, companyRepository, userRepository } =
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
    serviceRepository: {
      findById: vi.fn(),
      findByCompanyId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    },
    companyRepository: { findById: vi.fn() },
    userRepository: {
      findById: vi.fn(),
      findByIdForAccessControl: vi.fn(),
    },
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
vi.mock("../../../src/modules/services/repositories/ServiceRepository", () => ({
  default: serviceRepository,
}));
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({
  default: companyRepository,
}));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({
  default: userRepository,
}));

import app from "../../../src/app";
import { Role } from "../../../src/constants/roles";

const serviceA = {
  _id: ref(ids.serviceA),
  companyId: ref(ids.companyA),
  name: "Corte",
  duration: 30,
  price: 25,
  isActive: true,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const serviceB = {
  _id: ref(ids.serviceB),
  companyId: ref(ids.companyB),
  name: "Outro serviço",
  duration: 30,
  price: 30,
  isActive: true,
  deletedAt: null,
};

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

  serviceRepository.findById.mockImplementation(async (id: string) => {
    if (id === ids.serviceA) return serviceA;
    if (id === ids.serviceB) return serviceB;
    return null;
  });
  serviceRepository.findByCompanyId.mockResolvedValue([serviceA]);
  serviceRepository.create.mockResolvedValue(serviceA);
  serviceRepository.update.mockResolvedValue(serviceA);
  serviceRepository.softDelete.mockResolvedValue(undefined);
});

describe("Multi-tenant — Services HTTP (Bloco A)", () => {
  it("lista serviços apenas da empresa da sessão", async () => {
    const response = await request(app).get("/api/services");

    expect(response.status).toBe(200);
    expect(serviceRepository.findByCompanyId).toHaveBeenCalledWith(ids.companyA);
  });

  it("nega consulta de serviço de outra empresa (403)", async () => {
    const response = await request(app).get(`/api/services/${ids.serviceB}`);

    expect(response.status).toBe(403);
  });

  it("nega actualização de serviço de outra empresa (403)", async () => {
    const response = await request(app)
      .patch(`/api/services/${ids.serviceB}`)
      .send({ name: "Intruso", companyId: ids.companyB });

    expect(response.status).toBe(403);
    expect(serviceRepository.update).not.toHaveBeenCalled();
  });

  it("nega eliminação de serviço de outra empresa (403)", async () => {
    const response = await request(app).delete(`/api/services/${ids.serviceB}`);

    expect(response.status).toBe(403);
    expect(serviceRepository.softDelete).not.toHaveBeenCalled();
  });
});