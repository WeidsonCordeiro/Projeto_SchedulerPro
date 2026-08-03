/**
 * ==========================================================
 * Arquivo: UserMapper.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Converter documentos do MongoDB em objetos
 * seguros para serem enviados ao cliente.
 *
 * ==========================================================
 */

import { UserDocument } from "../models/User.model";

class UserMapper {
  /**
   * ==========================================================
   * Converte um utilizador.
   * ==========================================================
   */
  public toResponse(user: UserDocument) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * ==========================================================
   * Converte vários utilizadores.
   * ==========================================================
   */
  public toResponseList(users: UserDocument[]) {
    return users.map((user) => this.toResponse(user));
  }
}

export default new UserMapper();
