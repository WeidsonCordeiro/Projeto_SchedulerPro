/**
 * ==========================================================
 * Arquivo: SetClientCredentials.dto.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Representar os dados necessários para definir as
 * credenciais de acesso de um cliente ao portal.
 *
 * O e-mail da conta é o e-mail cadastrado no cliente.
 *
 * ==========================================================
 */

export interface SetClientCredentialsDto {
  password: string;
  confirmPassword: string;
}