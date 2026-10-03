import { beforeEach, describe, expect, it, vi } from "vitest";

const { envMock } = vi.hoisted(() => ({
  envMock: {
    frontend: { FRONTEND_URL: "https://app.exemplo" },
  },
}));

vi.mock("../../../src/config/env", () => ({ env: envMock }));

import { buildPublicManageUrl } from "../../../src/utils/public-manage-url";

/**
 * Token real: 43 caracteres base64url, o formato que o
 * `PublicAppointmentTokenProvider` produz.
 */
const TOKEN = "aB3-_xY9zQ1wE2rT5yU8iO0pL4kJ6hG7fD2sA1nM0";

describe("buildPublicManageUrl", () => {
  beforeEach(() => {
    envMock.frontend.FRONTEND_URL = "https://app.exemplo";
  });

  it("monta a rota pública de gestão com o token", () => {
    expect(buildPublicManageUrl(TOKEN)).toBe(
      `https://app.exemplo/agendar/${TOKEN}`,
    );
  });

  it("remove a barra final de FRONTEND_URL para não duplicar o separador", () => {
    envMock.frontend.FRONTEND_URL = "https://app.exemplo/";

    expect(buildPublicManageUrl(TOKEN)).not.toContain("/agendar/".repeat(2));
    expect(buildPublicManageUrl(TOKEN)).toBe(
      `https://app.exemplo/agendar/${TOKEN}`,
    );
  });

  it("remove várias barras finais", () => {
    envMock.frontend.FRONTEND_URL = "https://app.exemplo///";

    expect(buildPublicManageUrl(TOKEN)).toBe(
      `https://app.exemplo/agendar/${TOKEN}`,
    );
  });

  it("preserva o caminho base quando FRONTEND_URL não é a raiz", () => {
    envMock.frontend.FRONTEND_URL = "https://app.exemplo/scheduler";

    expect(buildPublicManageUrl(TOKEN)).toBe(
      `https://app.exemplo/scheduler/agendar/${TOKEN}`,
    );
  });

  it("respeita o esquema e a porta definidos na configuração", () => {
    envMock.frontend.FRONTEND_URL = "http://localhost:5173";

    expect(buildPublicManageUrl(TOKEN)).toBe(
      `http://localhost:5173/agendar/${TOKEN}`,
    );
  });

  it("preserva os caracteres base64url do token sem os escapar", () => {
    const html = buildPublicManageUrl(TOKEN);

    // `-` e `_` são legítimos em base64url e NÃO podem ser
    // convertidos em `%2D`/`%5F`: o link tem de bater certo com
    // o token que o backend valida.
    expect(html).toContain("-");
    expect(html).toContain("_");
    expect(html).not.toContain("%2D");
    expect(html).not.toContain("%5F");
  });

  it("codifica caracteres que alterariam a query string", () => {
    // Defesa: o token gerado nunca contém estes caracteres, mas
    // um token malformado não pode transformar o path em query
    // nem escapar do atributo href.
    const hostile = "abc?a=1&b=2#x";

    const url = buildPublicManageUrl(hostile);

    expect(url).toBe("https://app.exemplo/agendar/abc%3Fa%3D1%26b%3D2%23x");
    expect(url).not.toContain("?");
    expect(url).not.toContain("#");
  });
});
