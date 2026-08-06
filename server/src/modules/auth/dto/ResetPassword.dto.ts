/**
 * ==========================================================
 * Arquivo: ResetPassword.dto.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Definir os dados necessários para redefinir
 * a palavra-passe.
 *
 * ==========================================================
 */

export interface ResetPasswordDto {
  token: string;
  password: string;
}
