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
import type { StoredImage } from "../../providers/images/types";

/**
 * ==========================================================
 * Dados públicos do usuário autenticado.
 * ==========================================================
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: StoredImage | null;
  role: Role;
  companyId: string;
  companyTimezone: string;
  /** Nome da empresa do tenant (identificação; não substitui COMPANY_READ). */
  companyName: string;
  isActive: boolean;
  clientId?: string;
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
