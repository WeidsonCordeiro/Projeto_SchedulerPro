import { beforeEach, describe, expect, it, vi } from "vitest";
import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";

/**
 * ==========================================================
 * Foto do funcionário — cadeia de middlewares da rota.
 *
 * Usa o router real (`UserRoutes`) com a matriz de RBAC
 * real (`hasPermission`). Só a autenticação e a verificação
 * de "password alterada" são substituídas, para poder
 * simular cada role sem emitir JWT.
 * ==========================================================
 */

const { userServiceMock, authMock, passwordChangeMock } = vi.hoisted(() => ({
  userServiceMock: { updatePhoto: vi.fn(), removePhoto: vi.fn() },
  authMock: { authenticate: vi.fn() },
  passwordChangeMock: { requirePasswordChangeCompleted: vi.fn() },
}));

vi.mock("../../../src/modules/users/services/UserService", () => ({
  default: userServiceMock,
}));

vi.mock("../../../src/middlewares/auth.middleware", () => ({
  default: authMock,
}));

vi.mock("../../../src/middlewares/require-password-change.middleware", () => ({
  default: passwordChangeMock,
}));

import userRoutes from "../../../src/modules/users/routes/UserRoutes";
import { Role } from "../../../src/constants/roles";
import { HttpStatus } from "../../../src/constants/http-status";
import { AppError } from "../../../src/errors/AppError";

const companyId = "507f1f77bcf86cd799439011";
const userId = "507f1f77bcf86cd799439012";
const targetId = "507f1f77bcf86cd799439013";

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Injeta o utilizador autenticado, como faria o AuthMiddleware. */
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

  app.use("/users", userRoutes);

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
  userServiceMock.updatePhoto.mockResolvedValue({ id: targetId, avatar: { url: "u", publicId: "p" } });
  userServiceMock.removePhoto.mockResolvedValue({ id: targetId, avatar: null });
});

describe("POST /users/:id/photo - RBAC", () => {
  it.each([Role.OWNER, Role.ADMIN])("permite o perfil %s", async (role) => {
    authenticateAs(role);

    const response = await request(buildApp())
      .post(`/users/${targetId}/photo`)
      .attach("photo", PNG_BYTES, { filename: "foto.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.OK);
    expect(userServiceMock.updatePhoto).toHaveBeenCalled();
  });

  it("nega MANAGER: mantém USER_UPDATE fora da sua matriz", async () => {
    authenticateAs(Role.MANAGER);

    const response = await request(buildApp())
      .post(`/users/${targetId}/photo`)
      .attach("photo", PNG_BYTES, { filename: "foto.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.FORBIDDEN);
    expect(userServiceMock.updatePhoto).not.toHaveBeenCalled();
  });

  it.each([Role.EMPLOYEE, Role.CLIENT])("nega o perfil %s", async (role) => {
    authenticateAs(role);

    const response = await request(buildApp())
      .post(`/users/${targetId}/photo`)
      .attach("photo", PNG_BYTES, { filename: "foto.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.FORBIDDEN);
    expect(userServiceMock.updatePhoto).not.toHaveBeenCalled();
  });

  it("recusa um :id que não é ObjectId antes de qualquer processamento", async () => {
    authenticateAs(Role.ADMIN);

    const response = await request(buildApp())
      .post("/users/nao-e-objectid/photo")
      .attach("photo", PNG_BYTES, { filename: "foto.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(userServiceMock.updatePhoto).not.toHaveBeenCalled();
  });
});

describe("POST /users/:id/photo - receção do ficheiro", () => {
  it("rejeita um ficheiro acima de 5 MB com 400 e sem chamar o serviço", async () => {
    authenticateAs(Role.ADMIN);

    const oversized = Buffer.concat([PNG_BYTES, Buffer.alloc(5 * 1024 * 1024, 0)]);

    const response = await request(buildApp())
      .post(`/users/${targetId}/photo`)
      .attach("photo", oversized, { filename: "grande.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(userServiceMock.updatePhoto).not.toHaveBeenCalled();
  });

  it("responde 400 quando nenhum ficheiro é enviado", async () => {
    authenticateAs(Role.ADMIN);

    const response = await request(buildApp()).post(`/users/${targetId}/photo`);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(userServiceMock.updatePhoto).not.toHaveBeenCalled();
  });

  it("rejeita um campo multipart inesperado", async () => {
    authenticateAs(Role.ADMIN);

    const response = await request(buildApp())
      .post(`/users/${targetId}/photo`)
      .attach("outroCampo", PNG_BYTES, { filename: "foto.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(userServiceMock.updatePhoto).not.toHaveBeenCalled();
  });

  it("entrega o ficheiro em memória e a empresa do autenticado", async () => {
    authenticateAs(Role.ADMIN);

    await request(buildApp())
      .post(`/users/${targetId}/photo`)
      .attach("photo", PNG_BYTES, { filename: "foto.png", contentType: "image/png" });

    const [id, file, callerCompany] = userServiceMock.updatePhoto.mock.calls[0];

    expect(id).toBe(targetId);
    expect(Buffer.isBuffer(file.buffer)).toBe(true);
    expect(file.originalname).toBe("foto.png");
    expect(callerCompany).toBe(companyId);
  });

  it("propaga o erro do serviço sem o converter", async () => {
    authenticateAs(Role.ADMIN);
    userServiceMock.updatePhoto.mockRejectedValue(
      new AppError("O armazenamento de imagens não está configurado neste ambiente.", HttpStatus.INTERNAL_SERVER_ERROR),
    );

    const response = await request(buildApp())
      .post(`/users/${targetId}/photo`)
      .attach("photo", PNG_BYTES, { filename: "foto.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});

describe("DELETE /users/:id/photo - RBAC", () => {
  it("permite o perfil ADMIN", async () => {
    authenticateAs(Role.ADMIN);

    const response = await request(buildApp()).delete(`/users/${targetId}/photo`);

    expect(response.status).toBe(HttpStatus.OK);
    expect(userServiceMock.removePhoto).toHaveBeenCalledWith(targetId, companyId);
  });

  it("nega MANAGER", async () => {
    authenticateAs(Role.MANAGER);

    const response = await request(buildApp()).delete(`/users/${targetId}/photo`);

    expect(response.status).toBe(HttpStatus.FORBIDDEN);
    expect(userServiceMock.removePhoto).not.toHaveBeenCalled();
  });
});
