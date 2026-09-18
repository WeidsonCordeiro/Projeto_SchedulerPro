import { afterEach, describe, expect, it, vi } from "vitest";
import { AxiosError } from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { apiClient } from "./apiClient";
import { store } from "../store";
import { clearCompany, setCompany } from "../store/slices/companySlice";
import { clearCredentials, setCredentials } from "../store/slices/authSlice";
import { clientUser, session } from "../test/fixtures";
import type { AuthSession } from "../types/auth";

afterEach(() => {
  vi.unstubAllEnvs();
  apiClient.defaults.adapter = undefined;
  store.dispatch(clearCredentials());
  store.dispatch(clearCompany());
});

// ---------------------------------------------------------------------------
// Helpers do "adapter" (backend simulado)
// ---------------------------------------------------------------------------

function ok(
  config: InternalAxiosRequestConfig,
  data: unknown,
  status = 200,
): AxiosResponse {
  return {
    data,
    status,
    statusText: status >= 400 ? "Error" : "OK",
    headers: {},
    config,
  };
}

function ko(
  config: InternalAxiosRequestConfig,
  status: number,
  message = "erro",
): Promise<AxiosResponse> {
  return Promise.reject(
    new AxiosError(
      `Request failed with status code ${status}`,
      AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      {
        data: { success: false, message },
        status,
        statusText: message,
        headers: {},
        config,
      },
    ),
  );
}

function useAdapter(
  handler: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>,
) {
  apiClient.defaults.adapter = async (config) => handler(config);
}

function seedAuthenticated(s: AuthSession = session) {
  store.dispatch(setCredentials(s));
}

function seedCompany() {
  store.dispatch(
    setCompany({
      id: "507f1f77bcf86cd799439012",
      name: "salao do centro",
      timezone: "Europe/Lisbon",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }),
  );
}

function expectLoggedOut() {
  const auth = store.getState().auth;
  expect(auth.user).toBeNull();
  expect(auth.isAuthenticated).toBe(false);
  expect(auth.mustChangePassword).toBe(false);
  expect(store.getState().company.company).toBeNull();
}

describe("apiClient", () => {
  it("uses the configured baseURL", async () => {
    vi.stubEnv("VITE_API_URL", "http://localhost:3000/api");
    vi.resetModules();

    const { apiClient } = await import("./apiClient");

    expect(apiClient.defaults.baseURL).toBe("http://localhost:3000/api");
  });

  it("sends credentials with every request", async () => {
    vi.resetModules();

    const { apiClient } = await import("./apiClient");

    expect(apiClient.defaults.withCredentials).toBe(true);
  });
});

describe("apiClient session interceptor", () => {
  it("Caso 1 - keeps the session when a protected request succeeds", async () => {
    seedAuthenticated();
    let refreshCalls = 0;

    useAdapter(async (config) => {
      if (config.url === "/auth/refresh") {
        refreshCalls += 1;
      }
      return ok(config, { success: true, message: "ok", data: [] });
    });

    const res = await apiClient.get("/appointments");

    expect(res.status).toBe(200);
    expect(refreshCalls).toBe(0);
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });

  it("Caso 2 - refreshes and retries the original request when the access token expires", async () => {
    seedAuthenticated();
    let refreshCalls = 0;
    const attemptedConfigs: string[] = [];

    useAdapter(async (config) => {
      if (config.url === "/auth/refresh") {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return ok(config, { success: true, message: "ok", data: session });
      }
      if (config.url === "/appointments") {
        attemptedConfigs.push(String((config as { _retry?: boolean })._retry));
        if (attemptedConfigs.length === 1) {
          return ko(config, 401);
        }
        return ok(config, { success: true, message: "ok", data: [] });
      }
      return ok(config, { success: true, message: "ok", data: null });
    });

    const res = await apiClient.get<{ success: boolean; data: unknown[] }>(
      "/appointments",
    );

    expect(res.data.data).toEqual([]);
    expect(refreshCalls).toBe(1);
    expect(attemptedConfigs).toEqual(["undefined", "true"]);
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });

  it("Caso 3 - clears the session and logs out when the refresh token is expired/invalid", async () => {
    seedAuthenticated();
    seedCompany();
    let refreshCalls = 0;

    useAdapter(async (config) => {
      if (config.url === "/auth/refresh") {
        refreshCalls += 1;
        return ko(config, 401);
      }
      if (config.url === "/appointments") {
        return ko(config, 401);
      }
      return ok(config, { success: true, message: "ok", data: null });
    });

    await expect(apiClient.get("/appointments")).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(refreshCalls).toBe(1);
    expectLoggedOut();
  });

  it("Caso 4 - shares a single refresh between simultaneous 401s and retries all", async () => {
    seedAuthenticated();
    let refreshCalls = 0;
    const counters: Record<string, number> = {};

    useAdapter(async (config) => {
      if (config.url === "/auth/refresh") {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return ok(config, { success: true, message: "ok", data: session });
      }
      if (config.url?.startsWith("/protected")) {
        counters[config.url] = (counters[config.url] ?? 0) + 1;
        return counters[config.url] === 1
          ? ko(config, 401)
          : ok(config, { success: true, message: "ok", data: { path: config.url } });
      }
      return ok(config, { success: true, message: "ok", data: null });
    });

    const results = await Promise.all([
      apiClient.get<{ data: { path: string } }>("/protected/a"),
      apiClient.get<{ data: { path: string } }>("/protected/b"),
      apiClient.get<{ data: { path: string } }>("/protected/c"),
    ]);

    expect(results.map((r) => r.data.data.path)).toEqual([
      "/protected/a",
      "/protected/b",
      "/protected/c",
    ]);
    expect(refreshCalls).toBe(1);
    expect(counters["/protected/a"]).toBe(2);
    expect(counters["/protected/b"]).toBe(2);
    expect(counters["/protected/c"]).toBe(2);
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });

  it("Caso 5 - ends the session for all pending requests when the shared refresh fails", async () => {
    seedAuthenticated();
    seedCompany();
    let refreshCalls = 0;

    useAdapter(async (config) => {
      if (config.url === "/auth/refresh") {
        refreshCalls += 1;
        return ko(config, 401);
      }
      if (config.url?.startsWith("/protected")) {
        return ko(config, 401);
      }
      return ok(config, { success: true, message: "ok", data: null });
    });

    const results = await Promise.allSettled([
      apiClient.get("/protected/a"),
      apiClient.get("/protected/b"),
      apiClient.get("/protected/c"),
    ]);

    expect(results.every((r) => r.status === "rejected")).toBe(true);
    expect(refreshCalls).toBe(1);
    expectLoggedOut();
  });

  it("Caso 6 - does not log out or refresh on a 403", async () => {
    seedAuthenticated();
    let refreshCalls = 0;

    useAdapter(async (config) => {
      if (config.url === "/auth/refresh") {
        refreshCalls += 1;
        return ok(config, { success: true, message: "ok", data: session });
      }
      if (config.url === "/clients") {
        return ko(config, 403, "Acesso negado");
      }
      return ok(config, { success: true, message: "ok", data: null });
    });

    await expect(apiClient.get("/clients")).rejects.toMatchObject({
      response: { status: 403 },
    });

    expect(refreshCalls).toBe(0);
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });

  it("Caso 7 - does not refresh or log out on expected errors from public endpoints", async () => {
    seedAuthenticated();
    let refreshCalls = 0;

    useAdapter(async (config) => {
      if (config.url === "/auth/refresh") {
        refreshCalls += 1;
        return ok(config, { success: true, message: "ok", data: session });
      }
      if (config.url === "/auth/login") {
        return ko(config, 401, "Credenciais inválidas.");
      }
      if (config.url === "/auth/verify-email") {
        return ko(config, 401, "Token inválido.");
      }
      if (config.url === "/auth/register") {
        return ko(config, 400, "Dados inválidos.");
      }
      return ok(config, { success: true, message: "ok", data: null });
    });

    await expect(
      apiClient.post("/auth/login", { email: "x", password: "y" }),
    ).rejects.toMatchObject({ response: { status: 401 } });
    await expect(apiClient.get("/auth/verify-email")).rejects.toMatchObject({
      response: { status: 401 },
    });
    await expect(
      apiClient.post("/auth/register", { name: "A" }),
    ).rejects.toMatchObject({ response: { status: 400 } });

    expect(refreshCalls).toBe(0);
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });

  it("Caso 8 - keeps manual logout working without interference or loops", async () => {
    seedAuthenticated();
    let refreshCalls = 0;
    let logoutCalls = 0;

    useAdapter(async (config) => {
      if (config.url === "/auth/refresh") {
        refreshCalls += 1;
        return ok(config, { success: true, message: "ok", data: session });
      }
      if (config.url === "/auth/logout") {
        logoutCalls += 1;
        return ok(config, { success: true, message: "ok", data: null });
      }
      return ok(config, { success: true, message: "ok", data: null });
    });

    const res = await apiClient.post("/auth/logout");

    expect(res.status).toBe(200);
    expect(logoutCalls).toBe(1);
    expect(refreshCalls).toBe(0);
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });

  it("Caso 8b - a 401 from manual logout does not refresh or auto-logout", async () => {
    seedAuthenticated();
    let refreshCalls = 0;

    useAdapter(async (config) => {
      if (config.url === "/auth/refresh") {
        refreshCalls += 1;
        return ok(config, { success: true, message: "ok", data: session });
      }
      if (config.url === "/auth/logout") {
        return ko(config, 401);
      }
      return ok(config, { success: true, message: "ok", data: null });
    });

    await expect(apiClient.post("/auth/logout")).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(refreshCalls).toBe(0);
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });

  it("Caso 9 - removes the user and clears the auth state after a definitive expiry", async () => {
    seedAuthenticated();
    seedCompany();
    store.dispatch(setCredentials({ ...session, mustChangePassword: true }));

    useAdapter(async (config) => {
      if (config.url === "/auth/refresh") {
        return ko(config, 401);
      }
      if (config.url === "/appointments") {
        return ko(config, 401);
      }
      return ok(config, { success: true, message: "ok", data: null });
    });

    await expect(apiClient.get("/appointments")).rejects.toMatchObject({
      response: { status: 401 },
    });

    expectLoggedOut();
  });

  it("Caso 10 - logs out a CLIENT after a definitive session expiry", async () => {
    seedAuthenticated({
      ...clientUser,
      clientId: "507f1f77bcf86cd799439098",
      mustChangePassword: false,
    });
    let refreshCalls = 0;

    useAdapter(async (config) => {
      if (config.url === "/auth/refresh") {
        refreshCalls += 1;
        return ko(config, 401);
      }
      if (config.url === "/appointments") {
        return ko(config, 401);
      }
      return ok(config, { success: true, message: "ok", data: null });
    });

    await expect(apiClient.get("/appointments")).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(refreshCalls).toBe(1);
    expectLoggedOut();
  });

  it("anti-loop - a retried request that still 401s is not retried again", async () => {
    seedAuthenticated();
    let refreshCalls = 0;

    useAdapter(async (config) => {
      if (config.url === "/auth/refresh") {
        refreshCalls += 1;
        return ok(config, { success: true, message: "ok", data: session });
      }
      if (config.url === "/appointments") {
        return ko(config, 401);
      }
      return ok(config, { success: true, message: "ok", data: null });
    });

    await expect(apiClient.get("/appointments")).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(refreshCalls).toBe(1);
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });

  it("does not log out on a transient refresh failure (network/5xx)", async () => {
    seedAuthenticated();

    useAdapter(async (config) => {
      if (config.url === "/auth/refresh") {
        return ko(config, 500, "Erro interno.");
      }
      if (config.url === "/appointments") {
        return ko(config, 401);
      }
      return ok(config, { success: true, message: "ok", data: null });
    });

    await expect(apiClient.get("/appointments")).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(store.getState().auth.isAuthenticated).toBe(true);
  });

  it("re-establishes the session in Redux with the refreshed user data", async () => {
    seedAuthenticated();
    const refreshedSession: AuthSession = {
      ...session,
      name: "Owner Renovado",
      mustChangePassword: false,
    };
    let appointmentsCalls = 0;

    useAdapter(async (config) => {
      if (config.url === "/auth/refresh") {
        return ok(config, { success: true, message: "ok", data: refreshedSession });
      }
      if (config.url === "/appointments") {
        appointmentsCalls += 1;
        return appointmentsCalls === 1
          ? ko(config, 401)
          : ok(config, { success: true, message: "ok", data: [] });
      }
      return ok(config, { success: true, message: "ok", data: null });
    });

    await apiClient.get("/appointments");

    expect(store.getState().auth.user?.name).toBe("Owner Renovado");
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });
});