import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { activeCompany, ref } from "../helpers/tenant-ids";

const { ids, authUser, userRepository, companyRepository } = vi.hoisted(() => {
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
  userRepository: {
    findById: vi.fn(),
    findByCompanyId: vi.fn(),
    findByEmail: vi.fn(),
    findByIdForAccessControl: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
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
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({
  default: userRepository,
}));
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({
  default: companyRepository,
}));

import app from "../../../src/app";
import { Role } from "../../../src/constants/roles";

const employeeA = {
  _id: ref(ids.employeeA),
  companyId: ref(ids.companyA),
  name: "Ana",
  email: "ana@a.test",
  role: Role.EMPLOYEE,
  isActive: true,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const employeeB = {
  _id: ref(ids.employeeB),
  companyId: ref(ids.companyB),
  name: "Bruno",
  email: "bruno@b.test",
  role: Role.EMPLOYEE,
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

  userRepository.findById.mockImplementation(async (id: string) => {
    if (id === ids.employeeA) return employeeA;
    if (id === ids.employeeB) return employeeB;
    return null;
  });
  userRepository.findByCompanyId.mockResolvedValue([employeeA]);
  userRepository.findByEmail.mockResolvedValue(null);
  userRepository.findByIdForAccessControl.mockResolvedValue({
    mustChangePassword: false,
    isActive: true,
    lockUntil: null,
    emailVerified: true,
  });
  userRepository.create.mockResolvedValue(employeeA);
  userRepository.update.mockResolvedValue(employeeA);
  userRepository.softDelete.mockResolvedValue(undefined);
  userRepository.activate.mockResolvedValue(employeeA);
  userRepository.deactivate.mockResolvedValue(employeeA);
});

describe("Multi-tenant — Users HTTP (Bloco A)", () => {
  it("lista utilizadores apenas da empresa da sessão", async () => {
    const response = await request(app).get("/api/users");

    expect(response.status).toBe(200);
    expect(userRepository.findByCompanyId).toHaveBeenCalledWith(ids.companyA);
  });

  it("não consulta utilizador de outra empresa (403)", async () => {
    const response = await request(app).get(`/api/users/${ids.employeeB}`);

    expect(response.status).toBe(403);
  });

  it("não actualiza utilizador de outra empresa (403)", async () => {
    const response = await request(app)
      .put(`/api/users/${ids.employeeB}`)
      .send({
        name: "Hack",
        email: "hack@b.test",
        companyId: ids.companyB,
      });

    expect(response.status).toBe(403);
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it("não elimina utilizador de outra empresa (403)", async () => {
    const response = await request(app).delete(`/api/users/${ids.employeeB}`);

    expect(response.status).toBe(403);
    expect(userRepository.softDelete).not.toHaveBeenCalled();
  });
});