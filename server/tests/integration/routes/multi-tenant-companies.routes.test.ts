/**
 * Task B1 — HTTP multi-tenant: rotas /api/companies.
 * App Express real; CompanyService real; Auth mockado; CompanyRepository mockado.
 */
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ref } from "../helpers/tenant-ids";

const { ids, authUser, companyRepository, appointmentRepository, userRepository, lifecycleTx } = vi.hoisted(() => {
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
    companyRepository: {
      findById: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      touchBookingSerialization: vi.fn(),
    },
    appointmentRepository: {
      hasOpenAppointmentsForCompany: vi.fn(),
    },
    userRepository: {
      findByIdForAccessControl: vi.fn(),
    },
    lifecycleTx: {
      withCompanyLifecycleTransaction: vi.fn(),
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

vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({
  default: companyRepository,
}));

vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({
  default: userRepository,
}));

vi.mock("../../../src/modules/appointments/repositories/AppointmentRepository", () => ({
  default: appointmentRepository,
}));

vi.mock(
  "../../../src/modules/companies/services/company-lifecycle-transaction",
  () => ({
    withCompanyLifecycleTransaction: lifecycleTx.withCompanyLifecycleTransaction,
  }),
);

import app from "../../../src/app";
import { Role } from "../../../src/constants/roles";
import { HttpStatus } from "../../../src/constants/http-status";
import { HttpMessages } from "../../../src/constants/http-messages";

function companyDoc(companyId: string, name: string) {
  return {
    _id: ref(companyId),
    id: companyId,
    name,
    timezone: "Europe/Lisbon",
    isActive: true,
    logo: null,
    deletedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

const companyA = companyDoc(ids.companyA, "empresa alpha");
const companyB = companyDoc(ids.companyB, "empresa beta");

function sessionAs(
  companyId: string,
  userId: string,
  role: Role = Role.OWNER,
) {
  authUser.value = { userId, companyId, role };
}

function wireDefaultCompanyMocks() {
  companyRepository.findById.mockImplementation(async (id: string) => {
    const key = id.toString();
    if (key === ids.companyA) return companyA;
    if (key === ids.companyB) return companyB;
    return null;
  });

  companyRepository.findAll.mockImplementation(async (companyId: string) => {
    const key = companyId.toString();
    if (key === ids.companyA) return [companyA];
    if (key === ids.companyB) return [companyB];
    return [];
  });

  companyRepository.update.mockImplementation(
    async (id: string, data: { name?: string; timezone?: string }) => {
      const base = id.toString() === ids.companyB ? companyB : companyA;
      return {
        ...base,
        ...data,
        updatedAt: new Date(),
      };
    },
  );

  companyRepository.touchBookingSerialization.mockImplementation(async (id: string) => {
    const key = id.toString();
    if (key === ids.companyA) return companyA;
    if (key === ids.companyB) return companyB;
    return null;
  });

  companyRepository.softDelete.mockImplementation(async (id: string) => {
    const base = id.toString() === ids.companyB ? companyB : companyA;
    return { ...base, isActive: false, deletedAt: new Date() };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionAs(ids.companyA, ids.userA, Role.OWNER);
  wireDefaultCompanyMocks();
  lifecycleTx.withCompanyLifecycleTransaction.mockImplementation(
    async (operation: (session: object) => Promise<unknown>) => operation({}),
  );
  appointmentRepository.hasOpenAppointmentsForCompany.mockResolvedValue(false);

  userRepository.findByIdForAccessControl.mockResolvedValue({
    mustChangePassword: false,
    isActive: true,
    lockUntil: null,
    emailVerified: true,
  });
});

describe("Multi-tenant — Companies HTTP (Task B1)", () => {
  describe("GET /api/companies", () => {
    it("empresa A autenticada recebe apenas dados da empresa A", async () => {
      const response = await request(app).get("/api/companies");

      expect(response.status).toBe(HttpStatus.OK);
      expect(companyRepository.findAll).toHaveBeenCalledWith(ids.companyA);
      const list = response.body.data as Array<{ id: string; name: string }>;
      expect(list).toHaveLength(1);
      expect(list[0]?.id).toBe(ids.companyA);
      expect(list[0]?.name).toBe(companyA.name);
      expect(list.every((row) => row.id !== ids.companyB)).toBe(true);
    });

    it("empresa B autenticada não inclui a empresa A na listagem", async () => {
      sessionAs(ids.companyB, ids.userB, Role.OWNER);

      const response = await request(app).get("/api/companies");

      expect(response.status).toBe(HttpStatus.OK);
      expect(companyRepository.findAll).toHaveBeenCalledWith(ids.companyB);
      const list = response.body.data as Array<{ id: string }>;
      expect(list).toHaveLength(1);
      expect(list[0]?.id).toBe(ids.companyB);
    });

    it("respeita listagem vazia quando o repositório não devolve registos", async () => {
      companyRepository.findAll.mockResolvedValueOnce([]);

      const response = await request(app).get("/api/companies");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.data).toEqual([]);
    });
  });

  describe("GET /api/companies/:id", () => {
    it("consulta a própria empresa com sucesso", async () => {
      const response = await request(app).get(`/api/companies/${ids.companyA}`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(companyRepository.findById).toHaveBeenCalledWith(ids.companyA);
      expect(response.body.data?.id).toBe(ids.companyA);
    });

    it("não consulta empresa de outro tenant (404)", async () => {
      const response = await request(app).get(`/api/companies/${ids.companyB}`);

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(companyRepository.findById).not.toHaveBeenCalled();
    });

    it("rejeita id inválido antes do controller (400)", async () => {
      const response = await request(app).get("/api/companies/not-an-id");

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(companyRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /api/companies/:id", () => {
    it("OWNER actualiza a própria empresa", async () => {
      const response = await request(app)
        .patch(`/api/companies/${ids.companyA}`)
        .send({ name: "empresa alpha revista" });

      expect(response.status).toBe(HttpStatus.OK);
      expect(companyRepository.update).toHaveBeenCalledWith(ids.companyA, {
        name: "empresa alpha revista",
      });
    });

    it("não actualiza empresa de outro tenant (404)", async () => {
      const response = await request(app)
        .patch(`/api/companies/${ids.companyB}`)
        .send({ name: "intruso" });

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(companyRepository.update).not.toHaveBeenCalled();
    });

    it("ignora companyId no body e mantém o tenant da sessão", async () => {
      const response = await request(app)
        .patch(`/api/companies/${ids.companyA}`)
        .send({ name: "empresa segura", companyId: ids.companyB });

      expect(response.status).toBe(HttpStatus.OK);
      expect(companyRepository.update).toHaveBeenCalledWith(ids.companyA, {
        name: "empresa segura",
      });
    });

    it("não persiste isActive via DTO de actualização", async () => {
      const response = await request(app)
        .patch(`/api/companies/${ids.companyA}`)
        .send({ name: "empresa segura", isActive: false, deletedAt: new Date() });

      expect(response.status).toBe(HttpStatus.OK);
      expect(companyRepository.update).toHaveBeenCalledWith(ids.companyA, {
        name: "empresa segura",
      });
    });

    it("rejeita timezone inválido (400)", async () => {
      const response = await request(app)
        .patch(`/api/companies/${ids.companyA}`)
        .send({ timezone: "Invalid/Zone" });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(companyRepository.update).not.toHaveBeenCalled();
    });

    it("rejeita nome demasiado curto (400)", async () => {
      const response = await request(app)
        .patch(`/api/companies/${ids.companyA}`)
        .send({ name: "ab" });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(companyRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /api/companies/:id", () => {
    it("OWNER solicita soft delete da própria empresa", async () => {
      const response = await request(app).delete(`/api/companies/${ids.companyA}`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(appointmentRepository.hasOpenAppointmentsForCompany).toHaveBeenCalled();
      expect(companyRepository.softDelete).toHaveBeenCalledWith(
        ids.companyA,
        expect.anything(),
      );
      expect(companyRepository.softDelete).not.toHaveBeenCalledWith(ids.companyB);
    });

    it("devolve 409 quando existem agendamentos abertos", async () => {
      appointmentRepository.hasOpenAppointmentsForCompany.mockResolvedValue(true);

      const response = await request(app).delete(`/api/companies/${ids.companyA}`);

      expect(response.status).toBe(HttpStatus.CONFLICT);
      expect(response.body.message).toBe(
        HttpMessages.COMPANY_DELETE_BLOCKED_OPEN_APPOINTMENTS,
      );
      expect(response.body.code).toBe("COMPANY_DELETE_BLOCKED_OPEN_APPOINTMENTS");
      expect(companyRepository.softDelete).not.toHaveBeenCalled();
    });

    it("permite DELETE com empresa inactiva (sem middleware operacional)", async () => {
      companyRepository.findById.mockImplementation(async (id: string) => {
        const key = id.toString();
        if (key === ids.companyA) return { ...companyA, isActive: false };
        if (key === ids.companyB) return companyB;
        return null;
      });

      const response = await request(app).delete(`/api/companies/${ids.companyA}`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(companyRepository.softDelete).toHaveBeenCalled();
    });

    it("não elimina empresa de outro tenant (404)", async () => {
      const response = await request(app).delete(`/api/companies/${ids.companyB}`);

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(companyRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe("RBAC — Company permissions", () => {
    it.each([Role.MANAGER, Role.EMPLOYEE])(
      "nega GET /api/companies para %s",
      async (role) => {
        sessionAs(ids.companyA, ids.userA, role);

        const response = await request(app).get("/api/companies");

        expect(response.status).toBe(HttpStatus.FORBIDDEN);
        expect(companyRepository.findAll).not.toHaveBeenCalled();
      },
    );

    it.each([Role.OWNER, Role.ADMIN])(
      "permite GET /api/companies para %s",
      async (role) => {
        sessionAs(ids.companyA, ids.userA, role);

        const response = await request(app).get("/api/companies");

        expect(response.status).toBe(HttpStatus.OK);
        expect(companyRepository.findAll).toHaveBeenCalled();
      },
    );

    it.each([Role.MANAGER, Role.EMPLOYEE])(
      "nega PATCH /api/companies/:id para %s",
      async (role) => {
        sessionAs(ids.companyA, ids.userA, role);

        const response = await request(app)
          .patch(`/api/companies/${ids.companyA}`)
          .send({ name: "tentativa" });

        expect(response.status).toBe(HttpStatus.FORBIDDEN);
        expect(companyRepository.update).not.toHaveBeenCalled();
      },
    );

    it("permite PATCH para ADMIN", async () => {
      sessionAs(ids.companyA, ids.userA, Role.ADMIN);

      const response = await request(app)
        .patch(`/api/companies/${ids.companyA}`)
        .send({ name: "admin patch" });

      expect(response.status).toBe(HttpStatus.OK);
      expect(companyRepository.update).toHaveBeenCalled();
    });

    it.each([Role.ADMIN, Role.MANAGER, Role.EMPLOYEE])(
      "nega DELETE /api/companies/:id para %s",
      async (role) => {
        sessionAs(ids.companyA, ids.userA, role);

        const response = await request(app).delete(`/api/companies/${ids.companyA}`);

        expect(response.status).toBe(HttpStatus.FORBIDDEN);
        expect(companyRepository.softDelete).not.toHaveBeenCalled();
      },
    );
  });

  describe("Sessões A/B alternadas", () => {
    it("cada OWNER só consulta a própria empresa por ID", async () => {
      sessionAs(ids.companyA, ids.userA, Role.OWNER);
      const asA = await request(app).get(`/api/companies/${ids.companyA}`);
      expect(asA.status).toBe(HttpStatus.OK);
      const crossA = await request(app).get(`/api/companies/${ids.companyB}`);
      expect(crossA.status).toBe(HttpStatus.NOT_FOUND);

      sessionAs(ids.companyB, ids.userB, Role.OWNER);
      const asB = await request(app).get(`/api/companies/${ids.companyB}`);
      expect(asB.status).toBe(HttpStatus.OK);
      const crossB = await request(app).get(`/api/companies/${ids.companyA}`);
      expect(crossB.status).toBe(HttpStatus.NOT_FOUND);
    });

    it("alternância de listagem não contamina companyId", async () => {
      sessionAs(ids.companyA, ids.userA, Role.OWNER);
      await request(app).get("/api/companies");
      expect(companyRepository.findAll).toHaveBeenLastCalledWith(ids.companyA);

      sessionAs(ids.companyB, ids.userB, Role.OWNER);
      await request(app).get("/api/companies");
      expect(companyRepository.findAll).toHaveBeenLastCalledWith(ids.companyB);
    });
  });
});