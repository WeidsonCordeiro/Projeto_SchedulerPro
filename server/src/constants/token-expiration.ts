/**
 * ==========================================================
 * Arquivo: token-expiration.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Centralizar os tempos de expiração utilizados
 * pelos tokens da aplicação.
 *
 * Estes valores são utilizados por:
 *
 * • Access Token
 * • Refresh Token
 * • Recuperação de palavra-passe
 * • Verificação de e-mail
 *
 * ==========================================================
 */

export enum TokenExpiration {
  ACCESS_TOKEN = 15 * 60 * 1000,
  REFRESH_TOKEN = 7 * 24 * 60 * 60 * 1000,
  RESET_PASSWORD_TOKEN = 15 * 60 * 1000,
  EMAIL_VERIFICATION_TOKEN = 24 * 60 * 60 * 1000,
}
