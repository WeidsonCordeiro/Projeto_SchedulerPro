/**
 * ==========================================================
 * Arquivo: UpdateClient.dto.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Representar os dados permitidos para atualizar
 * um cliente.
 *
 * ==========================================================
 */

export interface UpdateClientDto {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
}
