import { beforeEach, describe, expect, it, vi } from "vitest";

const { jwtProvider, userRepository } = vi.hoisted(() => ({
  jwtProvider: { verifyAccessToken: vi.fn() },
  userRepository: { findByIdForAccessControl: vi.fn() },
}));

vi.mock("../../../src/providers/security/JwtProvider", () => ({ default: jwtProvider }));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({ default: userRepository }));

import AuthMiddleware from "../../../src/middlewares/auth.middleware";
import { AppError } from "../../../src/errors/AppError";

const activeUser = {
  _id: { toString: () => "db-user" },
  companyId: { toString: () => "db-company" },
  role: "MANAGER",
  isActive: true,
  lockUntil: null,
};

describe("AuthMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userRepository.findByIdForAccessControl.mockResolvedValue(activeUser);
  });

  it("rejeita cookie ausente", async () => {
    const next = vi.fn();
    await expect(AuthMiddleware.authenticate({ cookies: {} } as never, {} as never, next)).rejects.toThrow(AppError);
    expect(next).not.toHaveBeenCalled();
  });

  it("valida token e reconstrói req.user com dados atuais do banco", async () => {
    const next = vi.fn();
    jwtProvider.verifyAccessToken.mockReturnValue({ userId: "u1", companyId: "forged-company", role: "OWNER", type: "access" });
    const req = { cookies: { accessToken: "token" } } as never;
    await AuthMiddleware.authenticate(req, {} as never, next);
    expect(jwtProvider.verifyAccessToken).toHaveBeenCalledWith("token");
    expect(userRepository.findByIdForAccessControl).toHaveBeenCalledWith("u1");
    expect(req.user).toEqual({ userId: "db-user", companyId: "db-company", role: "MANAGER" });
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejeita token com tipo incorreto", async () => {
    const next = vi.fn();
    jwtProvider.verifyAccessToken.mockReturnValue({ userId: "u1", companyId: "c1", role: "ADMIN", type: "refresh" });
    await expect(AuthMiddleware.authenticate({ cookies: { accessToken: "bad" } } as never, {} as never, next)).rejects.toMatchObject({ statusCode: 401 });
    expect(userRepository.findByIdForAccessControl).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ["inexistente/soft-deleted", null, 401],
    ["inativo", { ...activeUser, isActive: false }, 403],
    ["bloqueado", { ...activeUser, lockUntil: new Date(Date.now() + 60_000) }, 403],
  ])("rejeita usuário %s mesmo com token assinado", async (_label, user, statusCode) => {
    userRepository.findByIdForAccessControl.mockResolvedValue(user);
    jwtProvider.verifyAccessToken.mockReturnValue({ userId: "u1", companyId: "c1", role: "ADMIN", type: "access" });
    const next = vi.fn();
    await expect(AuthMiddleware.authenticate({ cookies: { accessToken: "token" } } as never, {} as never, next)).rejects.toMatchObject({ statusCode });
    expect(next).not.toHaveBeenCalled();
  });

  it("propaga token criptograficamente inválido e não chama next", async () => {
    const next = vi.fn();
    jwtProvider.verifyAccessToken.mockImplementation(() => { throw new AppError("invalid", 401); });
    await expect(AuthMiddleware.authenticate({ cookies: { accessToken: "bad" } } as never, {} as never, next)).rejects.toThrow(AppError);
    expect(next).not.toHaveBeenCalled();
  });
});
