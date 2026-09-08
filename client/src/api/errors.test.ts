import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { getApiError } from "./errors";

function httpError(status: number, body?: unknown) {
  return new AxiosError(
    "Request failed",
    "ERR_BAD_REQUEST",
    undefined,
    {},
    {
      status,
      data: body,
      statusText: "",
      headers: {},
      config: { headers: new AxiosHeaders() },
    },
  );
}

describe("getApiError", () => {
  it("classifies network errors", () => {
    const error = new AxiosError("Network Error", "ERR_NETWORK");
    expect(getApiError(error)).toMatchObject({ kind: "network" });
  });

  it("classifies 401/403 as auth errors", () => {
    expect(getApiError(httpError(401, { message: "Não autorizado." }))).toMatchObject({
      kind: "auth",
      status: 401,
      message: "Não autorizado.",
    });
    expect(getApiError(httpError(403))).toMatchObject({ kind: "auth", status: 403 });
  });

  it("classifies 400 as validation error", () => {
    const failure = getApiError(httpError(400, { message: "Dados inválidos.", errors: [{ field: "email", message: "Email inválido." }] }));
    expect(failure).toMatchObject({ kind: "validation", status: 400 });
    expect(failure.errors).toEqual([{ field: "email", message: "Email inválido." }]);
  });

  it("classifies 404 as not_found", () => {
    expect(getApiError(httpError(404))).toMatchObject({ kind: "not_found", status: 404 });
  });

  it("classifies 409 as conflict", () => {
    expect(getApiError(httpError(409))).toMatchObject({ kind: "conflict", status: 409 });
  });

  it("classifies 5xx as server errors", () => {
    expect(getApiError(httpError(500, { message: "Erro interno do servidor." }))).toMatchObject({
      kind: "server",
      status: 500,
      message: "Erro interno do servidor.",
    });
  });

  it("classifies non-axios errors as unknown", () => {
    expect(getApiError(new Error("boom"))).toMatchObject({ kind: "unknown", message: "boom" });
  });
});