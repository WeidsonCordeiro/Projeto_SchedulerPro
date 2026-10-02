import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createPublicLinkRateLimit } from "../../src/middlewares/public-appointment-link-rate-limit.middleware";
import {
  publicAvailabilityRateLimit,
  publicCatalogRateLimit,
} from "../../src/middlewares/public-catalog-rate-limit.middleware";

/**
 * ==========================================================
 * Limitadores do catálogo público.
 *
 * Montados num `express` mínimo: o que se testa aqui são os
 * orçamentos e o comportamento do 429, não as rotas — essas têm
 * os seus próprios testes, onde os limitadores são substituídos
 * por funções de passagem que contam invocações.
 *
 * Os limitadores reais (`publicCatalogRateLimit`,
 * `publicAvailabilityRateLimit`) são singletons de módulo. Para
 * os testes que precisam de um orçamento pequeno usa-se a
 * factory com um `routeKey` único, que cria um bucket
 * independente — o mesmo truque dos limitadores por token.
 *
 * O que interessa fixar, para além dos números:
 *
 * • são limitadores distintos, para que varredura de datas não
 *   esgote o orçamento de catálogo (e vice-versa);
 * • são por IP, porque estas rotas não autenticam;
 * • a janela e a mensagem de 429 são as mesmas das Partes 1 e
 *   2 — o limite é reaproveitado, não reimplementado.
 * ==========================================================
 */

const COMPANY_ID = "507f1f77bcf86cd799439011";

const CATALOG_PATH = `/api/public/companies/${COMPANY_ID}/services`;
const AVAILABILITY_PATH = `/api/public/companies/${COMPANY_ID}/availability`;

const buildApp = (
  limiter: express.RequestHandler,
  path: string,
): express.Express => {
  const app = express();
  app.use(express.json());
  app.get(path, limiter, (_req, res) => {
    res.status(200).json({ success: true });
  });

  return app;
};

/** Cada bucket é independente, por isso a chave tem de ser única. */
let sequence = 0;
const uniqueRouteKey = (label: string) => {
  sequence += 1;

  return `catalog-test-${label}#${sequence}`;
};

/** Factory com orçamento pequeno, para não fazer 120 pedidos. */
const smallLimiter = (label: string, limit: number) =>
  createPublicLinkRateLimit({
    routeKey: uniqueRouteKey(label),
    limit,
  });

afterEach(() => {
  vi.useRealTimers();
});

describe("Limitador do catálogo público", () => {
  it("devolve 429 ao exceder o orçamento", async () => {
    const app = buildApp(smallLimiter("catalog-exceed", 2), CATALOG_PATH);

    expect((await request(app).get(CATALOG_PATH)).status).toBe(200);
    expect((await request(app).get(CATALOG_PATH)).status).toBe(200);

    const blocked = await request(app).get(CATALOG_PATH);

    expect(blocked.status).toBe(429);
    expect(blocked.body.success).toBe(false);
  });

  it("reutiliza a mensagem global de excesso de pedidos", async () => {
    const app = buildApp(smallLimiter("catalog-message", 1), CATALOG_PATH);

    await request(app).get(CATALOG_PATH);
    const blocked = await request(app).get(CATALOG_PATH);

    expect(blocked.body.message).toBe(
      "Demasiadas tentativas de agendamento. Tente novamente mais tarde.",
    );
  });

  it("liberta o pedido quando a janela expira", async () => {
    vi.useFakeTimers();

    const app = buildApp(
      smallLimiter("catalog-window", 1),
      CATALOG_PATH,
    );

    expect((await request(app).get(CATALOG_PATH)).status).toBe(200);
    expect((await request(app).get(CATALOG_PATH)).status).toBe(429);

    vi.advanceTimersByTime(15 * 60 * 1_000 + 1_000);

    expect((await request(app).get(CATALOG_PATH)).status).toBe(200);
  });

  /**
   * ==========================================================
   * Os orçamentos reais, lidos dos singletons que as rotas usam.
   * ==========================================================
   */

  it("aceita 60 pedidos por 15 minutos", async () => {
    const app = buildApp(publicCatalogRateLimit, CATALOG_PATH);

    const response = await request(app).get(CATALOG_PATH);

    expect(response.headers["ratelimit"]).toContain("limit=60");
    expect(response.headers["ratelimit-policy"]).toContain("w=900");
  });

  it("expõe os cabeçalhos de quota", async () => {
    /**
     * Bucket novo, porque o singleton acima já consumiu pedidos:
     * um `remaining` lido dele dependeria da ordem dos testes.
     */
    const app = buildApp(
      smallLimiter("headers", 60),
      CATALOG_PATH,
    );

    const response = await request(app).get(CATALOG_PATH);

    expect(response.headers["ratelimit"]).toContain("remaining=59");
    expect(response.headers["x-ratelimit-limit"]).toBeUndefined();
  });
});

describe("Limitador de disponibilidade", () => {
  it("devolve 429 ao exceder o orçamento", async () => {
    const app = buildApp(
      smallLimiter("availability-exceed", 2),
      AVAILABILITY_PATH,
    );

    expect((await request(app).get(AVAILABILITY_PATH)).status).toBe(200);
    expect((await request(app).get(AVAILABILITY_PATH)).status).toBe(200);

    expect((await request(app).get(AVAILABILITY_PATH)).status).toBe(429);
  });

  /**
   * ==========================================================
   * O orçamento de disponibilidade é maior (120) porque uma
   * página percorre um mês: 31 datas, com alguma repetição a
   * cada troca de serviço ou profissional. Com o orçamento de
   * catálogo (60) seria impossível.
   * ==========================================================
   */
  it("aceita 120 pedidos por 15 minutos", async () => {
    const app = buildApp(publicAvailabilityRateLimit, AVAILABILITY_PATH);

    const response = await request(app).get(AVAILABILITY_PATH);

    expect(response.headers["ratelimit"]).toContain("limit=120");
    expect(response.headers["ratelimit-policy"]).toContain("w=900");
  });

  it("tem orçamento próprio, separado do catálogo", async () => {
    const catalog = buildApp(publicCatalogRateLimit, CATALOG_PATH);
    const availability = buildApp(
      publicAvailabilityRateLimit,
      AVAILABILITY_PATH,
    );

    const catalogResponse = await request(catalog).get(CATALOG_PATH);
    const availabilityResponse = await request(availability).get(
      AVAILABILITY_PATH,
    );

    expect(catalogResponse.headers["ratelimit"]).toContain("limit=60");
    expect(availabilityResponse.headers["ratelimit"]).toContain("limit=120");
  });

  it("esgota o catálogo sem afetar a disponibilidade", async () => {
    /**
     * Duas instâncias isoladas para provar a independência dos
     * buckets sem depender da ordem de execução dos testes.
     */
    const catalog = buildApp(smallLimiter("independent-catalog", 1), CATALOG_PATH);
    const availability = buildApp(
      smallLimiter("independent-availability", 5),
      AVAILABILITY_PATH,
    );

    await request(catalog).get(CATALOG_PATH);
    expect((await request(catalog).get(CATALOG_PATH)).status).toBe(429);

    expect((await request(availability).get(AVAILABILITY_PATH)).status).toBe(200);
    expect((await request(availability).get(AVAILABILITY_PATH)).status).toBe(200);
  });

  it("liberta o pedido quando a janela expira", async () => {
    vi.useFakeTimers();

    const app = buildApp(
      smallLimiter("availability-window", 1),
      AVAILABILITY_PATH,
    );

    expect((await request(app).get(AVAILABILITY_PATH)).status).toBe(200);
    expect((await request(app).get(AVAILABILITY_PATH)).status).toBe(429);

    vi.advanceTimersByTime(15 * 60 * 1_000 + 1_000);

    expect((await request(app).get(AVAILABILITY_PATH)).status).toBe(200);
  });
});