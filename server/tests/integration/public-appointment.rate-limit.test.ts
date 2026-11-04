import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPublicBookingRateLimit,
  publicBookingRateLimit,
} from "../../src/middlewares/public-booking-rate-limit.middleware";

/**
 * Testes isolados do limitador público, montados num `express`
 * mínimo para não depender de nenhuma rota real.
 *
 * Todas as requisições partilham o `req.ip` do supertest, por
 * isso a distinção por IP é testada com um middleware que
 * substitui o `req.ip` (simulando clientes distintos).
 */
const buildApp = (
  limiter: express.RequestHandler,
  options: { singleCompany?: boolean } = {},
) => {
  const app = express();

  if (options.singleCompany) {
    app.post(
      "/api/public/companies/:companyId/appointments",
      limiter,
      (_req, res) => {
        res.status(201).json({ success: true });
      },
    );
    return app;
  }

  app.use(limiter);
  app.post("/api/public/companies/:companyId/appointments", (_req, res) => {
    res.status(201).json({ success: true });
  });
  return app;
};

const post = (
  app: express.Express,
  companyId = "507f1f77bcf86cd799439011",
) =>
  request(app).post(
    `/api/public/companies/${companyId}/appointments`,
  );

afterEach(() => {
  vi.useRealTimers();
});

describe("Limitador público — factory", () => {
  it("devolve 429 no pedido que excede o limite configurado", async () => {
    const app = buildApp(
      createPublicBookingRateLimit({ limit: 2, windowMs: 60_000 }),
    );

    expect((await post(app)).status).toBe(201);
    expect((await post(app)).status).toBe(201);

    const blocked = await post(app);
    expect(blocked.status).toBe(429);
    expect(blocked.body.success).toBe(false);
    expect(blocked.body.message).toBe(
      "Demasiadas tentativas de agendamento. Tente novamente mais tarde.",
    );
  });

  it("devolve o envelope de erro padrão do projeto", async () => {
    const app = buildApp(
      createPublicBookingRateLimit({ limit: 1, windowMs: 60_000 }),
    );

    await post(app);
    const blocked = await post(app);

    expect(blocked.body).toEqual({
      success: false,
      message: expect.any(String),
    });
  });

  it("expõe os cabeçalhos padrão de quota", async () => {
    const app = buildApp(
      createPublicBookingRateLimit({ limit: 5, windowMs: 60_000 }),
    );

    const response = await post(app);

    expect(response.headers["ratelimit"]).toContain("limit=5");
    expect(response.headers["ratelimit"]).toContain("remaining=4");
    expect(response.headers["ratelimit-policy"]).toContain("5;w=60");
    expect(response.headers["x-ratelimit-limit"]).toBeUndefined();
  });

  it("liberta o pedido quando a janela expira", async () => {
    vi.useFakeTimers();
    const app = buildApp(
      createPublicBookingRateLimit({ limit: 1, windowMs: 1_000 }),
    );

    expect((await post(app)).status).toBe(201);
    expect((await post(app)).status).toBe(429);

    vi.advanceTimersByTime(1_100);
    expect((await post(app)).status).toBe(201);
  });

  it("usa 20 pedidos por 15 minutos por omissão", async () => {
    const app = buildApp(publicBookingRateLimit);

    const first = await post(app);
    expect(first.status).toBe(201);
    expect(first.headers["ratelimit"]).toContain("limit=20");
    expect(first.headers["ratelimit-policy"]).toContain("w=900");
  });
});

describe("Limitador público — chave por IP", () => {
  /**
   * Simula clientes distintos trocando o `req.ip`, como o Express
   * faria com `trust proxy` configurado.
   */
  const appWithFakeIps = (limiter: express.RequestHandler) => {
    const app = express();
    app.use((req, _res, next) => {
      Object.defineProperty(req, "ip", {
        value: String(req.headers["x-client-ip"] ?? "0.0.0.0"),
        configurable: true,
      });
      next();
    });
    app.post("/api/public/companies/:companyId/appointments", limiter, (_req, res) => {
      res.status(201).json({ success: true });
    });
    return app;
  };

  const postFrom = (app: express.Express, ip: string) =>
    request(app)
      .post("/api/public/companies/507f1f77bcf86cd799439011/appointments")
      .set("X-Client-Ip", ip);

  it("conta pedidos separadamente por origem", async () => {
    const app = appWithFakeIps(
      createPublicBookingRateLimit({ limit: 1, windowMs: 60_000 }),
    );

    expect((await postFrom(app, "203.0.113.1")).status).toBe(201);
    expect((await postFrom(app, "203.0.113.2")).status).toBe(201);
    expect((await postFrom(app, "203.0.113.1")).status).toBe(429);
  });

  it("agrupa o mesmo endereço em representações equivalentes", async () => {
    const app = appWithFakeIps(
      createPublicBookingRateLimit({ limit: 1, windowMs: 60_000 }),
    );

    expect((await postFrom(app, "203.0.113.1")).status).toBe(201);
    expect((await postFrom(app, "::ffff:203.0.113.1")).status).toBe(429);
  });

  it("normaliza o IPv6 para uma subnet, não para o endereço exato", async () => {
    const app = appWithFakeIps(
      createPublicBookingRateLimit({ limit: 1, windowMs: 60_000 }),
    );

    expect((await postFrom(app, "2001:db8:85a3::8a2e:370:7334")).status).toBe(201);
    expect((await postFrom(app, "2001:db8:85a3::1")).status).toBe(429);
  });

  it("ignora X-Forwarded-For, que o cliente controla", async () => {
    const app = buildApp(
      createPublicBookingRateLimit({ limit: 1, windowMs: 60_000 }),
    );

    expect((await post(app)).status).toBe(201);

    for (let i = 1; i <= 5; i += 1) {
      const response = await request(app)
        .post("/api/public/companies/507f1f77bcf86cd799439011/appointments")
        .set("X-Forwarded-For", `198.51.100.${i}`);

      expect(response.status).toBe(429);
    }
  });
});

describe("Limitador público — escopo", () => {
  it("partilha a mesma chave entre empresas diferentes", async () => {
    const app = buildApp(
      createPublicBookingRateLimit({ limit: 1, windowMs: 60_000 }),
    );

    expect((await post(app, "507f1f77bcf86cd799439011")).status).toBe(201);
    expect((await post(app, "507f1f77bcf86cd799439012")).status).toBe(429);
  });

  it("aplica-se apenas à rota pública de criação", async () => {
    const app = buildApp(
      createPublicBookingRateLimit({ limit: 1, windowMs: 60_000 }),
      { singleCompany: true },
    );

    expect((await post(app)).status).toBe(201);
    expect((await post(app)).status).toBe(429);
    expect(
      (await request(app).get("/api/public/companies/abc/appointments")).status,
    ).toBe(404);
  });

  it("não afeta as restantes rotas quando montado apenas na criação pública", async () => {
    const limiter = createPublicBookingRateLimit({ limit: 1, windowMs: 60_000 });

    const app = express();
    app.post(
      "/api/public/companies/:companyId/appointments",
      limiter,
      (_req, res) => {
        res.status(201).json({ success: true });
      },
    );
    app.post("/api/appointments", (_req, res) => {
      res.status(201).json({ success: true });
    });
    app.get("/api/me", (_req, res) => {
      res.status(200).json({ success: true });
    });

    expect((await post(app)).status).toBe(201);
    expect((await post(app)).status).toBe(429);

    expect(
      (await request(app).post("/api/appointments")).status,
    ).toBe(201);
    expect((await request(app).get("/api/me")).status).toBe(200);
  });
});