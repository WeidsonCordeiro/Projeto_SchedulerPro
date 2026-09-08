import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

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