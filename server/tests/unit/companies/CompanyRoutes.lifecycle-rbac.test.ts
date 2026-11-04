import { beforeEach, describe, expect, it, vi } from "vitest";
import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";

const { companyServiceMock, authMock, passwordChangeMock } = vi.hoisted(() => ({
  companyServiceMock: {
    activate: vi.fn(),
    deactivate: vi.fn(),
  },
  authMock: { authenticate: vi.fn() },
  passwordChangeMock: { requirePasswordChangeCompleted: vi.fn() },
}));

vi.mock("../../../src/modules/companies/services/CompanyService", () => ({
  default: companyServiceMock,
}));

vi.mock("../../../src/middlewares/auth.middleware", () => ({
  default: authMock,
}));

vi.mock("../../../src/middlewares/require-password-change.middleware", () => ({
  default: passwordChangeMock,
}));

vi.mock("../../../src/middlewares/require-operational-company.middleware", () => ({
  default: {
    requireOperationalCompany: (
      _req: Request,
      _res: Response,
      next: NextFunction,
    ) => next(),
  },
}));

import companyRoutes from "../../../src/modules/companies/routes/CompanyRoutes";
import { Role } from "../../../src/constants/roles";
import { HttpStatus } from "../../../src/constants/http-status";
import { AppError } from "../../../src/errors/AppError";

const companyId = "507f1f77bcf86cd799439011";
const userId = "507f1f77bcf86cd799439012";

function authenticateAs(role: Role) {
  authMock.authenticate.mockImplementation(
    (req: Request, _res: Response, next: NextFunction) => {
      req.user = { userId, companyId, role };
      next();
    },
  );
}

function buildApp() {
  const app = express();
  app.use("/companies", companyRoutes);
  app.use((error: Error, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Erro interno" });
  });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  passwordChangeMock.requirePasswordChangeCompleted.mockImplementation(
    (_req: Request, _res: Response, next: NextFunction) => next(),
  );
  companyServiceMock.activate.mockResolvedValue({ id: companyId, isActive: true });
  companyServiceMock.deactivate.mockResolvedValue({ id: companyId, isActive: false });
});

describe("Companies lifecycle — RBAC nas rotas", () => {
  it.each([Role.OWNER])("permite %s desactivar a empresa", async (role) => {
    authenticateAs(role);
    const response = await request(buildApp()).patch(
      `/companies/${companyId}/deactivate`,
    );
    expect(response.status).toBe(HttpStatus.OK);
    expect(companyServiceMock.deactivate).toHaveBeenCalled();
  });

  it.each([Role.ADMIN, Role.MANAGER])(
    "nega %s em PATCH deactivate (sem COMPANY_DEACTIVATE)",
    async (role) => {
      authenticateAs(role);
      const response = await request(buildApp()).patch(
        `/companies/${companyId}/deactivate`,
      );
      expect(response.status).toBe(HttpStatus.FORBIDDEN);
      expect(companyServiceMock.deactivate).not.toHaveBeenCalled();
    },
  );

  it.each([Role.OWNER])("permite %s reactivar a empresa", async (role) => {
    authenticateAs(role);
    const response = await request(buildApp()).patch(
      `/companies/${companyId}/activate`,
    );
    expect(response.status).toBe(HttpStatus.OK);
    expect(companyServiceMock.activate).toHaveBeenCalled();
  });

  it.each([Role.ADMIN])(
    "nega %s em PATCH activate (sem COMPANY_ACTIVATE)",
    async (role) => {
      authenticateAs(role);
      const response = await request(buildApp()).patch(
        `/companies/${companyId}/activate`,
      );
      expect(response.status).toBe(HttpStatus.FORBIDDEN);
      expect(companyServiceMock.activate).not.toHaveBeenCalled();
    },
  );
});
