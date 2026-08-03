/**
 * ==========================================================
 * Arquivo: CreateUser.dto.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Representar os dados necessários para criar
 * um novo utilizador.
 *
 * ==========================================================
 */

import { Role } from "../../../constants/roles";

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
}
