import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("config/env", () => {
  it("reads VITE_API_URL when defined", async () => {
    vi.stubEnv("VITE_API_URL", "http://localhost:3000/api");
    vi.resetModules();

    const { env } = await import("./env");

    expect(env.apiUrl).toBe("http://localhost:3000/api");
  });

  it("falls back to '/api' when VITE_API_URL is not defined", async () => {
    vi.stubEnv("VITE_API_URL", "");
    vi.resetModules();

    const { env } = await import("./env");

    expect(env.apiUrl).toBe("/api");
  });
});