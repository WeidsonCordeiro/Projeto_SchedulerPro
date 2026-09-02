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
import { ClientSession } from "mongoose";

class CompanyRepository {
  /**
   * ==========================================================
   * Busca uma empresa pelo ID.
   *
   * Apenas empresas não removidas.
   * ==========================================================
   */
  public async findById(
    id: string | Types.ObjectId,
  ): Promise<CompanyDocument | null> {
    return Company.findOne({
      _id: id,
      deletedAt: null,
    });
  }

  /**
   * ==========================================================
   * Busca uma empresa pelo nome.
   *
   * Apenas empresas não removidas.
   * ==========================================================
   */
  public async findByName(name: string): Promise<CompanyDocument | null> {
    return Company.findOne({
      name: name.trim(),
      deletedAt: null,
    });
  }

  /**
   * ==========================================================
   * Busca todas as empresas.
   * ==========================================================
   */
  public async findAll(
    companyId: string | Types.ObjectId,
  ): Promise<CompanyDocument[]> {
    return Company.find({
      _id: companyId,
      deletedAt: null,
    });
  }

  /**
   * ==========================================================
   * Ativa uma empresa.
   * ==========================================================
   */
  public async activate(
    id: string,
  ): Promise<CompanyDocument | null> {
    return Company.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { isActive: true },
      { new: true },
    );
  }

  /**
   * ==========================================================
   * Desativa uma empresa.
   * ==========================================================
   */
  public async deactivate(
    id: string,
  ): Promise<CompanyDocument | null> {
    return Company.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { isActive: false },
      { new: true },
    );
  }

  /**
   * ==========================================================
   * Cria uma nova empresa.
   * ==========================================================
   */
  public async create(
    data: CreateCompanyDto,
    session?: ClientSession,
  ): Promise<CompanyDocument> {
    const [company] = await Company.create([data], { session });

    return company;
  }

  /**
   * ==========================================================
   * Atualiza uma empresa.
   * ==========================================================
   */
  public async update(
    id: string,
    data: UpdateCompanyDto,
  ): Promise<CompanyDocument | null> {
    return Company.findOneAndUpdate(
      { _id: id, deletedAt: null },
      data,
      { new: true, runValidators: true },
    );
  }

  /**
   * ==========================================================
   * Remove logicamente uma empresa.
   * ==========================================================
   */
  public async softDelete(
    id: string,
  ): Promise<void> {
    await Company.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
    );
  }
}

export default new CompanyRepository();
