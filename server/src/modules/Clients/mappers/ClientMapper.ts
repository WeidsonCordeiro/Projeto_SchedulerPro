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

class ClientMapper {
  /**
   * ==========================================================
   * Converte um ClientDocument para resposta da API.
   * ==========================================================
   */
  public toResponse(client: ClientDocument) {
    return {
      id: client._id.toString(),
      name: client.name,
      email: client.email,
      phone: client.phone,
      companyId: client.companyId.toString(),
      notes: client.notes,
      isActive: client.isActive,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }
}

export default new ClientMapper();
