/**
 * ==========================================================
 * Arquivo: ClientMapper.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Transformar o documento do MongoDB em um objeto
 * apropriado para resposta da API.
 *
 * ==========================================================
 */

import { ClientDocument } from "../models/Client.model";

export interface ClientPortalAccess {
  exists: boolean;
  isActive: boolean;
}

class ClientMapper {
  /**
   * ==========================================================
   * Converte um ClientDocument para resposta da API.
   *
   * portalAccess informa o estado da conta de acesso ao portal
   * (User com role CLIENT vinculado por clientId):
   * - exists: false => nunca foi dado acesso;
   * - exists: true, isActive: false => conta existe porém inativa
   *   (cliente desativado e/ou conta soft-deleted);
   * - exists: true, isActive: true => acesso ativo.
   *
   * Nunca expõe passwordHash, senha ou token.
   * ==========================================================
   */
  public toResponse(
    client: ClientDocument,
    portalAccess: ClientPortalAccess = { exists: false, isActive: false },
  ) {
    return {
      id: client._id.toString(),
      name: client.name,
      email: client.email,
      phone: client.phone,
      companyId: client.companyId.toString(),
      notes: client.notes,
      isActive: client.isActive,
      portalAccess,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }
}

export default new ClientMapper();
