import { beforeEach, describe, expect, it, vi } from "vitest";

const { jwtProvider, userRepository, sessionService } = vi.hoisted(() => ({
  jwtProvider: { verifyAccessToken: vi.fn() },
  userRepository: { findByIdForAccessControl: vi.fn() },
  sessionService: { start: vi.fn(), validate: vi.fn(), touch: vi.fn(), revoke: vi.fn() },
}));

vi.mock("../../../src/providers/security/JwtProvider", () => ({ default: jwtProvider }));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({ default: userRepository }));
vi.mock("../../../src/modules/auth/services/SessionService", () => ({ default: sessionService }));

import AuthMiddleware from "../../../src/middlewares/auth.middleware";
import { AppError } from "../../../src/errors/AppError";

const activeUser = {
  _id: { toString: () => "db-user" },
  companyId: { toString: () => "db-company" },
  role: "MANAGER",
  isActive: true,
  lockUntil: null,
  emailVerified: true,
};

describe("AuthMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userRepository.findByIdForAccessControl.mockResolvedValue(activeUser);
    sessionService.validate.mockResolvedValue({});
    sessionService.touch.mockResolvedValue(undefined);
  });

  it("rejeita cookie ausente", async () => {
    const next = vi.fn();
    await expect(AuthMiddleware.authenticate({ cookies: {} } as never, {} as never, next)).rejects.toThrow(AppError);
    expect(next).not.toHaveBeenCalled();
  });

  it("valida token e reconstrói req.user com dados atuais do banco", async () => {
    const next = vi.fn();
    jwtProvider.verifyAccessToken.mockReturnValue({ userId: "u1", companyId: "forged-company", role: "OWNER", type: "access", sessionId: "sid" });
    const req = { cookies: { accessToken: "token" } } as never;
    await AuthMiddleware.authenticate(req, {} as never, next);
    expect(jwtProvider.verifyAccessToken).toHaveBeenCalledWith("token");
    expect(userRepository.findByIdForAccessControl).toHaveBeenCalledWith("u1");
    expect(req.user).toEqual({ userId: "db-user", companyId: "db-company", role: "MANAGER", sessionId: "sid" });
    expect(next).toHaveBeenCalledOnce();
  });

  it("inclui clientId em req.user quando o usuário é vinculado a um cliente", async () => {
    const next = vi.fn();
    userRepository.findByIdForAccessControl.mockResolvedValue({
      ...activeUser,
      role: "CLIENT",
      clientId: { toString: () => "db-client" },
    });
    jwtProvider.verifyAccessToken.mockReturnValue({ userId: "u1", companyId: "c1", role: "CLIENT", type: "access", sessionId: "sid" });
    const req = { cookies: { accessToken: "token" } } as never;
    await AuthMiddleware.authenticate(req, {} as never, next);
    expect(req.user).toEqual({ userId: "db-user", companyId: "db-company", role: "CLIENT", clientId: "db-client", sessionId: "sid" });
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
    ["não verificado", { ...activeUser, emailVerified: false }, 403],
    ["CLIENT sem clientId (fail closed)", { ...activeUser, role: "CLIENT", emailVerified: true }, 403],
    ["CLIENT com clientId (permitido)", { ...activeUser, role: "CLIENT", clientId: { toString: () => "db-client" }, emailVerified: true }, 200],
  ])("valida usuário %s mesmo com token assinado", async (_label, user, expectedStatus) => {
    userRepository.findByIdForAccessControl.mockResolvedValue(user);
    jwtProvider.verifyAccessToken.mockReturnValue({ userId: "u1", companyId: "c1", role: "ADMIN", type: "access", sessionId: "sid" });
    const next = vi.fn();
    if (expectedStatus === 200) {
      const req = { cookies: { accessToken: "token" } } as never;
      await AuthMiddleware.authenticate(req, {} as never, next);
      expect(next).toHaveBeenCalledOnce();
    } else {
      await expect(AuthMiddleware.authenticate({ cookies: { accessToken: "token" } } as never, {} as never, next)).rejects.toMatchObject({ statusCode: expectedStatus });
      expect(next).not.toHaveBeenCalled();
    }
  });

  it("propaga token criptograficamente inválido e não chama next", async () => {
    const next = vi.fn();
    jwtProvider.verifyAccessToken.mockImplementation(() => { throw new AppError("invalid", 401); });
    await expect(AuthMiddleware.authenticate({ cookies: { accessToken: "bad" } } as never, {} as never, next)).rejects.toThrow(AppError);
    expect(next).not.toHaveBeenCalled();
  });

  it("valida a sessão e atualiza a última atividade em requisição válida", async () => {
    const next = vi.fn();
    jwtProvider.verifyAccessToken.mockReturnValue({ userId: "u1", companyId: "c1", role: "OWNER", type: "access", sessionId: "sid" });
    const req = { cookies: { accessToken: "token" } } as never;
    await AuthMiddleware.authenticate(req, {} as never, next);
    expect(sessionService.validate).toHaveBeenCalledWith("sid", "u1");
    expect(sessionService.touch).toHaveBeenCalledWith("sid");
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejeita token de acesso sem sessionId (INVALID_SESSION)", async () => {
    const next = vi.fn();
    jwtProvider.verifyAccessToken.mockReturnValue({ userId: "u1", companyId: "c1", role: "OWNER", type: "access" });
    await expect(AuthMiddleware.authenticate({ cookies: { accessToken: "token" } } as never, {} as never, next)).rejects.toMatchObject({ statusCode: 401, code: "INVALID_SESSION" });
    expect(sessionService.validate).not.toHaveBeenCalled();
    expect(userRepository.findByIdForAccessControl).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("não atualiza lastActivityAt quando a sessão está expirada", async () => {
    const next = vi.fn();
    jwtProvider.verifyAccessToken.mockReturnValue({ userId: "u1", companyId: "c1", role: "OWNER", type: "access", sessionId: "sid" });
    sessionService.validate.mockRejectedValue(new AppError("Sessão expirada.", 401, undefined, "SESSION_IDLE_TIMEOUT"));
    await expect(AuthMiddleware.authenticate({ cookies: { accessToken: "token" } } as never, {} as never, next)).rejects.toMatchObject({ statusCode: 401, code: "SESSION_IDLE_TIMEOUT" });
    expect(sessionService.touch).not.toHaveBeenCalled();
    expect(userRepository.findByIdForAccessControl).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
