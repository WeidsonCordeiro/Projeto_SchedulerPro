import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPublicLinkRateLimit,
  publicAppointmentCancelRateLimit,
  publicAppointmentReadRateLimit,
  publicAppointmentWriteRateLimit,
} from "../../src/middlewares/public-appointment-link-rate-limit.middleware";

/**
 * Testes isolados dos limitadores do acesso por TOKEN, montados
 * num `express` mínimo para não depender de rotas reais nem de
 * base de dados.
 *
 * Os limitadores reais (`publicAppointment*RateLimit`) são
 * singletons de módulo: para os testes que precisam de um
 * orçamento próprio usa-se a factory com um `routeKey` único,
 * o que cria um bucket independente sem depender da ordem de
 * execução.
 */
const WINDOW_MS = 60_000;

const buildApp = (
  limiter: express.RequestHandler,
  method: "get" | "patch" | "delete" = "get",
) => {
  const app = express();
  app.use(express.json());

  app[method]("/api/public/appointments/:token", limiter, (_req, res) => {
    res.status(200).json({ success: true });
  });

  return app;
};

let sequence = 0;
const uniqueRouteKey = (label: string) => {
  sequence += 1;

  return `${label}#${sequence}`;
};

const get = (app: express.Express, token = "token") =>
  request(app).get(`/api/public/appointments/${token}`);

afterEach(() => {
  vi.useRealTimers();
});

describe("Limitador de link — factory", () => {
  it("devolve 429 no pedido que excede o limite configurado", async () => {
    const app = buildApp(
      createPublicLinkRateLimit({
        routeKey: uniqueRouteKey("write"),
        limit: 2,
        windowMs: WINDOW_MS,
      }),
      "patch",
    );

    expect((await request(app).patch("/api/public/appointments/t")).status).toBe(200);
    expect((await request(app).patch("/api/public/appointments/t")).status).toBe(200);

    const blocked = await request(app).patch("/api/public/appointments/t");
    expect(blocked.status).toBe(429);
    expect(blocked.body.success).toBe(false);
    /**
     * Reutiliza a mensagem global de excesso de pedidos, para
     * não haver duas mensagens concorrentes para o mesmo 429.
     */
    expect(blocked.body.message).toBe(
      "Demasiadas tentativas de agendamento. Tente novamente mais tarde.",
    );
  });

  it("expõe os cabeçalhos padrão de quota", async () => {
    const app = buildApp(
      createPublicLinkRateLimit({
        routeKey: uniqueRouteKey("read"),
        limit: 5,
        windowMs: WINDOW_MS,
      }),
    );

    const response = await get(app);

    expect(response.headers["ratelimit"]).toContain("limit=5");
    expect(response.headers["ratelimit"]).toContain("remaining=4");
    expect(response.headers["x-ratelimit-limit"]).toBeUndefined();
  });

  it("liberta o pedido quando a janela expira", async () => {
    vi.useFakeTimers();

    const app = buildApp(
      createPublicLinkRateLimit({
        routeKey: uniqueRouteKey("cancel"),
        limit: 1,
        windowMs: 1_000,
      }),
      "delete",
    );

    expect((await request(app).delete("/api/public/appointments/t")).status).toBe(200);
    expect((await request(app).delete("/api/public/appointments/t")).status).toBe(429);

    vi.advanceTimersByTime(1_100);
    expect((await request(app).delete("/api/public/appointments/t")).status).toBe(200);
  });
});

describe("Limitador de link — limites por omissão", () => {
  it("GET aceita 60 pedidos por 15 minutos", async () => {
    const app = buildApp(publicAppointmentReadRateLimit);

    const response = await get(app);

    expect(response.headers["ratelimit"]).toContain("limit=60");
    expect(response.headers["ratelimit-policy"]).toContain("w=900");
  });

  it("PATCH aceita 10 pedidos por 15 minutos", async () => {
    const app = buildApp(publicAppointmentWriteRateLimit, "patch");

    const response = await request(app).patch("/api/public/appointments/t");

    expect(response.headers["ratelimit"]).toContain("limit=10");
    expect(response.headers["ratelimit-policy"]).toContain("w=900");
  });

  it("DELETE aceita 10 pedidos por 15 minutos", async () => {
    const app = buildApp(publicAppointmentCancelRateLimit, "delete");

    const response = await request(app).delete("/api/public/appointments/t");

    expect(response.headers["ratelimit"]).toContain("limit=10");
    expect(response.headers["ratelimit-policy"]).toContain("w=900");
  });

  it("o limite de escrita não impede a leitura do mesmo agendamento", async () => {
    /**
     * São buckets distintos (`routeKey` distinto), por isso
     * esgotar o PATCH não toca no GET.
     */
    const read = buildApp(
      createPublicLinkRateLimit({
        routeKey: uniqueRouteKey("read"),
        limit: 5,
        windowMs: WINDOW_MS,
      }),
    );
    const write = buildApp(
      createPublicLinkRateLimit({
        routeKey: uniqueRouteKey("write"),
        limit: 1,
        windowMs: WINDOW_MS,
      }),
      "patch",
    );

    expect((await request(write).patch("/api/public/appointments/t")).status).toBe(200);
    expect((await request(write).patch("/api/public/appointments/t")).status).toBe(429);

    expect((await get(read)).status).toBe(200);
  });

  it("o limite de cancelamento não impede a alteração", async () => {
    const cancel = buildApp(
      createPublicLinkRateLimit({
        routeKey: uniqueRouteKey("cancel"),
        limit: 1,
        windowMs: WINDOW_MS,
      }),
      "delete",
    );
    const write = buildApp(
      createPublicLinkRateLimit({
        routeKey: uniqueRouteKey("write"),
        limit: 2,
        windowMs: WINDOW_MS,
      }),
      "patch",
    );

    expect((await request(cancel).delete("/api/public/appointments/t")).status).toBe(200);
    expect((await request(cancel).delete("/api/public/appointments/t")).status).toBe(429);

    expect((await request(write).patch("/api/public/appointments/t")).status).toBe(200);
    expect((await request(write).patch("/api/public/appointments/t")).status).toBe(200);
  });
});

describe("Limitador de link — chave", () => {
  const appWithFakeIps = (
    limiter: express.RequestHandler,
    method: "get" | "patch" | "delete" = "get",
  ) => {
    const app = express();

    app.use((req, _res, next) => {
      Object.defineProperty(req, "ip", {
        value: String(req.headers["x-client-ip"] ?? "0.0.0.0"),
        configurable: true,
      });
      next();
    });

    app[method]("/api/public/appointments/:token", limiter, (_req, res) => {
      res.status(200).json({ success: true });
    });

    return app;
  };

  it("conta pedidos separadamente por origem", async () => {
    const app = appWithFakeIps(
      createPublicLinkRateLimit({
        routeKey: uniqueRouteKey("read"),
        limit: 1,
        windowMs: WINDOW_MS,
      }),
    );

    const from = (ip: string) =>
      request(app).get("/api/public/appointments/t").set("X-Client-Ip", ip);

    expect((await from("203.0.113.1")).status).toBe(200);
    expect((await from("203.0.113.2")).status).toBe(200);
    expect((await from("203.0.113.1")).status).toBe(429);
  });

  it("agrupa o mesmo endereço em representações equivalentes", async () => {
    const app = appWithFakeIps(
      createPublicLinkRateLimit({
        routeKey: uniqueRouteKey("read"),
        limit: 1,
        windowMs: WINDOW_MS,
      }),
    );

    const from = (ip: string) =>
      request(app).get("/api/public/appointments/t").set("X-Client-Ip", ip);

    expect((await from("203.0.113.1")).status).toBe(200);
    expect((await from("::ffff:203.0.113.1")).status).toBe(429);
  });

  it("ignora X-Forwarded-For, que o cliente controla", async () => {
    const app = buildApp(
      createPublicLinkRateLimit({
        routeKey: uniqueRouteKey("read"),
        limit: 1,
        windowMs: WINDOW_MS,
      }),
    );

    expect((await get(app)).status).toBe(200);

    for (let i = 1; i <= 5; i += 1) {
      const response = await request(app)
        .get("/api/public/appointments/t")
        .set("X-Forwarded-For", `198.51.100.${i}`);

      expect(response.status).toBe(429);
    }
  });

  it("conta tokens tentados a erro no mesmo orçamento", async () => {
    const app = buildApp(
      createPublicLinkRateLimit({
        routeKey: uniqueRouteKey("read"),
        limit: 2,
        windowMs: WINDOW_MS,
      }),
    );

    /**
     * O limitador corre ANTES de qualquer validação do token:
     * quem adivinha tokens não fica com um orçamento infinito de
     * tentativas.
     */
    expect((await get(app, "token-errado-1")).status).toBe(200);
    expect((await get(app, "token-errado-2")).status).toBe(200);
    expect((await get(app, "token-certo")).status).toBe(429);
  });

  it("não conta o token na chave: o limite é por origem, não por link", async () => {
    const app = buildApp(
      createPublicLinkRateLimit({
        routeKey: uniqueRouteKey("read"),
        limit: 2,
        windowMs: WINDOW_MS,
      }),
    );

    expect((await get(app, "token-a")).status).toBe(200);
    expect((await get(app, "token-b")).status).toBe(200);
    expect((await get(app, "token-c")).status).toBe(429);
  });

  it("conta pedidos sem IP resolvido na mesma chave", async () => {
    /**
     * `req.ip` só não existe em contextos não-HTTP. Mesmo assim,
     * o limitador tem de continuar a funcionar em vez de rebentar
     * ou de deixar passar tudo.
     */
    const app = express();
    app.use((req, _res, next) => {
      Object.defineProperty(req, "ip", { value: undefined, configurable: true });
      next();
    });
    app.get(
      "/api/public/appointments/:token",
      createPublicLinkRateLimit({
        routeKey: uniqueRouteKey("read"),
        limit: 1,
        windowMs: WINDOW_MS,
      }),
      (_req, res) => {
        res.status(200).json({ success: true });
      },
    );

    expect((await get(app)).status).toBe(200);
    expect((await get(app)).status).toBe(429);
  });
});

describe("Limitador de link — escopo", () => {
  it("não afeta as rotas administrativas quando montado só no acesso público", async () => {
    const limiter = createPublicLinkRateLimit({
      routeKey: uniqueRouteKey("read"),
      limit: 1,
      windowMs: WINDOW_MS,
    });

    const app = express();
    app.use(express.json());
    app.get("/api/public/appointments/:token", limiter, (_req, res) => {
      res.status(200).json({ success: true });
    });
    app.get("/api/appointments", (_req, res) => {
      res.status(200).json({ success: true });
    });

    expect((await get(app)).status).toBe(200);
    expect((await get(app)).status).toBe(429);
    expect((await request(app).get("/api/appointments")).status).toBe(200);
  });
});