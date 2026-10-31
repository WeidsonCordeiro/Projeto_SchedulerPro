/**
 * Vitest global setup — runs before test modules are loaded.
 * Values are test-only; never use production secrets or Atlas URIs here.
 *
 * validateEnv() in src/config/env.ts runs on first import of application modules.
 * CI has no server/.env, so every REQUIRED_ENV_VARIABLES entry must be set here.
 */

const TEST_MONGO_URI =
  "mongodb://127.0.0.1:27017/schedulerpro_vitest_env_placeholder";

function setTestEnv(name: string, value: string): void {
  if (!process.env[name]?.trim()) {
    process.env[name] = value;
  }
}

setTestEnv("MONGO_URI", TEST_MONGO_URI);
setTestEnv("JWT_SECRET", "vitest-jwt-secret-min-32-chars-schedulerpro");
setTestEnv("REFRESH_SECRET", "vitest-refresh-secret-min-32-chars-scheduler");

setTestEnv(
  "PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_KEYS",
  '{"v1":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="}',
);
setTestEnv("PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_ACTIVE_VERSION", "v1");

/** Resend SDK rejects empty API key at provider singleton construction. */
setTestEnv("RESEND_API_KEY", "re_vitest_schedulerpro_ci_placeholder_key");
