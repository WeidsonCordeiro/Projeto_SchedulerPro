/**
 * ==========================================================
 * Arquivo: UpdateUser.dto.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Representar os dados necessários para atualizar
 * um utilizador.
 *
 * ==========================================================
 */

import { Role } from "../../../constants/roles";

export interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
}
