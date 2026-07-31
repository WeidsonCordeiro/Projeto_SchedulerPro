/**
 * ==========================================================
 * Arquivo: AuthMapper.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Converter documentos do MongoDB em objetos seguros
 * para serem enviados ao cliente.
 *
 * O mapper evita que detalhes internos da aplicação
 * sejam expostos pela API.
 *
 * ==========================================================
 */

import { UserDocument } from "../../users/models/User.model";
import { AuthUser } from "../types";

class AuthMapper {
  /**
   * ==========================================================
   * Converte um UserDocument em AuthUser.
   * ==========================================================
   */
  public static toAuthUser(user: UserDocument): AuthUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      companyId: user.companyId.toString(),
      isActive: user.isActive,
    };
  }
}

export default AuthMapper;
