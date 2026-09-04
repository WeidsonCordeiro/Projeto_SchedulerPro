import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorMiddleware } from "../../../src/middlewares/error.middleware";

const createController = vi.fn((_req, res) =>
  res.status(201).json({ id: "507f1f77bcf86cd799439011" }),
);

vi.mock("../../../src/middlewares/auth.middleware", () => ({
  default: {
    authenticate: (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
      next(),
  },
}));

vi.mock("../../../src/middlewares/permission.middleware", () => ({
  hasPermission: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
}));

vi.mock("../../../src/middlewares/require-password-change.middleware", () => ({
  default: {
    requirePasswordChangeCompleted: (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
      next(),
  },
}));

vi.mock("../../../src/modules/users/controllers/UserController", () => ({
  default: {
    findAll: (_req: express.Request, res: express.Response) => res.json([]),
    create: createController,
    findById: (_req: express.Request, res: express.Response) => res.json({}),
    update: (_req: express.Request, res: express.Response) => res.json({}),
    delete: (_req: express.Request, res: express.Response) => res.json({}),
    activate: (_req: express.Request, res: express.Response) => res.json({}),
    deactivate: (_req: express.Request, res: express.Response) => res.json({}),
    changePassword: (_req: express.Request, res: express.Response) => res.json({}),
  },
}));

describe("POST /users - createUserValidator", () => {
  it("retorna 400 e não executa o Controller para payload inválido", async () => {
    const { default: userRoutes } = await import(
      "../../../src/modules/users/routes/UserRoutes"
    );
    const app = express();
    app.use(express.json());
    app.use("/users", userRoutes);
    app.use(errorMiddleware);

    const response = await request(app).post("/users").send({
      name: "",
      email: "email-invalido",
      password: "123",
      confirmPassword: "456",
      role: "EMPLOYEE",
    });

    expect(response.status).toBe(400);
    expect(createController).not.toHaveBeenCalled();
  }, 15000);

  it("permite payload válido chegar ao Controller", async () => {
    const { default: userRoutes } = await import(
      "../../../src/modules/users/routes/UserRoutes"
    );
    const app = express();
    app.use(express.json());
    app.use("/users", userRoutes);
    app.use(errorMiddleware);

    const response = await request(app).post("/users").send({
      name: "Utilizador Teste",
      email: "user@example.com",
      password: "password123",
      confirmPassword: "password123",
      role: "EMPLOYEE",
    });

    expect(response.status).toBe(201);
    expect(createController).toHaveBeenCalledOnce();
  });
});
