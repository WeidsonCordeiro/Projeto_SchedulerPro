/**
 * ==========================================================
 * Arquivo: AvailabilityExceptionRepository.ts
 * ---
 * Responsabilidade:
 *
 * Camada responsável por acessar os dados das exceções
 * de disponibilidade.
 *
 * Nenhuma regra de negócio deve existir aqui.
 *
 * ==========================================================
 */

import { Types } from "mongoose";

import AvailabilityExceptionModel, {
  AvailabilityExceptionDocument,
} from "../models/AvailabilityException.model";

import { CreateAvailabilityExceptionDto } from "../dto/CreateAvailabilityException.dto";
import { UpdateAvailabilityExceptionDto } from "../dto/UpdateAvailabilityException.dto";

class AvailabilityExceptionRepository {
  /**
   * ==========================================================
   * Busca uma exceção pelo ID.
   * ==========================================================
   */
  public async findById(
    id: string | Types.ObjectId,
  ): Promise<AvailabilityExceptionDocument | null> {
    return AvailabilityExceptionModel.findOne({
      _id: id,
      deletedAt: null,
    });
  }

  /**
   * ==========================================================
   * Busca todas as exceções de uma empresa.
   * ==========================================================
   */
  public async findByCompanyId(
    companyId: string | Types.ObjectId,
  ): Promise<AvailabilityExceptionDocument[]> {
    return AvailabilityExceptionModel.find({
      companyId,
      deletedAt: null,
    }).sort({
      date: 1,
      startTime: 1,
    });
  }

  /**
   * ==========================================================
   * Busca as exceções de um funcionário.
   * ==========================================================
   */
  public async findByEmployeeId(
    companyId: string | Types.ObjectId,
    employeeId: string | Types.ObjectId,
  ): Promise<AvailabilityExceptionDocument[]> {
    return AvailabilityExceptionModel.find({
      companyId,
      employeeId,
      deletedAt: null,
    }).sort({
      date: 1,
      startTime: 1,
    });
  }

  /**
   * ==========================================================
   * Busca as exceções de um funcionário em uma data local
   * da empresa (AAA-MM-DD).
   * ==========================================================
   */
  public async findByEmployeeAndDate(
    companyId: string | Types.ObjectId,
    employeeId: string | Types.ObjectId,
    date: string,
  ): Promise<AvailabilityExceptionDocument[]> {
    return AvailabilityExceptionModel.find({
      companyId,
      employeeId,
      date,
      deletedAt: null,
    });
  }

  /**
   * ==========================================================
   * Cria uma nova exceção.
   * ==========================================================
   */
  public async create(
    data: Omit<CreateAvailabilityExceptionDto, "employeeId"> & {
      companyId: Types.ObjectId;
      employeeId: Types.ObjectId;
    },
  ): Promise<AvailabilityExceptionDocument> {
    return AvailabilityExceptionModel.create(data);
  }

  /**
   * ==========================================================
   * Atualiza uma exceção.
   * ==========================================================
   */
  public async update(
    id: string | Types.ObjectId,
    data: UpdateAvailabilityExceptionDto,
  ): Promise<AvailabilityExceptionDocument | null> {
    return AvailabilityExceptionModel.findOneAndUpdate(
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
   * Remove uma exceção.
   *
   * Soft delete.
   * ==========================================================
   */
  public async softDelete(id: string | Types.ObjectId): Promise<void> {
    await AvailabilityExceptionModel.findOneAndUpdate(
      {
        _id: id,
        deletedAt: null,
      },
      {
        deletedAt: new Date(),
      },
    );
  }
}

export default new AvailabilityExceptionRepository();