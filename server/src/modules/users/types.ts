/**
 * ==========================================================
 * Arquivo: types.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Centralizar as tipagens utilizadas pelo módulo
 * de usuários.
 *
 * Os DTOs representam apenas os dados necessários
 * para cada operação, desacoplando a camada de
 * serviço do Model do MongoDB.
 *
 * ==========================================================
 */

import { Types } from "mongoose";
import { Role } from "../../constants/roles";

/**
 * Dados necessários para criar um usuário.
 */
export interface CreateUserDTO {
  name: string;
  email: string;
  passwordHash: string;
  companyId: Types.ObjectId;
  role: Role;
  phone?: string | null;
  avatar?: string | null;
}

/**
 * Dados permitidos para atualização.
 */
export type UpdateUserDTO = Partial<CreateUserDTO>;
