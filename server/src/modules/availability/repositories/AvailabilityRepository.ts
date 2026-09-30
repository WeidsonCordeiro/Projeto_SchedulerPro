/**
 * ==========================================================
 * Arquivo: AvailabilityRepository.ts
 * ---
 * Responsabilidade:
 *
 * Camada responsável por acessar os dados das
 * disponibilidades dos funcionários.
 *
 * Nenhuma regra de negócio deve existir aqui.
 *
 * ==========================================================
 */

import { Types } from "mongoose";

import EmployeeAvailability, {
  EmployeeAvailabilityDocument,
  DayOfWeek,
} from "../models/EmployeeAvailability.model";

import { CreateAvailabilityDto } from "../dto/CreateAvailability.dto";
import { UpdateAvailabilityDto } from "../dto/UpdateAvailability.dto";

class AvailabilityRepository {
  /**
   * ==========================================================
   * Busca uma disponibilidade pelo ID.
   * ==========================================================
   */
  public async findById(
    id: string | Types.ObjectId,
  ): Promise<EmployeeAvailabilityDocument | null> {
    return EmployeeAvailability.findOne({
      _id: id,
      deletedAt: null,
    });
  }

  /**
   * ==========================================================
   * Busca todas as disponibilidades de uma empresa.
   * ==========================================================
   */
  public async findByCompanyId(
    companyId: string | Types.ObjectId,
  ): Promise<EmployeeAvailabilityDocument[]> {
    return EmployeeAvailability.find({
      companyId,
      deletedAt: null,
    }).sort({
      employeeId: 1,
      dayOfWeek: 1,
    });
  }

  /**
   * ==========================================================
   * Busca todas as disponibilidades de um funcionário.
   * ==========================================================
   */
  public async findByEmployeeId(
    companyId: string | Types.ObjectId,
    employeeId: string | Types.ObjectId,
  ): Promise<EmployeeAvailabilityDocument[]> {
    return EmployeeAvailability.find({
      companyId,
      employeeId,
      deletedAt: null,
    }).sort({
      dayOfWeek: 1,
    });
  }

  /**
   * ==========================================================
   * Busca a disponibilidade de um funcionário em um
   * determinado dia da semana.
   * ==========================================================
   */
  public async findByEmployeeAndDay(
    companyId: string | Types.ObjectId,
    employeeId: string | Types.ObjectId,
    dayOfWeek: DayOfWeek,
  ): Promise<EmployeeAvailabilityDocument | null> {
    return EmployeeAvailability.findOne({
      companyId,
      employeeId,
      dayOfWeek,
      deletedAt: null,
    });
  }

  /**
   * ==========================================================
   * Cria uma nova disponibilidade.
   * ==========================================================
   */
  public async create(
    data: CreateAvailabilityDto & {
      companyId: Types.ObjectId;
    },
  ): Promise<EmployeeAvailabilityDocument> {
    return EmployeeAvailability.create(data);
  }

  /**
   * ==========================================================
   * Atualiza uma disponibilidade.
   * ==========================================================
   */
  public async update(
    id: string | Types.ObjectId,
    data: UpdateAvailabilityDto,
  ): Promise<EmployeeAvailabilityDocument | null> {
    return EmployeeAvailability.findOneAndUpdate(
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
   * Remove uma disponibilidade.
   *
   * Soft delete.
   * ==========================================================
   */
  public async softDelete(id: string | Types.ObjectId): Promise<void> {
    await EmployeeAvailability.findOneAndUpdate(
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

export default new AvailabilityRepository();
