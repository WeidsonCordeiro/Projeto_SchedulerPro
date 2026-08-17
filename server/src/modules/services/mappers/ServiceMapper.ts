/**
 * ==========================================================
 * Arquivo: ServiceMapper.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Transformar o documento do MongoDB em um objeto
 * seguro para resposta da API.
 *
 * ==========================================================
 */

import { ServiceDocument } from "../models/Service.model";

class ServiceMapper {
  /**
   * ==========================================================
   * Converte um ServiceDocument para resposta da API.
   * ==========================================================
   */
  public toResponse(service: ServiceDocument) {
    return {
      id: service._id.toString(),
      companyId: service.companyId.toString(),
      name: service.name,
      description: service.description ?? null,
      duration: service.duration,
      price: service.price,
      isActive: service.isActive,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }
}

export default new ServiceMapper();
