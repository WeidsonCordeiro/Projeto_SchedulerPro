/**
 * ==========================================================
 * Arquivo: types.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Centralizar as tipagens utilizadas pelo módulo
 * de autenticação.
 *
 * Estas interfaces representam dados trafegados
 * internamente entre Services, Controllers e Providers.
 *
 * ==========================================================
 */

import { Role } from "../../constants/roles";
import { AuthTokens } from "../../providers/security/types";

/**
 * ==========================================================
 * Dados públicos do usuário autenticado.
 * ==========================================================
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: Role;
  companyId: string;
  isActive: boolean;
}

/**
 * ==========================================================
 * Resultado de uma autenticação bem-sucedida.
 * ==========================================================
 */
export interface LoginResult {
  user: AuthUser;
  tokens: AuthTokens;
  mustChangePassword: boolean;
}
