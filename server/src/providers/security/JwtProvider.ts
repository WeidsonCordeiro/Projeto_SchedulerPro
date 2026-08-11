import jwt, {
  JsonWebTokenError,
  NotBeforeError,
  SignOptions,
  TokenExpiredError,
} from "jsonwebtoken";

import { env } from "../../config/env";
import { AppError } from "../../errors/AppError";
import { HttpMessages } from "../../constants/http-messages";
import { HttpStatus } from "../../constants/http-status";
import { JwtPayload } from "./types";
import Logger from "../../providers/logger";
import { TokenType } from "../../constants/token-type";

class JwtProvider {
  /**
   * =====================================================
   * Gera um token.
   * =====================================================
   */
  private sign(payload: JwtPayload, secret: string, expiresIn: string): string {
    return jwt.sign(payload, secret, {
      expiresIn,
    } as SignOptions);
  }

  /**
   * =====================================================
   * Valida um token.
   * =====================================================
   */
  private verify(token: string, secret: string): JwtPayload {
    try {
      return jwt.verify(token, secret) as JwtPayload;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new AppError(HttpMessages.TOKEN_EXPIRED, HttpStatus.UNAUTHORIZED);
      }

      if (error instanceof JsonWebTokenError) {
        throw new AppError(HttpMessages.INVALID_TOKEN, HttpStatus.UNAUTHORIZED);
      }

      if (error instanceof NotBeforeError) {
        throw new AppError(HttpMessages.INVALID_TOKEN, HttpStatus.UNAUTHORIZED);
      }

      throw error;
    }
  }

  /**
   * =====================================================
   * Access Token
   * =====================================================
   */
  public generateAccessToken(payload: JwtPayload): string {
    return this.sign(payload, env.jwt.JWT_SECRET, env.jwt.JWT_EXPIRES_IN);
  }

  /**
   * =====================================================
   * Refresh Token
   * =====================================================
   */
  public generateRefreshToken(payload: JwtPayload): string {
    return this.sign(
      payload,
      env.jwt.REFRESH_SECRET,
      env.jwt.REFRESH_EXPIRES_IN,
    );
  }

  /**
   * =====================================================
   * Verifica Access Token.
   * =====================================================
   */
  public verifyAccessToken(token: string): JwtPayload {
    return this.verify(token, env.jwt.JWT_SECRET);
  }

  /**
   * =====================================================
   * Verifica Refresh Token.
   * =====================================================
   */
  public verifyRefreshToken(token: string): JwtPayload {
    const payload = this.verify(token, env.jwt.REFRESH_SECRET);

    Logger.auth("Refresh token verificado.");

    return payload;
  }

  /**
   * =====================================================
   * Apenas decodifica.
   * Não verifica assinatura.
   * =====================================================
   */
  public decode(token: string): JwtPayload | null {
    const decoded = jwt.decode(token);

    if (!decoded || typeof decoded === "string") {
      return null;
    }

    Logger.auth("Token decodificado.");

    return decoded as JwtPayload;
  }

  /**
   * =====================================================
   * Reset password token
   * =====================================================
   */
  public generateResetPasswordToken(payload: JwtPayload): string {
    return this.sign(
      {
        ...payload,
        type: TokenType.RESET_PASSWORD,
      },
      env.jwt.RESET_PASSWORD_SECRET,
      env.jwt.RESET_PASSWORD_EXPIRES_IN,
    );
  }

  /**
   * =====================================================
   * Verifica o token de recuperação.
   * =====================================================
   */
  public verifyResetPasswordToken(token: string): JwtPayload {
    return this.verify(token, env.jwt.RESET_PASSWORD_SECRET);
  }

  /**
   * =====================================================
   * Gera o token de verificação de email.
   * =====================================================
   */
  public generateEmailVerificationToken(payload: JwtPayload): string {
    return this.sign(
      {
        ...payload,
        type: TokenType.EMAIL_VERIFICATION,
      },
      env.jwt.EMAIL_VERIFICATION_SECRET,
      env.jwt.EMAIL_VERIFICATION_EXPIRES_IN,
    );
  }

  /**
   * =====================================================
   * Verifica o token de verificação de email.
   * =====================================================
   */
  public verifyEmailVerificationToken(token: string): JwtPayload {
    return this.verify(token, env.jwt.EMAIL_VERIFICATION_SECRET);
  }
}

export default new JwtProvider();
