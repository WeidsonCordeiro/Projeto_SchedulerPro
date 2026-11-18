/**
 * Bloco C — RBAC MANAGER / EMPLOYEE fora de appointments.
 */
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { activeCompany, ref } from "../helpers/tenant-ids";

const {
  ids,
  authUser,
  clientRepository,
  userRepository,
  companyRepository,
  serviceRepository,
} = vi.hoisted(() => {
  const { TENANT_IDS: tenantIds } =
    require("../helpers/tenant-ids.cjs") as typeof import("../helpers/tenant-ids");
  return {
  ids: tenantIds,
  authUser: {
    value: {
      userId: tenantIds.userA,
      companyId: tenantIds.companyA,
      role: "MANAGER",
    },
  },
  clientRepository: {
    findByIdAndCompany: vi.fn(),
    findByCompanyId: vi.fn(),
    findByEmailAndCompany: vi.fn(),
    create: vi.fn(),
  },
  userRepository: {
    findById: vi.fn(),
    findByCompanyId: vi.fn(),
    findByEmail: vi.fn(),
    findByIdForAccessControl: vi.fn(),
    findByEmailIncludingDeleted: vi.fn(),
    findByClientIdsAndCompanyIncludingDeleted: vi.fn(),
    create: vi.fn(),
  },
  companyRepository: { findById: vi.fn() },
  serviceRepository: {
    findByCompanyId: vi.fn(),
    create: vi.fn(),
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
vi.mock("../../../src/modules/Clients/repositories/ClientRepository", () => ({
  default: clientRepository,
}));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({
  default: userRepository,
}));
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({
  default: companyRepository,
}));
vi.mock("../../../src/modules/services/repositories/ServiceRepository", () => ({
  default: serviceRepository,
}));

import app from "../../../src/app";
import { Role } from "../../../src/constants/roles";

beforeEach(() => {
  vi.clearAllMocks();
  authUser.value = {
    userId: ids.userA,
    companyId: ids.companyA,
    role: Role.MANAGER,
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

  clientRepository.findByCompanyId.mockResolvedValue([]);
  clientRepository.findByEmailAndCompany.mockResolvedValue(null);
  clientRepository.create.mockImplementation(async (data: unknown) => ({
    _id: ref(ids.clientA),
    companyId: ref(ids.companyA),
    ...(data as object),
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  userRepository.findByCompanyId.mockResolvedValue([]);
  userRepository.findByEmail.mockResolvedValue(null);
  userRepository.findByEmailIncludingDeleted.mockResolvedValue(null);
  userRepository.findByClientIdsAndCompanyIncludingDeleted.mockResolvedValue(
    [],
  );
  serviceRepository.findByCompanyId.mockResolvedValue([]);
  serviceRepository.create.mockResolvedValue({});
});

describe("Bloco C — RBAC MANAGER / EMPLOYEE (non-appointments)", () => {
  it("MANAGER pode criar cliente", async () => {
    const response = await request(app).post("/api/clients").send({
      name: "Cliente Manager",
      email: `mgr-${Date.now()}@test.local`,
      phone: "910000011",
    });

    expect(response.status).toBe(201);
    expect(clientRepository.create).toHaveBeenCalled();
  });

  it("MANAGER não cria utilizador (sem USER_CREATE)", async () => {
    const response = await request(app).post("/api/users").send({
      name: "Novo",
      email: `u-${Date.now()}@test.local`,
      password: "password123",
      confirmPassword: "password123",
      role: "EMPLOYEE",
    });

    expect(response.status).toBe(403);
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("MANAGER não cria serviço (sem SERVICE_CREATE)", async () => {
    const response = await request(app).post("/api/services").send({
      name: "Serviço",
      duration: 30,
      price: 20,
    });

    expect(response.status).toBe(403);
    expect(serviceRepository.create).not.toHaveBeenCalled();
  });

  it("EMPLOYEE não cria cliente", async () => {
    authUser.value = {
      userId: ids.userA,
      companyId: ids.companyA,
      role: Role.EMPLOYEE,
    };

    const response = await request(app).post("/api/clients").send({
      name: "Cliente Employee",
      email: `emp-${Date.now()}@test.local`,
      phone: "910000022",
    });

    expect(response.status).toBe(403);
    expect(clientRepository.create).not.toHaveBeenCalled();
  });

  it("EMPLOYEE pode listar clientes (CLIENT_READ)", async () => {
    authUser.value = {
      userId: ids.userA,
      companyId: ids.companyA,
      role: Role.EMPLOYEE,
    };

    const response = await request(app).get("/api/clients");

    expect(response.status).toBe(200);
    expect(clientRepository.findByCompanyId).toHaveBeenCalledWith(ids.companyA);
  });

  it("elevação de privilégio via role no payload é recusada pelo validator", async () => {
    authUser.value = {
      userId: ids.userA,
      companyId: ids.companyA,
      role: Role.OWNER,
    };

    const response = await request(app).post("/api/users").send({
      name: "Admin fake",
      email: `fake-${Date.now()}@test.local`,
      password: "password123",
      confirmPassword: "password123",
      role: "INVALID",
    });

    expect(response.status).toBe(400);
    expect(userRepository.create).not.toHaveBeenCalled();
  });
});