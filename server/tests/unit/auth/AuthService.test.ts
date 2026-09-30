import { beforeEach, describe, expect, it, vi } from "vitest";

const { userRepository, companyRepository, passwordProvider, jwtProvider, passwordResetRepository, resendProvider, session, authMapper, sessionService, logger } = vi.hoisted(() => ({
  userRepository: { existsByEmail: vi.fn(), findByEmail: vi.fn(), findById: vi.fn(), create: vi.fn(), verifyEmail: vi.fn() },
  companyRepository: { findByName: vi.fn(), create: vi.fn() },
  passwordProvider: { compare: vi.fn(), hash: vi.fn() },
  jwtProvider: { generateAccessToken: vi.fn(), generateRefreshToken: vi.fn(), verifyRefreshToken: vi.fn(), generateResetPasswordToken: vi.fn(), verifyResetPasswordToken: vi.fn(), generateEmailVerificationToken: vi.fn(), verifyEmailVerificationToken: vi.fn() },
  passwordResetRepository: { create: vi.fn(), findByToken: vi.fn(), invalidate: vi.fn() },
  resendProvider: { send: vi.fn() },
  session: { startTransaction: vi.fn(), commitTransaction: vi.fn(), abortTransaction: vi.fn(), endSession: vi.fn() },
  authMapper: { toAuthUser: vi.fn((user: any) => ({ id: user.id, email: user.email, role: user.role, companyId: user.companyId.toString(), isActive: user.isActive })) },
  sessionService: { start: vi.fn(), validate: vi.fn(), touch: vi.fn(), revoke: vi.fn() },
  logger: { auth: vi.fn(), security: vi.fn(), error: vi.fn() },
}));

vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({ default: userRepository }));
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({ default: companyRepository }));
vi.mock("../../../src/providers/security/PasswordProvider", () => ({ default: passwordProvider }));
vi.mock("../../../src/providers/security/JwtProvider", () => ({ default: jwtProvider }));
vi.mock("../../../src/modules/auth/repositories/PasswordResetRepository", () => ({ default: passwordResetRepository }));
vi.mock("../../../src/providers/mail/ResendProvider", () => ({ default: resendProvider }));
vi.mock("../../../src/modules/auth/services/SessionService", () => ({ default: sessionService }));
vi.mock("../../../src/modules/auth/mapper/AuthMapper", () => ({ default: authMapper }));
vi.mock("../../../src/providers/mail/templates/welcome.template", () => ({ welcomeTemplate: vi.fn(() => "welcome-html") }));
vi.mock("../../../src/providers/mail/templates/reset-password.template", () => ({ resetPasswordTemplate: vi.fn(() => "reset-html") }));
vi.mock("../../../src/providers/logger", () => ({ default: logger }));
vi.mock("../../../src/config/env", () => ({ env: { frontend: { FRONTEND_URL: "http://localhost" } } }));
vi.mock("mongoose", () => ({ default: { startSession: vi.fn().mockResolvedValue(session) } }));

import AuthService from "../../../src/modules/auth/services/AuthService";
import { Role } from "../../../src/constants/roles";
import { TokenType } from "../../../src/constants/token-type";
import { HttpStatus } from "../../../src/constants/http-status";
import { ErrorCode } from "../../../src/constants/error-codes";
import { AppError } from "../../../src/errors/AppError";

const companyId = "507f1f77bcf86cd799439011";
const userId = "507f1f77bcf86cd799439012";
const sessionId = "507f1f77bcf86cd799439099";
const company = { _id: { toString: () => companyId }, name: "Empresa", timezone: "Europe/Lisbon" };
const makeUser = (extra = {}) => ({
  _id: { toString: () => userId }, id: userId, name: "User", email: "user@example.com",
  passwordHash: "stored-hash", companyId: { toString: () => companyId }, role: Role.OWNER,
  isActive: true, emailVerified: true, mustChangePassword: false, failedLoginAttempts: 2,
  lockUntil: null, save: vi.fn().mockResolvedValue(undefined), ...extra,
});
const registerDto = { name: "Owner", email: "owner@example.com", password: "password123", confirmPassword: "password123", company: { name: "Empresa Nova" } };

beforeEach(() => {
  vi.clearAllMocks();
  companyRepository.findByName.mockResolvedValue(null);
  companyRepository.create.mockResolvedValue(company);
  userRepository.existsByEmail.mockResolvedValue(false);
  userRepository.findByEmail.mockResolvedValue(makeUser());
  userRepository.findById.mockResolvedValue(makeUser());
  userRepository.create.mockResolvedValue(makeUser({ email: registerDto.email }));
  passwordProvider.compare.mockResolvedValue(true);
  passwordProvider.hash.mockResolvedValue("new-hash");
  jwtProvider.generateAccessToken.mockReturnValue("access-token");
  jwtProvider.generateRefreshToken.mockReturnValue("refresh-token");
  jwtProvider.generateEmailVerificationToken.mockReturnValue("email-token");
  jwtProvider.generateResetPasswordToken.mockReturnValue("reset-token");
  jwtProvider.verifyRefreshToken.mockReturnValue({ userId, companyId, role: Role.OWNER, type: TokenType.REFRESH, sessionId });
  jwtProvider.verifyResetPasswordToken.mockReturnValue({ userId });
  jwtProvider.verifyEmailVerificationToken.mockReturnValue({ userId, type: TokenType.EMAIL_VERIFICATION });
  passwordResetRepository.findByToken.mockResolvedValue({ usedAt: null, expiresAt: new Date(Date.now() + 60_000) });
  resendProvider.send.mockResolvedValue(undefined);
  sessionService.start.mockResolvedValue({ _id: { toString: () => sessionId } });
  sessionService.validate.mockResolvedValue({ _id: { toString: () => sessionId } });
  sessionService.touch.mockResolvedValue(undefined);
  sessionService.revoke.mockResolvedValue(undefined);
});

describe("AuthService.register", () => {
  it("cria company e owner na mesma sessão, usa timezone padrão e autentica", async () => {
    const result = await AuthService.register(registerDto);
    expect(companyRepository.create).toHaveBeenCalledWith({ name: "Empresa Nova", timezone: "Europe/Lisbon" }, session);
    expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({ role: Role.OWNER, mustChangePassword: false }), session);
    expect(session.commitTransaction).toHaveBeenCalledOnce();
    expect(resendProvider.send).toHaveBeenCalled();
    expect(result.tokens).toEqual({ accessToken: "access-token", refreshToken: "refresh-token" });
  });

  it("rejeita senha divergente, email/empresa duplicados e timezone inválido", async () => {
    await expect(AuthService.register({ ...registerDto, confirmPassword: "different" })).rejects.toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });
    expect(userRepository.existsByEmail).not.toHaveBeenCalled();
    userRepository.existsByEmail.mockResolvedValue(true);
    await expect(AuthService.register(registerDto)).rejects.toMatchObject({ statusCode: HttpStatus.CONFLICT });
    userRepository.existsByEmail.mockResolvedValue(false);
    companyRepository.findByName.mockResolvedValue(company);
    await expect(AuthService.register(registerDto)).rejects.toMatchObject({ statusCode: HttpStatus.CONFLICT });
    await expect(AuthService.register({ ...registerDto, company: { name: "Nova", timezone: "Invalid/Zone" } })).rejects.toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });
  });

  it("aborta a transação quando criação falha e não envia welcome", async () => {
    const error = new Error("create failed");
    userRepository.create.mockRejectedValue(error);
    await expect(AuthService.register(registerDto)).rejects.toBe(error);
    expect(session.abortTransaction).toHaveBeenCalledOnce();
    expect(session.endSession).toHaveBeenCalledOnce();
    expect(resendProvider.send).not.toHaveBeenCalled();
  });
});

describe("AuthService.login e refresh", () => {
  it("faz login válido, gera ambos tokens e atualiza login", async () => {
    const user = makeUser();
    userRepository.findByEmail.mockResolvedValue(user);
    const result = await AuthService.login({ email: user.email, password: "password123" });
    expect(passwordProvider.compare).toHaveBeenCalledWith("password123", "stored-hash");
    expect(jwtProvider.generateAccessToken).toHaveBeenCalledWith(expect.objectContaining({ userId, companyId, type: TokenType.ACCESS }));
    expect(jwtProvider.generateRefreshToken).toHaveBeenCalledWith(expect.objectContaining({ userId, companyId, type: TokenType.REFRESH }));
    expect(sessionService.start).toHaveBeenCalledWith(userId);
    expect(jwtProvider.generateAccessToken).toHaveBeenCalledWith(expect.objectContaining({ sessionId }));
    expect(user.save).toHaveBeenCalledOnce();
    expect(result.tokens).toEqual({ accessToken: "access-token", refreshToken: "refresh-token" });
  });

  it("rejeita usuário inexistente, senha incorreta, inativo, bloqueado e não verificado", async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    await expect(AuthService.login({ email: "missing@example.com", password: "x" })).rejects.toMatchObject({ statusCode: HttpStatus.UNAUTHORIZED });
    userRepository.findByEmail.mockResolvedValue(makeUser());
    passwordProvider.compare.mockResolvedValue(false);
    await expect(AuthService.login({ email: "user@example.com", password: "wrong" })).rejects.toMatchObject({ statusCode: HttpStatus.UNAUTHORIZED });
    passwordProvider.compare.mockResolvedValue(true);
    for (const extra of [{ isActive: false }, { lockUntil: new Date(Date.now() + 60_000) }, { emailVerified: false }]) {
      userRepository.findByEmail.mockResolvedValue(makeUser(extra));
      await expect(AuthService.login({ email: "user@example.com", password: "password123" })).rejects.toMatchObject({ statusCode: HttpStatus.FORBIDDEN });
    }
    userRepository.findByEmail.mockResolvedValue(null); // soft-deleted users are hidden by repository
    await expect(AuthService.login({ email: "deleted@example.com", password: "password123" })).rejects.toMatchObject({ statusCode: HttpStatus.UNAUTHORIZED });
  });

  it("renova token válido reutilizando a mesma sessão", async () => {
    await expect(AuthService.refresh("refresh-token")).resolves.toMatchObject({ tokens: { accessToken: "access-token" } });
    expect(sessionService.validate).toHaveBeenCalledWith(sessionId, userId);
    expect(sessionService.start).not.toHaveBeenCalled();
    expect(sessionService.touch).not.toHaveBeenCalled();
    expect(jwtProvider.generateAccessToken).toHaveBeenCalledWith(expect.objectContaining({ sessionId }));
  });

  it("rejeita refresh sem sessão no payload", async () => {
    jwtProvider.verifyRefreshToken.mockReturnValue({ userId, companyId, role: Role.OWNER, type: TokenType.REFRESH });
    await expect(AuthService.refresh("refresh-token")).rejects.toMatchObject({ statusCode: HttpStatus.UNAUTHORIZED, code: ErrorCode.INVALID_SESSION });
    expect(sessionService.validate).not.toHaveBeenCalled();
  });

  it("rejeita refresh com sessão expirada/revogada", async () => {
    sessionService.validate.mockRejectedValue(new AppError("Sessão inválida.", HttpStatus.UNAUTHORIZED, undefined, ErrorCode.INVALID_SESSION));
    await expect(AuthService.refresh("refresh-token")).rejects.toMatchObject({ statusCode: HttpStatus.UNAUTHORIZED, code: ErrorCode.INVALID_SESSION });
  });

  it("múltiplos refreshes preservam a sessão absoluta original", async () => {
    await AuthService.refresh("refresh-token");
    await AuthService.refresh("refresh-token");
    await AuthService.refresh("refresh-token");
    expect(sessionService.start).not.toHaveBeenCalled();
    expect(sessionService.touch).not.toHaveBeenCalled();
    expect(sessionService.validate).toHaveBeenCalledTimes(3);
    expect(sessionService.validate).toHaveBeenNthCalledWith(1, sessionId, userId);
    expect(sessionService.validate).toHaveBeenNthCalledWith(3, sessionId, userId);
  });

  it("logout revoga a sessão e refresh posterior falha", async () => {
    await AuthService.logout(sessionId);
    expect(sessionService.revoke).toHaveBeenCalledWith(sessionId);
    sessionService.validate.mockRejectedValue(new AppError("Sessão inválida.", HttpStatus.UNAUTHORIZED, undefined, ErrorCode.INVALID_SESSION));
    await expect(AuthService.refresh("refresh-token")).rejects.toMatchObject({ code: ErrorCode.INVALID_SESSION });
  });

  it("rejeita usuário que deixou de existir ou token inválido", async () => {
    userRepository.findById.mockResolvedValue(null);
    await expect(AuthService.refresh("refresh-token")).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });
    jwtProvider.verifyRefreshToken.mockImplementation(() => { throw new Error("invalid token"); });
    await expect(AuthService.refresh("bad-token")).rejects.toThrow("invalid token");
  });
});

describe("AuthService.password e email verification", () => {
  it("não revela usuário inexistente no forgot password e envia email quando existe", async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    await expect(AuthService.forgotPassword("missing@example.com")).resolves.toBeUndefined();
    expect(passwordResetRepository.create).not.toHaveBeenCalled();
    userRepository.findByEmail.mockResolvedValue(makeUser());
    await AuthService.forgotPassword("user@example.com");
    expect(passwordResetRepository.create).toHaveBeenCalledWith(expect.objectContaining({ userId, token: "reset-token" }));
    expect(resendProvider.send).toHaveBeenCalled();
  });

  it("permite recuperação de senha de usuário CLIENT (Portal do Cliente)", async () => {
    const client = makeUser({
      role: Role.CLIENT,
      email: "cliente@example.com",
    });
    userRepository.findByEmail.mockResolvedValue(client);

    await AuthService.forgotPassword("cliente@example.com");

    expect(passwordResetRepository.create).toHaveBeenCalledTimes(1);
    expect(resendProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "cliente@example.com" }),
    );
  });

  it("mantém anti-enumeração e registra a falha do provider no log", async () => {
    userRepository.findByEmail.mockResolvedValue(makeUser());
    resendProvider.send.mockRejectedValue(
      new Error("Resend: from address not verified"),
    );

    await expect(AuthService.forgotPassword("user@example.com")).resolves.toBeUndefined();
    expect(passwordResetRepository.create).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Falha ao enviar e-mail de recuperação"),
      expect.objectContaining({ userId }),
    );
  });

  it("redefine senha válida, invalida o token e rejeita token ausente/expirado/usado", async () => {
    const user = makeUser({ mustChangePassword: true });
    userRepository.findById.mockResolvedValue(user);
    await AuthService.resetPassword("reset-token", "new-password");
    expect(passwordProvider.hash).toHaveBeenCalledWith("new-password");
    expect(user.mustChangePassword).toBe(false);
    expect(passwordResetRepository.invalidate).toHaveBeenCalledWith("reset-token");
    passwordResetRepository.findByToken.mockResolvedValue(null);
    await expect(AuthService.resetPassword("bad", "new-password")).rejects.toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });
    passwordResetRepository.findByToken.mockResolvedValue({ usedAt: new Date(), expiresAt: new Date(Date.now() + 60_000) });
    await expect(AuthService.resetPassword("used", "new-password")).rejects.toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });
    passwordResetRepository.findByToken.mockResolvedValue({ usedAt: null, expiresAt: new Date(Date.now() - 1) });
    await expect(AuthService.resetPassword("expired", "new-password")).rejects.toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });
  });

  it("verifica email, rejeita tipo inválido/usuário inexistente e é idempotente", async () => {
    userRepository.findById.mockResolvedValue(makeUser({ emailVerified: false }));
    await AuthService.verifyEmail("email-token");
    expect(userRepository.findById).toHaveBeenCalledWith(userId);
    expect(userRepository.verifyEmail).toHaveBeenCalledWith(userId);
    jwtProvider.verifyEmailVerificationToken.mockReturnValue({ userId, type: TokenType.ACCESS });
    await expect(AuthService.verifyEmail("wrong-type")).rejects.toMatchObject({ statusCode: HttpStatus.UNAUTHORIZED });
    jwtProvider.verifyEmailVerificationToken.mockReturnValue({ userId: "missing", type: TokenType.EMAIL_VERIFICATION });
    userRepository.findById.mockResolvedValue(null);
    await expect(AuthService.verifyEmail("missing-user")).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });
    jwtProvider.verifyEmailVerificationToken.mockReturnValue({ userId, type: TokenType.EMAIL_VERIFICATION });
    userRepository.findById.mockResolvedValue(makeUser({ emailVerified: true }));
    userRepository.verifyEmail.mockClear();
    await AuthService.verifyEmail("already-verified");
    expect(userRepository.verifyEmail).not.toHaveBeenCalled();
  });
});
