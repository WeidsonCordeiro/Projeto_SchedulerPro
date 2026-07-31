/**
 * ==========================================================
 * Arquivo: Login.dto.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Representar os dados necessários para realizar
 * a autenticação de um usuário.
 *
 * Este DTO é utilizado para:
 *
 * • Validação da requisição
 * • Padronização dos dados recebidos
 * • Comunicação entre Controller e Service
 *
 * Nenhuma regra de negócio deve existir aqui.
 *
 * ==========================================================
 */

/**
 * Dados necessários para autenticação.
 */
export interface LoginDto {
  email: string;
  password: string;
}
