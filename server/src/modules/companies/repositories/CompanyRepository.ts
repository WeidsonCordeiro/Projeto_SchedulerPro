/**
 * ==========================================================
 * Arquivo: CompanyRepository.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Camada responsável por acessar os dados das empresas.
 *
 * Nenhuma regra de negócio deve existir aqui.
 *
 * Toda operação relacionada à persistência de empresas
 * deve passar por este repositório.
 *
 * ==========================================================
 */

import Company, { CompanyDocument } from "../models/Company.model";
import { CreateCompanyDto, UpdateCompanyDto } from "../types";
import { Types } from "mongoose";

class CompanyRepository {
  /**
   * ==========================================================
   * Busca uma empresa pelo ID.
   * ==========================================================
   */
  public async findById(
    id: string | Types.ObjectId
  ): Promise<CompanyDocument | null> {
    return Company.findById(id);
  }

  /**
   * ==========================================================
   * Busca uma empresa pelo nome.
   *
   * Apenas empresas não removidas.
   * ==========================================================
   */
  public async findByName(name: string): Promise<CompanyDocument | null> {
    console.log("Searching for company by name:", name); // Debug log
    return Company.findOne({
      name: name.trim().toLowerCase(),
      deletedAt: null,
    });
  }

  /**
   * ==========================================================
   * Cria uma nova empresa.
   * ==========================================================
   */
  public async create(data: CreateCompanyDto): Promise<CompanyDocument> {
    return Company.create(data);
  }

  /**
   * ==========================================================
   * Atualiza uma empresa.
   * ==========================================================
   */
  public async update(
    id: string,
    data: UpdateCompanyDto
  ): Promise<CompanyDocument | null> {
    return Company.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  /**
   * ==========================================================
   * Remove logicamente uma empresa.
   * ==========================================================
   */
  public async delete(id: string): Promise<void> {
    await Company.findByIdAndUpdate(id, {
      deletedAt: new Date(),
    });
  }
}

export default new CompanyRepository();
