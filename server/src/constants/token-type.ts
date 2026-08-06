/**
 * ==========================================================
 * Arquivo: token-type.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Definir os tipos de tokens suportados pelo sistema.
 *
 * ==========================================================
 */

export enum TokenType {
  ACCESS = "access",
  REFRESH = "refresh",
  RESET_PASSWORD = "reset-password",
  EMAIL_VERIFICATION = "email-verification",
}
