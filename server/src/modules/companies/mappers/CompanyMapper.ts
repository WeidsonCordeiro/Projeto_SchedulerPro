/**
 * ==========================================================
 * Arquivo: CompanyMapper.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Converter documentos do MongoDB em objetos
 * seguros para serem enviados ao cliente.
 *
 * ==========================================================
 */

import { CompanyDocument } from "../models/Company.model";

class CompanyMapper {
  /**
   * ==========================================================
   * Converte um CompanyDocument em um objeto
   * apropriado para a resposta da API.
   * ==========================================================
   */
  public static toResponse(company: CompanyDocument) {
    return {
      id: company.id,
      name: company.name,
      isActive: company.isActive,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }

  /**
   * ==========================================================
   * Converte uma lista de empresas.
   * ==========================================================
   */
  public static toResponseList(companies: CompanyDocument[]) {
    return companies.map((company) => this.toResponse(company));
  }
}

export default CompanyMapper;
