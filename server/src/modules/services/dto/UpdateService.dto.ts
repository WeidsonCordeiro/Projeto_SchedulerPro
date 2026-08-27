/**
 * ==========================================================
 * Arquivo: UpdateService.dto.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Definir os dados permitidos para atualização
 * de um serviço.
 *
 * ==========================================================
 */

export interface UpdateServiceDto {
  name?: string;
  description?: string;
  duration?: number;
  price?: number;
}
