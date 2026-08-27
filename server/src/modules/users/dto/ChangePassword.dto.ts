/**
 * ==========================================================
 * Arquivo: ChangePassword.dto.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Este arquivo define a interface ChangePasswordDto, que representa os dados necessários para alterar a senha de um usuário.
 *
 * ==========================================================
 */

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
