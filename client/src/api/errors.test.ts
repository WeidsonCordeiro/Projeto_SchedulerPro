import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import {
  BACKEND_COMPANY_INACTIVE_ACCESS_MESSAGE,
  BACKEND_COMPANY_INACTIVE_OPERATION_MESSAGE,
  AVAILABILITY_EMPLOYEES_LIST_SUSPENDED_MESSAGE,
  COMPANY_INACTIVE_ERROR_CODES,
  COMPANY_INACTIVE_FRIENDLY_MESSAGES,
  DEFAULT_SESSION_EXPIRY_MESSAGE,
  STAFF_COMPANY_SUSPENSION_ERROR_CODES,
  STAFF_COMPANY_SUSPENSION_FRIENDLY_MESSAGE,
  USER_INACTIVE_FRIENDLY_MESSAGE,
  collectRelatedFailureMessages,
  collapseDuplicateMessages,
  formatRelatedFailuresMessage,
  getApiError,
  getFriendlyErrorMessage,
  getPageLoadErrorPresentation,
  isCompanyInactiveOperationFailure,
  isDuplicateCompanyInactivePageError,
  resolveAvailabilityEmployeesLoadNotice,
} from "./errors";

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

  it("classifies unrecognized statuses as unknown errors", () => {
    expect(getApiError(httpError(418, { message: "Teapot" }))).toMatchObject({
      kind: "unknown",
      status: 418,
      message: "Teapot",
    });
  });

  it("classifies non-axios errors as unknown", () => {
    expect(getApiError(new Error("boom"))).toMatchObject({ kind: "unknown", message: "boom" });
  });
});

describe("getFriendlyErrorMessage", () => {
  it("uses the backend message when present", () => {
    const failure = getApiError(httpError(400, { message: "Email inválido." }));
    expect(getFriendlyErrorMessage(failure)).toBe("Email inválido.");
  });

  it("hides network failure details behind a friendly message", () => {
    const failure = getApiError(new AxiosError("Network Error", "ERR_NETWORK"));
    expect(getFriendlyErrorMessage(failure)).toBe(
      "Não foi possível conectar ao servidor. Verifique sua conexão.",
    );
  });

  it("falls back for messages without detail", () => {
    const failure = getApiError(httpError(500));
    expect(getFriendlyErrorMessage(failure)).toBe(
      "Erro interno do servidor. Tente novamente mais tarde.",
    );
  });

  it("maps COMPANY_INACTIVE_OPERATION by code", () => {
    const failure = getApiError(
      httpError(403, {
        code: "COMPANY_INACTIVE_OPERATION",
        message: "raw",
      }),
    );
    expect(getFriendlyErrorMessage(failure)).toBe(
      COMPANY_INACTIVE_FRIENDLY_MESSAGES.COMPANY_INACTIVE_OPERATION,
    );
  });

  it("maps COMPANY_INACTIVE_ACCESS by code", () => {
    const failure = getApiError(
      httpError(403, {
        code: "COMPANY_INACTIVE_ACCESS",
        message: "raw",
      }),
    );
    expect(getFriendlyErrorMessage(failure)).toBe(
      COMPANY_INACTIVE_FRIENDLY_MESSAGES.COMPANY_INACTIVE_ACCESS,
    );
  });

  it("maps inactive operation by backend message when code is absent", () => {
    const failure = getApiError(
      httpError(403, { message: BACKEND_COMPANY_INACTIVE_OPERATION_MESSAGE }),
    );
    expect(getFriendlyErrorMessage(failure)).toBe(
      COMPANY_INACTIVE_FRIENDLY_MESSAGES.COMPANY_INACTIVE_OPERATION,
    );
  });

  it("maps inactive access by backend message when code is absent", () => {
    const failure = getApiError(
      httpError(403, { message: BACKEND_COMPANY_INACTIVE_ACCESS_MESSAGE }),
    );
    expect(getFriendlyErrorMessage(failure)).toBe(
      COMPANY_INACTIVE_FRIENDLY_MESSAGES.COMPANY_INACTIVE_ACCESS,
    );
  });

  it("keeps custom validation messages", () => {
    const failure = getApiError(httpError(400, { message: "Campo inválido." }));
    expect(getFriendlyErrorMessage(failure)).toBe("Campo inválido.");
  });

  it("maps USER_SUSPENDED_BY_COMPANY_DEACTIVATION by code", () => {
    const failure = getApiError(
      httpError(403, {
        code: STAFF_COMPANY_SUSPENSION_ERROR_CODES.USER_SUSPENDED_BY_COMPANY_DEACTIVATION,
        message: "raw",
      }),
    );
    expect(getFriendlyErrorMessage(failure)).toBe(
      STAFF_COMPANY_SUSPENSION_FRIENDLY_MESSAGE,
    );
  });

  it("maps USER_INACTIVE by code", () => {
    const failure = getApiError(
      httpError(403, {
        code: STAFF_COMPANY_SUSPENSION_ERROR_CODES.USER_INACTIVE,
        message: "Usuário desativado.",
      }),
    );
    expect(getFriendlyErrorMessage(failure)).toBe(USER_INACTIVE_FRIENDLY_MESSAGE);
  });
});

describe("collapseDuplicateMessages", () => {
  it("removes repeated messages", () => {
    expect(
      collapseDuplicateMessages(["A", "A", "B", "A", ""]),
    ).toEqual(["A", "B"]);
  });
});

describe("company inactive page error helpers (B.2)", () => {
  const inactiveOpFailure = getApiError(
    httpError(403, {
      code: COMPANY_INACTIVE_ERROR_CODES.COMPANY_INACTIVE_OPERATION,
      message: "raw",
    }),
  );

  it("detects COMPANY_INACTIVE_OPERATION by code and backend message", () => {
    expect(isCompanyInactiveOperationFailure(inactiveOpFailure)).toBe(true);
    expect(
      isCompanyInactiveOperationFailure(
        getApiError(
          httpError(403, { message: BACKEND_COMPANY_INACTIVE_OPERATION_MESSAGE }),
        ),
      ),
    ).toBe(true);
    expect(isCompanyInactiveOperationFailure(getApiError(httpError(500)))).toBe(
      false,
    );
  });

  it("marks duplicate page errors only when company is inactive in Redux", () => {
    expect(isDuplicateCompanyInactivePageError(inactiveOpFailure, false)).toBe(
      true,
    );
    expect(isDuplicateCompanyInactivePageError(inactiveOpFailure, true)).toBe(
      false,
    );
    expect(
      isDuplicateCompanyInactivePageError(inactiveOpFailure, undefined),
    ).toBe(false);
  });

  it("resolves availability employees notice without generic suspension copy", () => {
    const notice = resolveAvailabilityEmployeesLoadNotice(
      inactiveOpFailure,
      false,
    );
    expect(notice).toBe(AVAILABILITY_EMPLOYEES_LIST_SUSPENDED_MESSAGE);
    expect(notice).not.toContain("Reative a empresa");
  });

  it("collectRelatedFailureMessages skips duplicate operational errors", () => {
    const failures: string[] = [];
    collectRelatedFailureMessages(failures, httpError(403, {
      code: COMPANY_INACTIVE_ERROR_CODES.COMPANY_INACTIVE_OPERATION,
    }), false);
    expect(failures).toEqual([]);
    collectRelatedFailureMessages(
      failures,
      httpError(500, { message: "Erro interno do servidor." }),
      false,
    );
    expect(failures.length).toBe(1);
  });

  it("getPageLoadErrorPresentation suppresses duplicate load errors", () => {
    expect(getPageLoadErrorPresentation(inactiveOpFailure, false)).toEqual({
      message: null,
      retryable: false,
    });
    const serverFailure = getApiError(
      httpError(500, { message: "Erro interno do servidor." }),
    );
    expect(getPageLoadErrorPresentation(serverFailure, false)).toEqual({
      message: "Erro interno do servidor.",
      retryable: true,
    });
  });

  it("formatRelatedFailuresMessage returns null when all failures were filtered", () => {
    expect(
      formatRelatedFailuresMessage([], "Prefixo."),
    ).toBeNull();
  });
});

describe("default session expiry message", () => {
  it("is a friendly, non-technical message", () => {
    expect(DEFAULT_SESSION_EXPIRY_MESSAGE.length).toBeGreaterThan(0);
    expect(DEFAULT_SESSION_EXPIRY_MESSAGE).toContain("sessão");
    expect(DEFAULT_SESSION_EXPIRY_MESSAGE).toMatch(/[a-zçãáéíóú]/i);
    // Não deve vazar detalhes internos de segurança.
    expect(DEFAULT_SESSION_EXPIRY_MESSAGE.toLowerCase()).not.toContain("jwt");
    expect(DEFAULT_SESSION_EXPIRY_MESSAGE.toLowerCase()).not.toContain("refresh");
    expect(DEFAULT_SESSION_EXPIRY_MESSAGE.toLowerCase()).not.toContain("token");
  });
});