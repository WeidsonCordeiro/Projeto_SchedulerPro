/**
 * ==========================================================
 * Arquivo: types.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Tipagens utilizadas pelos Providers de Segurança.
 *
 * ==========================================================
 */

/**
 * Payload do JWT.
 */
import { Role } from "../../constants/roles";
import { TokenType } from "../../constants/token-type";

export interface JwtPayload {
  userId: string;
  companyId: string;
  role: Role;
  type: TokenType;
}

/*** Tokens gerados após autenticação.*/
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ResetPasswordToken {}

export interface EmailVerificationToken {}

export interface CookieOptions {}

export interface SessionPayload {}
