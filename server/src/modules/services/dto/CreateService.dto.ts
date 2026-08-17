/**
 * ==========================================================
 * Arquivo: CreateService.dto.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Definir os dados necessários para criação
 * de um serviço.
 *
 * ==========================================================
 */

export interface CreateServiceDto {
  name: string;
  description?: string;
  duration: number;
  price: number;
}
