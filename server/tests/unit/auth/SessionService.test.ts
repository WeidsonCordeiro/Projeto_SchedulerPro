import { beforeEach, describe, expect, it, vi } from "vitest";

const { sessionRepository } = vi.hoisted(() => ({
  sessionRepository: { create: vi.fn(), findById: vi.fn(), touch: vi.fn(), revoke: vi.fn() },
}));

vi.mock("../../../src/modules/auth/repositories/SessionRepository", () => ({ default: sessionRepository }));

import SessionService from "../../../src/modules/auth/services/SessionService";
import { SessionConfig } from "../../../src/constants/session";
import { ErrorCode } from "../../../src/constants/error-codes";
import { HttpStatus } from "../../../src/constants/http-status";

const userId = "507f1f77bcf86cd799439012";
const sessionId = "507f1f77bcf86cd799439099";
const HOUR = 60 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeSession = (overrides: Record<string, unknown> = {}): any => ({
  _id: { toString: () => sessionId },
  userId: { toString: () => userId },
  sessionStartedAt: new Date(),
  lastActivityAt: new Date(),
  revokedAt: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  sessionRepository.create.mockResolvedValue(makeSession());
  sessionRepository.findById.mockResolvedValue(makeSession());
  sessionRepository.touch.mockResolvedValue(undefined);
  sessionRepository.revoke.mockResolvedValue(undefined);
});

describe("SessionService.start", () => {
  it("cria uma sessão para o usuário", async () => {
    const result = await SessionService.start(userId);
    expect(sessionRepository.create).toHaveBeenCalledWith(userId);
    expect(result._id.toString()).toBe(sessionId);
  });
});

describe("SessionService.validate", () => {
  it("retorna a sessão válida", async () => {
    const session = await SessionService.validate(sessionId, userId);
    expect(session.userId.toString()).toBe(userId);
  });

  it("rejeita sessão inexistente, revogada e de outro usuário", async () => {
    sessionRepository.findById.mockResolvedValue(null);
    await expect(SessionService.validate(sessionId, userId)).rejects.toMatchObject({ statusCode: HttpStatus.UNAUTHORIZED, code: ErrorCode.INVALID_SESSION });
    sessionRepository.findById.mockResolvedValue(makeSession({ revokedAt: new Date() }));
    await expect(SessionService.validate(sessionId, userId)).rejects.toMatchObject({ code: ErrorCode.INVALID_SESSION });
    sessionRepository.findById.mockResolvedValue(makeSession({ userId: "other-user" }));
    await expect(SessionService.validate(sessionId, userId)).rejects.toMatchObject({ code: ErrorCode.INVALID_SESSION });
  });

  it("rejeita inatividade de 2h e aceita 1h59", async () => {
    sessionRepository.findById.mockResolvedValue(makeSession({ lastActivityAt: new Date(Date.now() - (SessionConfig.IDLE_TIMEOUT - 60_000)) }));
    await expect(SessionService.validate(sessionId, userId)).resolves.toBeDefined();
    sessionRepository.findById.mockResolvedValue(makeSession({ lastActivityAt: new Date(Date.now() - SessionConfig.IDLE_TIMEOUT) }));
    await expect(SessionService.validate(sessionId, userId)).rejects.toMatchObject({ code: ErrorCode.SESSION_IDLE_TIMEOUT, statusCode: HttpStatus.UNAUTHORIZED });
  });

  it("rejeita inatividade de 3h (idle)", async () => {
    sessionRepository.findById.mockResolvedValue(makeSession({ lastActivityAt: new Date(Date.now() - 3 * HOUR) }));
    await expect(SessionService.validate(sessionId, userId)).rejects.toMatchObject({ code: ErrorCode.SESSION_IDLE_TIMEOUT });
  });

  it("rejeita duração absoluta de 8h e aceita 7h59", async () => {
    sessionRepository.findById.mockResolvedValue(makeSession({ sessionStartedAt: new Date(Date.now() - (SessionConfig.ABSOLUTE_TIMEOUT - 60_000)) }));
    await expect(SessionService.validate(sessionId, userId)).resolves.toBeDefined();
    sessionRepository.findById.mockResolvedValue(makeSession({ sessionStartedAt: new Date(Date.now() - SessionConfig.ABSOLUTE_TIMEOUT) }));
    await expect(SessionService.validate(sessionId, userId)).rejects.toMatchObject({ code: ErrorCode.SESSION_ABSOLUTE_TIMEOUT });
  });

  it("rejeita duração absoluta de 10h (absoluta)", async () => {
    sessionRepository.findById.mockResolvedValue(makeSession({ sessionStartedAt: new Date(Date.now() - 10 * HOUR) }));
    await expect(SessionService.validate(sessionId, userId)).rejects.toMatchObject({ code: ErrorCode.SESSION_ABSOLUTE_TIMEOUT });
  });

  it("prioriza o timeout absoluto mesmo com atividade recente", async () => {
    sessionRepository.findById.mockResolvedValue(makeSession({ sessionStartedAt: new Date(Date.now() - SessionConfig.ABSOLUTE_TIMEOUT), lastActivityAt: new Date() }));
    await expect(SessionService.validate(sessionId, userId)).rejects.toMatchObject({ code: ErrorCode.SESSION_ABSOLUTE_TIMEOUT });
  });

  it("aplica idle quando a sessão absoluta ainda é válida", async () => {
    sessionRepository.findById.mockResolvedValue(makeSession({ sessionStartedAt: new Date(Date.now() - 3 * HOUR), lastActivityAt: new Date(Date.now() - SessionConfig.IDLE_TIMEOUT) }));
    await expect(SessionService.validate(sessionId, userId)).rejects.toMatchObject({ code: ErrorCode.SESSION_IDLE_TIMEOUT });
  });
});

describe("SessionService.touch e revoke", () => {
  it("atualiza a última atividade da sessão", async () => {
    await SessionService.touch(sessionId);
    expect(sessionRepository.touch).toHaveBeenCalledWith(sessionId);
  });

  it("revoga a sessão e ignora ausência de sessionId", async () => {
    await SessionService.revoke(sessionId);
    expect(sessionRepository.revoke).toHaveBeenCalledWith(sessionId);
    sessionRepository.revoke.mockClear();
    await SessionService.revoke();
    expect(sessionRepository.revoke).not.toHaveBeenCalled();
  });
});
