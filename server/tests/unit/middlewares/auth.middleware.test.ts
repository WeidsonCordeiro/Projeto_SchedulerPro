import { describe, expect, it, vi } from "vitest";

const { jwtProvider } = vi.hoisted(() => ({ jwtProvider: { verifyAccessToken: vi.fn() } }));
vi.mock("../../../src/providers/security/JwtProvider", () => ({ default: jwtProvider }));

import AuthMiddleware from "../../../src/middlewares/auth.middleware";
import { AppError } from "../../../src/errors/AppError";

describe("AuthMiddleware", () => {
  it("rejeita cookie ausente", () => {
    const next = vi.fn();
    expect(() => AuthMiddleware.authenticate({ cookies: {} } as never, {} as never, next)).toThrow(AppError);
    expect(next).not.toHaveBeenCalled();
  });

  it("valida token e preenche req.user", () => {
    const next = vi.fn();
    jwtProvider.verifyAccessToken.mockReturnValue({ userId: "u1", companyId: "c1", role: "ADMIN" });
    const req = { cookies: { accessToken: "token" } } as never;
    AuthMiddleware.authenticate(req, {} as never, next);
    expect(jwtProvider.verifyAccessToken).toHaveBeenCalledWith("token");
    expect(req.user).toEqual({ userId: "u1", companyId: "c1", role: "ADMIN" });
    expect(next).toHaveBeenCalledOnce();
  });

  it("propaga token inválido e não chama next", () => {
    const next = vi.fn();
    jwtProvider.verifyAccessToken.mockImplementation(() => { throw new AppError("invalid", 401); });
    expect(() => AuthMiddleware.authenticate({ cookies: { accessToken: "bad" } } as never, {} as never, next)).toThrow(AppError);
    expect(next).not.toHaveBeenCalled();
  });
});
