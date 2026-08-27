/**
 * ==========================================================
 * Arquivo: CreateClient.dto.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Representar os dados necessários para criar
 * um novo cliente.
 *
 * ==========================================================
 */

export interface CreateClientDto {
  name: string;
  email?: string;
  phone: string;
  notes?: string;
}
