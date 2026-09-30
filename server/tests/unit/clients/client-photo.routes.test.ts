import { beforeEach, describe, expect, it, vi } from "vitest";
import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";

/**
 * ==========================================================
 * Foto do cliente — cadeia de middlewares da rota.
 *
 * Usa o router real (`ClientRoutes`) com a matriz de RBAC
 * real (`hasPermission`). Só a autenticação, a verificação de
 * "password alterada" e o serviço são substituídos, para
 * poder simular cada role sem emitir JWT e sem tocar no
 * MongoDB/Cloudinary.
 *
 * A validação do formato (assinatura binária) é feita pelo
 * `imageProvider` (coberto nos testes do provider); a cadeia
 * de rotas testa aqui o que é da camada HTTP: autenticação,
 * RBAC, ObjectId, limite do multer e campo faltante.
 * ==========================================================
 */

const { clientServiceMock, authMock, passwordChangeMock } = vi.hoisted(() => ({
  clientServiceMock: { updatePhoto: vi.fn(), removePhoto: vi.fn() },
  authMock: { authenticate: vi.fn() },
  passwordChangeMock: { requirePasswordChangeCompleted: vi.fn() },
}));

vi.mock("../../../src/modules/Clients/services/ClientService", () => ({
  default: clientServiceMock,
}));

vi.mock("../../../src/middlewares/auth.middleware", () => ({
  default: authMock,
}));

vi.mock("../../../src/middlewares/require-password-change.middleware", () => ({
  default: passwordChangeMock,
}));

import clientRoutes from "../../../src/modules/Clients/routes/ClientRoutes";
import { Role } from "../../../src/constants/roles";
import { HttpStatus } from "../../../src/constants/http-status";
import { AppError } from "../../../src/errors/AppError";

const companyId = "507f1f77bcf86cd799439011";
const userId = "507f1f77bcf86cd799439012";
const targetId = "507f1f77bcf86cd799439013";

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const newAvatar = {
  url: "https://res.cloudinary.com/demo/image/upload/v1/schedulerpro/client/novo",
  publicId: "schedulerpro/client/novo",
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

  app.use("/clients", clientRoutes);

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
  clientServiceMock.updatePhoto.mockResolvedValue({
    id: targetId,
    avatar: newAvatar,
  });
  clientServiceMock.removePhoto.mockResolvedValue({ id: targetId, avatar: null });
});

describe("POST /clients/:id/photo - autenticação e RBAC", () => {
  it("sem autenticação responde 401 e não chama o serviço", async () => {
    authenticateAsAnonymous();

    const response = await request(buildApp())
      .post(`/clients/${targetId}/photo`)
      .attach("photo", PNG_BYTES, { filename: "foto.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(clientServiceMock.updatePhoto).not.toHaveBeenCalled();
  });

  it.each([Role.OWNER, Role.ADMIN, Role.MANAGER])(
    "permite o perfil %s (CLIENT_UPDATE)",
    async (role) => {
      authenticateAs(role);

      const response = await request(buildApp())
        .post(`/clients/${targetId}/photo`)
        .attach("photo", PNG_BYTES, { filename: "foto.png", contentType: "image/png" });

      expect(response.status).toBe(HttpStatus.OK);
      expect(clientServiceMock.updatePhoto).toHaveBeenCalled();
    },
  );

  it.each([Role.EMPLOYEE, Role.CLIENT])(
    "nega o perfil %s (sem CLIENT_UPDATE)",
    async (role) => {
      authenticateAs(role);

      const response = await request(buildApp())
        .post(`/clients/${targetId}/photo`)
        .attach("photo", PNG_BYTES, { filename: "foto.png", contentType: "image/png" });

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
      expect(clientServiceMock.updatePhoto).not.toHaveBeenCalled();
    },
  );

  it("recusa um :id que não é ObjectId antes de qualquer processamento", async () => {
    authenticateAs(Role.ADMIN);

    const response = await request(buildApp())
      .post("/clients/nao-e-objectid/photo")
      .attach("photo", PNG_BYTES, { filename: "foto.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(clientServiceMock.updatePhoto).not.toHaveBeenCalled();
  });
});

describe("POST /clients/:id/photo - receção do ficheiro", () => {
  it("rejeita um ficheiro acima de 5 MB com 400 e sem chamar o serviço", async () => {
    authenticateAs(Role.ADMIN);

    const oversized = Buffer.concat([
      PNG_BYTES,
      Buffer.alloc(5 * 1024 * 1024, 0),
    ]);

    const response = await request(buildApp())
      .post(`/clients/${targetId}/photo`)
      .attach("photo", oversized, { filename: "grande.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(clientServiceMock.updatePhoto).not.toHaveBeenCalled();
  });

  it("responde 400 quando nenhum ficheiro é enviado", async () => {
    authenticateAs(Role.ADMIN);

    const response = await request(buildApp()).post(`/clients/${targetId}/photo`);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(clientServiceMock.updatePhoto).not.toHaveBeenCalled();
  });

  it("rejeita um campo multipart inesperado", async () => {
    authenticateAs(Role.ADMIN);

    const response = await request(buildApp())
      .post(`/clients/${targetId}/photo`)
      .attach("outroCampo", PNG_BYTES, { filename: "foto.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(clientServiceMock.updatePhoto).not.toHaveBeenCalled();
  });

  it("entrega o ficheiro em memória e a empresa do autenticado", async () => {
    authenticateAs(Role.ADMIN);

    await request(buildApp())
      .post(`/clients/${targetId}/photo`)
      .attach("photo", PNG_BYTES, { filename: "foto.png", contentType: "image/png" });

    const [id, file, callerCompany] = clientServiceMock.updatePhoto.mock.calls[0];

    expect(id).toBe(targetId);
    expect(Buffer.isBuffer(file.buffer)).toBe(true);
    expect(file.originalname).toBe("foto.png");
    expect(callerCompany).toBe(companyId);
  });

  it("a resposta contém o avatar { url, publicId }", async () => {
    authenticateAs(Role.ADMIN);

    const response = await request(buildApp())
      .post(`/clients/${targetId}/photo`)
      .attach("photo", PNG_BYTES, { filename: "foto.png", contentType: "image/png" });

    expect(response.body.data.avatar).toEqual(newAvatar);
  });

  it("propaga o erro do serviço sem o converter", async () => {
    authenticateAs(Role.ADMIN);
    clientServiceMock.updatePhoto.mockRejectedValue(
      new AppError(
        "O armazenamento de imagens não está configurado neste ambiente.",
        HttpStatus.INTERNAL_SERVER_ERROR,
      ),
    );

    const response = await request(buildApp())
      .post(`/clients/${targetId}/photo`)
      .attach("photo", PNG_BYTES, { filename: "foto.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});

describe("DELETE /clients/:id/photo - autenticação e RBAC", () => {
  it("sem autenticação responde 401 e não chama o serviço", async () => {
    authenticateAsAnonymous();

    const response = await request(buildApp()).delete(`/clients/${targetId}/photo`);

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(clientServiceMock.removePhoto).not.toHaveBeenCalled();
  });

  it.each([Role.OWNER, Role.ADMIN, Role.MANAGER])(
    "permite o perfil %s (CLIENT_UPDATE)",
    async (role) => {
      authenticateAs(role);

      const response = await request(buildApp()).delete(`/clients/${targetId}/photo`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(clientServiceMock.removePhoto).toHaveBeenCalledWith(
        targetId,
        companyId,
      );
    },
  );

  it.each([Role.EMPLOYEE, Role.CLIENT])(
    "nega o perfil %s (sem CLIENT_UPDATE)",
    async (role) => {
      authenticateAs(role);

      const response = await request(buildApp()).delete(`/clients/${targetId}/photo`);

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
      expect(clientServiceMock.removePhoto).not.toHaveBeenCalled();
    },
  );

  it("recusa um :id que não é ObjectId", async () => {
    authenticateAs(Role.ADMIN);

    const response = await request(buildApp()).delete("/clients/nao-e-objectid/photo");

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(clientServiceMock.removePhoto).not.toHaveBeenCalled();
  });

  it("a resposta contém avatar null", async () => {
    authenticateAs(Role.ADMIN);

    const response = await request(buildApp()).delete(`/clients/${targetId}/photo`);

    expect(response.body.data.avatar).toBeNull();
  });
});