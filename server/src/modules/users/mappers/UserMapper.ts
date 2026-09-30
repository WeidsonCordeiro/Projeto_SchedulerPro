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
      isActive: user.isActive,
      companyId: user.companyId,
      /**
       * Foto como `{ url, publicId }` ou `null`.
       *
       * Os campos são projetados explicitamente: mesmo que o
       * documento traga metadados do storage (bytes, versão,
       * assinatura), nada além do contrato é exposto.
       */
      avatar: user.avatar
        ? {
            url: user.avatar.url,
            publicId: user.avatar.publicId,
          }
        : null,
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
