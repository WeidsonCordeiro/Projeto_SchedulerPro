/**
 * ==========================================================
 * Arquivo: UpdateCompany.dto.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Definir os dados permitidos para a atualização
 * de uma empresa.
 *
 * ==========================================================
 */

export interface UpdateCompanyDto {
  name?: string;
  timezone?: string;
}
