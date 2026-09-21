import { describe, expect, it } from "vitest";

import { TokenExpiration } from "../../../src/constants/token-expiration";
import { CookieConfig } from "../../../src/constants/cookie";
import { AuthConfig } from "../../../src/constants/auth";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const SEVEN_DAYS = 7 * 24 * HOUR;

describe("Token expiration policy (Stage 26.5)", () => {
  it("mantém o Access Token em 15 minutos", () => {
    expect(TokenExpiration.ACCESS_TOKEN).toBe(15 * MINUTE);
    expect(AuthConfig.ACCESS_TOKEN).toBe("15m");
    expect(CookieConfig.ACCESS_TOKEN_MAX_AGE).toBe(15 * MINUTE);
  });

  it("define o Refresh Token em 8 horas", () => {
    expect(TokenExpiration.REFRESH_TOKEN).toBe(8 * HOUR);
    expect(AuthConfig.REFRESH_TOKEN).toBe("8h");
    expect(CookieConfig.REFRESH_TOKEN_MAX_AGE).toBe(8 * HOUR);
  });

  it("mantém Reset Password em 15 minutos e Email Verification em 24 horas", () => {
    expect(TokenExpiration.RESET_PASSWORD_TOKEN).toBe(15 * MINUTE);
    expect(TokenExpiration.EMAIL_VERIFICATION_TOKEN).toBe(24 * HOUR);
  });

  it("não assume mais 7 dias para o Refresh Token", () => {
    expect(TokenExpiration.REFRESH_TOKEN).not.toBe(SEVEN_DAYS);
    expect(CookieConfig.REFRESH_TOKEN_MAX_AGE).not.toBe(SEVEN_DAYS);
    expect(AuthConfig.REFRESH_TOKEN).not.toBe("7d");
  });
});
