import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorMiddleware } from "../../../src/middlewares/error.middleware";

const findServiceById = vi.fn((_req, res) =>
  res.status(404).json({ message: "Serviço não encontrado." }),
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

vi.mock("../../../src/modules/services/controllers/ServiceController", () => ({
  default: {
    findAll: (_req: express.Request, res: express.Response) => res.json([]),
    findById: findServiceById,
    create: (_req: express.Request, res: express.Response) => res.json({}),
    update: (_req: express.Request, res: express.Response) => res.json({}),
    delete: (_req: express.Request, res: express.Response) => res.json({}),
    activate: (_req: express.Request, res: express.Response) => res.json({}),
    deactivate: (_req: express.Request, res: express.Response) => res.json({}),
  },
}));

vi.mock("../../../src/modules/Clients/controllers/ClientController", () => ({
  default: {
    findAll: (_req: express.Request, res: express.Response) => res.json([]),
    findById: (_req: express.Request, res: express.Response) => res.json({}),
    create: (_req: express.Request, res: express.Response) => res.json({}),
    update: (_req: express.Request, res: express.Response) => res.json({}),
    delete: (_req: express.Request, res: express.Response) => res.json({}),
    activate: (_req: express.Request, res: express.Response) => res.json({}),
    deactivate: (_req: express.Request, res: express.Response) => res.json({}),
  },
}));

describe("ObjectId validation in real routes", () => {
  beforeEach(() => {
    findServiceById.mockClear();
  });

  it("returns 400 on an invalid service :id before the controller", async () => {
    const { default: serviceRoutes } = await import(
      "../../../src/modules/services/routes/ServiceRoutes"
    );
    const app = express();
    app.use(express.json());
    app.use("/services", serviceRoutes);
    app.use(errorMiddleware);

    const response = await request(app).get("/services/abc");

    expect(response.status).toBe(400);
    expect(findServiceById).not.toHaveBeenCalled();
  });

  it("returns 400 on an invalid client :id", async () => {
    const { default: clientRoutes } = await import(
      "../../../src/modules/Clients/routes/ClientRoutes"
    );
    const app = express();
    app.use(express.json());
    app.use("/clients", clientRoutes);
    app.use(errorMiddleware);

    const response = await request(app).get("/clients/not-an-object-id");

    expect(response.status).toBe(400);
  });

  it("preserves normal flow for a structurally valid but missing service id", async () => {
    const { default: serviceRoutes } = await import(
      "../../../src/modules/services/routes/ServiceRoutes"
    );
    const app = express();
    app.use(express.json());
    app.use("/services", serviceRoutes);
    app.use(errorMiddleware);

    const response = await request(app).get(
      "/services/507f1f77bcf86cd799439011",
    );

    expect(response.status).toBe(404);
    expect(findServiceById).toHaveBeenCalledOnce();
  });
});
