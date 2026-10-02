/**
 * ==========================================================
 * Arquivo: ServiceRepository.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Camada responsável por acessar os dados dos serviços.
 *
 * Nenhuma regra de negócio deve existir aqui.
 *
 * ==========================================================
 */

import { Types } from "mongoose";
import Service, { ServiceDocument } from "../models/Service.model";
import { CreateServiceDto } from "../dto/CreateService.dto";
import { UpdateServiceDto } from "../dto/UpdateService.dto";

class ServiceRepository {
  /**
   * ==========================================================
   * Busca um serviço pelo ID.
   * ==========================================================
   */
  public async findById(
    id: string | Types.ObjectId,
  ): Promise<ServiceDocument | null> {
    return Service.findOne({
      _id: id,
      deletedAt: null,
    });
  }

  /**
   * ==========================================================
   * Busca todos os serviços de uma empresa.
   * ==========================================================
   */
  public async findByCompanyId(
    companyId: string | Types.ObjectId,
  ): Promise<ServiceDocument[]> {
    return Service.find({
      companyId,
      deletedAt: null,
    });
  }

  /**
   * ==========================================================
   * Busca os serviços ATIVOS de uma empresa.
   *
   * `findByCompanyId` devolve também os inativos, porque a
   * interface administrativa precisa de os mostrar. O catálogo
   * público só pode oferecer o que aceita marcação, por isso
   * o filtro `isActive` é feito na consulta e não depois em
   * memória.
   * ==========================================================
   */
  public async findActiveByCompanyId(
    companyId: string | Types.ObjectId,
  ): Promise<ServiceDocument[]> {
    return Service.find({
      companyId,
      isActive: true,
      deletedAt: null,
    }).sort({
      name: 1,
    });
  }

  /**
   * ==========================================================
   * Cria um novo serviço.
   * ==========================================================
   */
  public async create(
    data: CreateServiceDto & {
      companyId: Types.ObjectId;
    },
  ): Promise<ServiceDocument> {
    return Service.create(data);
  }

  /**
   * ==========================================================
   * Atualiza um serviço.
   * ==========================================================
   */
  public async update(
    id: string,
    data: UpdateServiceDto,
  ): Promise<ServiceDocument | null> {
    return Service.findOneAndUpdate(
      {
        _id: id,
        deletedAt: null,
      },
      data,
      {
        new: true,
        runValidators: true,
      },
    );
  }

  /**
   * ==========================================================
   * Remove um serviço.
   *
   * ==========================================================
   */
  public async softDelete(id: string): Promise<void> {
    await Service.findOneAndUpdate({ _id: id, deletedAt: null }, {
      deletedAt: new Date(),
    });
  }

  /**
   * ==========================================================
   * Ativa um serviço.
   * ==========================================================
   */
  public async activate(id: string): Promise<ServiceDocument | null> {
    return Service.findOneAndUpdate(
      {
        _id: id,
        deletedAt: null,
      },
      { isActive: true },
      { new: true },
    );
  }

  /**
   * ==========================================================
   * Desativa um serviço.
   * ==========================================================
   */
  public async deactivate(id: string): Promise<ServiceDocument | null> {
    return Service.findOneAndUpdate(
      {
        _id: id,
        deletedAt: null,
      },
      { isActive: false },
      { new: true },
    );
  }
}

export default new ServiceRepository();
