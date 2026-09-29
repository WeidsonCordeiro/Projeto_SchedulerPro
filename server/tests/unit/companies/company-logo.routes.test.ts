import { beforeEach, describe, expect, it, vi } from "vitest";
import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";

/**
 * ==========================================================
 * Logo da empresa — cadeia de middlewares da rota.
 *
 * Usa o router real (`CompanyRoutes`) com a matriz de RBAC
 * real (`hasPermission`). Só a autenticação, a verificação de
 * "password alterada" e o serviço são substituídos, para
 * poder simular cada role sem emitir JWT e sem tocar no
 * MongoDB/Cloudinary.
 *
 * A logo usa a permission existente `COMPANY_UPDATE`, que na
 * matriz RBAC pertence apenas a OWNER e ADMIN (MANAGER não
 * tem) — diferente da foto de cliente, onde MANAGER já está
 * autorizado.
 * ==========================================================
 */

const { companyServiceMock, authMock, passwordChangeMock } = vi.hoisted(() => ({
  companyServiceMock: { updateLogo: vi.fn(), removeLogo: vi.fn() },
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

import companyRoutes from "../../../src/modules/companies/routes/CompanyRoutes";
import { Role } from "../../../src/constants/roles";
import { HttpStatus } from "../../../src/constants/http-status";
import { AppError } from "../../../src/errors/AppError";

const companyId = "507f1f77bcf86cd799439011";
const userId = "507f1f77bcf86cd799439012";
const targetId = "507f1f77bcf86cd799439011";

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const newLogo = {
  url: "https://res.cloudinary.com/demo/image/upload/v1/schedulerpro/company/novo",
  publicId: "schedulerpro/company/novo",
};

/** Injeta o utilizador autenticado, como faria o AuthMiddleware. */
function authenticateAs(role: Role) {
  authMock.authenticate.mockImplementation(
    (req: Request, _res: Response, next: NextFunction) => {
      req.user = { userId, companyId, role };
      next();
    },
  );
}

/** Nenhum utilizador é autenticado (sem token): o permission responde 401. */
function authenticateAsAnonymous() {
  authMock.authenticate.mockImplementation(
    (_req: Request, _res: Response, next: NextFunction) => next(),
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
  companyServiceMock.updateLogo.mockResolvedValue({
    id: targetId,
    logo: newLogo,
  });
  companyServiceMock.removeLogo.mockResolvedValue({ id: targetId, logo: null });
});

describe("POST /companies/:id/logo - autenticação e RBAC", () => {
  it("sem autenticação responde 401 e não chama o serviço", async () => {
    authenticateAsAnonymous();

    const response = await request(buildApp())
      .post(`/companies/${targetId}/logo`)
      .attach("logo", PNG_BYTES, { filename: "logo.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(companyServiceMock.updateLogo).not.toHaveBeenCalled();
  });

  it.each([Role.OWNER, Role.ADMIN])(
    "permite o perfil %s (COMPANY_UPDATE)",
    async (role) => {
      authenticateAs(role);

      const response = await request(buildApp())
        .post(`/companies/${targetId}/logo`)
        .attach("logo", PNG_BYTES, { filename: "logo.png", contentType: "image/png" });

      expect(response.status).toBe(HttpStatus.OK);
      expect(companyServiceMock.updateLogo).toHaveBeenCalled();
    },
  );

  it.each([Role.MANAGER, Role.EMPLOYEE, Role.CLIENT])(
    "nega o perfil %s (sem COMPANY_UPDATE)",
    async (role) => {
      authenticateAs(role);

      const response = await request(buildApp())
        .post(`/companies/${targetId}/logo`)
        .attach("logo", PNG_BYTES, { filename: "logo.png", contentType: "image/png" });

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
      expect(companyServiceMock.updateLogo).not.toHaveBeenCalled();
    },
  );

  it("recusa um :id que não é ObjectId antes de qualquer processamento", async () => {
    authenticateAs(Role.ADMIN);

    const response = await request(buildApp())
      .post("/companies/nao-e-objectid/logo")
      .attach("logo", PNG_BYTES, { filename: "logo.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(companyServiceMock.updateLogo).not.toHaveBeenCalled();
  });
});

describe("POST /companies/:id/logo - receção do ficheiro", () => {
  it("rejeita um ficheiro acima de 5 MB com 400 e sem chamar o serviço", async () => {
    authenticateAs(Role.ADMIN);

    const oversized = Buffer.concat([
      PNG_BYTES,
      Buffer.alloc(5 * 1024 * 1024, 0),
    ]);

    const response = await request(buildApp())
      .post(`/companies/${targetId}/logo`)
      .attach("logo", oversized, { filename: "grande.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(companyServiceMock.updateLogo).not.toHaveBeenCalled();
  });

  it("responde 400 quando nenhum ficheiro é enviado", async () => {
    authenticateAs(Role.ADMIN);

    const response = await request(buildApp()).post(`/companies/${targetId}/logo`);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(companyServiceMock.updateLogo).not.toHaveBeenCalled();
  });

  it("rejeita um campo multipart inesperado", async () => {
    authenticateAs(Role.ADMIN);

    const response = await request(buildApp())
      .post(`/companies/${targetId}/logo`)
      .attach("outroCampo", PNG_BYTES, { filename: "logo.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(companyServiceMock.updateLogo).not.toHaveBeenCalled();
  });

  it("entrega o ficheiro em memória e a empresa do autenticado", async () => {
    authenticateAs(Role.ADMIN);

    await request(buildApp())
      .post(`/companies/${targetId}/logo`)
      .attach("logo", PNG_BYTES, { filename: "logo.png", contentType: "image/png" });

    const [id, file, callerCompany] = companyServiceMock.updateLogo.mock.calls[0];

    expect(id).toBe(targetId);
    expect(Buffer.isBuffer(file.buffer)).toBe(true);
    expect(file.originalname).toBe("logo.png");
    expect(callerCompany).toBe(companyId);
  });

  it("a resposta contém o logo { url, publicId }", async () => {
    authenticateAs(Role.ADMIN);

    const response = await request(buildApp())
      .post(`/companies/${targetId}/logo`)
      .attach("logo", PNG_BYTES, { filename: "logo.png", contentType: "image/png" });

    expect(response.body.data.logo).toEqual(newLogo);
  });

  it("propaga o erro do serviço sem o converter", async () => {
    authenticateAs(Role.ADMIN);
    companyServiceMock.updateLogo.mockRejectedValue(
      new AppError("Empresa não encontrada.", HttpStatus.NOT_FOUND),
    );

    const response = await request(buildApp())
      .post(`/companies/${targetId}/logo`)
      .attach("logo", PNG_BYTES, { filename: "logo.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
  });
});

describe("DELETE /companies/:id/logo - autenticação e RBAC", () => {
  it("sem autenticação responde 401 e não chama o serviço", async () => {
    authenticateAsAnonymous();

    const response = await request(buildApp()).delete(`/companies/${targetId}/logo`);

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(companyServiceMock.removeLogo).not.toHaveBeenCalled();
  });

  it.each([Role.OWNER, Role.ADMIN])(
    "permite o perfil %s (COMPANY_UPDATE)",
    async (role) => {
      authenticateAs(role);

      const response = await request(buildApp()).delete(`/companies/${targetId}/logo`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(companyServiceMock.removeLogo).toHaveBeenCalledWith(
        targetId,
        companyId,
      );
    },
  );

  it.each([Role.MANAGER, Role.EMPLOYEE, Role.CLIENT])(
    "nega o perfil %s (sem COMPANY_UPDATE)",
    async (role) => {
      authenticateAs(role);

      const response = await request(buildApp()).delete(`/companies/${targetId}/logo`);

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
      expect(companyServiceMock.removeLogo).not.toHaveBeenCalled();
    },
  );

  it("recusa um :id que não é ObjectId", async () => {
    authenticateAs(Role.ADMIN);

    const response = await request(buildApp()).delete("/companies/nao-e-objectid/logo");

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(companyServiceMock.removeLogo).not.toHaveBeenCalled();
  });

  it("a resposta contém logo null", async () => {
    authenticateAs(Role.ADMIN);

    const response = await request(buildApp()).delete(`/companies/${targetId}/logo`);

    expect(response.body.data.logo).toBeNull();
  });
});