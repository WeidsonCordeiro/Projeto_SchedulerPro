import SessionRepository from "../repositories/SessionRepository";
import { SessionDocument } from "../models/Session.model";
import { SessionConfig } from "../../../constants/session";
import { ErrorCode } from "../../../constants/error-codes";
import { HttpStatus } from "../../../constants/http-status";
import { HttpMessages } from "../../../constants/http-messages";
import { AppError } from "../../../errors/AppError";

class SessionService {
  private readonly repository = SessionRepository;

  private readonly config = SessionConfig;

  public async start(userId: string): Promise<SessionDocument> {
    return this.repository.create(userId);
  }

  public async validate(
    sessionId: string,
    userId?: string,
  ): Promise<SessionDocument> {
    const session = await this.repository.findById(sessionId);

    if (!session || session.revokedAt) {
      throw new AppError(
        HttpMessages.INVALID_SESSION,
        HttpStatus.UNAUTHORIZED,
        undefined,
        ErrorCode.INVALID_SESSION,
      );
    }

    if (userId && session.userId.toString() !== userId) {
      throw new AppError(
        HttpMessages.INVALID_SESSION,
        HttpStatus.UNAUTHORIZED,
        undefined,
        ErrorCode.INVALID_SESSION,
      );
    }

    const now = Date.now();

    const absoluteExpired =
      now - session.sessionStartedAt.getTime() >= this.config.ABSOLUTE_TIMEOUT;

    if (absoluteExpired) {
      throw new AppError(
        HttpMessages.SESSION_ABSOLUTE_TIMEOUT,
        HttpStatus.UNAUTHORIZED,
        undefined,
        ErrorCode.SESSION_ABSOLUTE_TIMEOUT,
      );
    }

    const idleExpired =
      now - session.lastActivityAt.getTime() >= this.config.IDLE_TIMEOUT;

    if (idleExpired) {
      throw new AppError(
        HttpMessages.SESSION_IDLE_TIMEOUT,
        HttpStatus.UNAUTHORIZED,
        undefined,
        ErrorCode.SESSION_IDLE_TIMEOUT,
      );
    }

    return session;
  }

  public async touch(sessionId: string): Promise<void> {
    await this.repository.touch(sessionId);
  }

  public async revoke(sessionId?: string): Promise<void> {
    if (!sessionId) {
      return;
    }

    await this.repository.revoke(sessionId);
  }
}

export default new SessionService();
