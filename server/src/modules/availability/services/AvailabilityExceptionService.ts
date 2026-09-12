/**
 * ==========================================================
 * Arquivo: AvailabilityExceptionService.ts
 * ---
 * Responsabilidade:
 *
 * Implementar as regras de negócio relacionadas às
 * exceções de disponibilidade (bloqueios, férias, feriados).
 *
 * As exceções têm prioridade sobre a disponibilidade
 * semanal recorrente.
 *
 * ==========================================================
 */

import { Types } from "mongoose";

import AvailabilityExceptionRepository from "../repositories/AvailabilityExceptionRepository";
import AvailabilityExceptionMapper from "../mappers/AvailabilityExceptionMapper";
import UserRepository from "../../users/repositories/UserRepository";

import { CreateAvailabilityExceptionDto } from "../dto/CreateAvailabilityException.dto";
import { UpdateAvailabilityExceptionDto } from "../dto/UpdateAvailabilityException.dto";

import { AvailabilityExceptionType } from "../models/AvailabilityException.model";

import { Role } from "../../../constants/roles";
import { AppError } from "../../../errors/AppError";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";

import { DateTime } from "luxon";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EXCEPTION_MAX_REASON_LENGTH = 500;

function isValidDateOnly(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const parsed = DateTime.fromFormat(value, "yyyy-MM-dd");
  return parsed.isValid && parsed.toISODate() === value;
}

class AvailabilityExceptionService {
  private readonly availabilityExceptionRepository =
    AvailabilityExceptionRepository;

  private readonly userRepository = UserRepository;

  /**
   * ==========================================================
   * Valida se o funcionário existe, pertence à empresa e
   * está ativo.
   * ==========================================================
   */
  private async validateEmployee(employeeId: string, companyId: string) {
    const employee = await this.userRepository.findById(employeeId);

    if (
      !employee ||
      employee.deletedAt ||
      !employee.isActive ||
      employee.companyId.toString() !== companyId ||
      employee.role === Role.CLIENT
    ) {
      throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return employee;
  }

  /**
   * ==========================================================
   * Valida e normaliza o payload da exceção.
   *
   * Regras:
   * - data válida (local da empresa);
   * - tipo válido;
   * - dia inteiro não exige horários (são limpos);
   * - período exige início e fim (HH:mm) com início < fim;
   * - motivo opcional com tamanho máximo.
   * ==========================================================
   */
  private validateFields(input: {
    date: string;
    allDay?: boolean;
    startTime?: string | null;
    endTime?: string | null;
    type?: AvailabilityExceptionType;
    reason?: string | null;
  }): {
    date: string;
    allDay: boolean;
    startTime: string | null;
    endTime: string | null;
    type: AvailabilityExceptionType;
    reason: string | null;
  } {
    const { date, allDay, startTime, endTime, type, reason } = input;

    if (!isValidDateOnly(date)) {
      throw new AppError(
        "Data inválida. Use o formato AAAA-MM-DD.",
        HttpStatus.BAD_REQUEST,
      );
    }

    const nextType = type ?? AvailabilityExceptionType.BLOCK;
    if (!Object.values(AvailabilityExceptionType).includes(nextType)) {
      throw new AppError(
        "Tipo de exceção inválido.",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (reason !== undefined && reason !== null && reason.length > EXCEPTION_MAX_REASON_LENGTH) {
      throw new AppError(
        "O motivo deve ter no máximo 500 caracteres.",
        HttpStatus.BAD_REQUEST,
      );
    }

    /**
     * Dia inteiro: horários são limpos e não são exigidos.
     */
    if (allDay === true) {
      return {
        date,
        allDay: true,
        startTime: null,
        endTime: null,
        type: nextType,
        reason: reason ?? null,
      };
    }

    const hasStart = startTime !== undefined && startTime !== null && startTime !== "";
    const hasEnd = endTime !== undefined && endTime !== null && endTime !== "";

    if (!hasStart || !hasEnd) {
      throw new AppError(
        "Informe o horário inicial e final do bloqueio.",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
      throw new AppError(
        "Horário inválido. Use HH:mm.",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (startTime >= endTime) {
      throw new AppError(
        "O horário inicial deve ser anterior ao horário final.",
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      date,
      allDay: false,
      startTime,
      endTime,
      type: nextType,
      reason: reason ?? null,
    };
  }

  /**
   * ==========================================================
   * Cria uma exceção de disponibilidade.
   * ==========================================================
   */
  public async create(dto: CreateAvailabilityExceptionDto, companyId: string) {
    await this.validateEmployee(dto.employeeId, companyId);

    const fields = this.validateFields({
      date: dto.date,
      allDay: dto.allDay,
      startTime: dto.startTime,
      endTime: dto.endTime,
      type: dto.type,
      reason: dto.reason,
    });

    const exception = await this.availabilityExceptionRepository.create({
      companyId: new Types.ObjectId(companyId),
      employeeId: new Types.ObjectId(dto.employeeId),
      ...fields,
    });

    return AvailabilityExceptionMapper.toResponse(exception);
  }

  /**
   * ==========================================================
   * Lista as exceções da empresa.
   *
   * Quando employeeId é informado, valida o funcionário e
   * filtra somente as exceções dele.
   * ==========================================================
   */
  public async findAll(
    companyId: string,
    employeeId?: string,
  ) {
    if (employeeId) {
      await this.validateEmployee(employeeId, companyId);
      const list =
        await this.availabilityExceptionRepository.findByEmployeeId(
          companyId,
          employeeId,
        );
      return list.map(AvailabilityExceptionMapper.toResponse);
    }

    const list = await this.availabilityExceptionRepository.findByCompanyId(
      companyId,
    );

    return list.map(AvailabilityExceptionMapper.toResponse);
  }

  /**
   * ==========================================================
   * Busca uma exceção pelo ID.
   * ==========================================================
   */
  public async findById(id: string, companyId: string) {
    const item = await this.availabilityExceptionRepository.findById(id);

    if (!item || item.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.AVAILABILITY_EXCEPTION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    return AvailabilityExceptionMapper.toResponse(item);
  }

  /**
   * ==========================================================
   * Atualiza uma exceção.
   *
   * Valores não enviados são mantidos; quando allDay for
   * true, os horários são limpos.
   * ==========================================================
   */
  public async update(
    id: string,
    dto: UpdateAvailabilityExceptionDto,
    companyId: string,
  ) {
    const current = await this.availabilityExceptionRepository.findById(id);

    if (!current || current.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.AVAILABILITY_EXCEPTION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const employeeId = dto.employeeId ?? current.employeeId.toString();

    await this.validateEmployee(employeeId, companyId);

    const fields = this.validateFields({
      date: dto.date ?? current.date,
      allDay: dto.allDay !== undefined ? dto.allDay : current.allDay,
      startTime: dto.startTime !== undefined ? dto.startTime : current.startTime,
      endTime: dto.endTime !== undefined ? dto.endTime : current.endTime,
      type: dto.type ?? current.type,
      reason: dto.reason !== undefined ? dto.reason : current.reason,
    });

    const updated = await this.availabilityExceptionRepository.update(id, {
      employeeId,
      ...fields,
    });

    if (!updated) {
      throw new AppError(
        HttpMessages.AVAILABILITY_EXCEPTION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    return AvailabilityExceptionMapper.toResponse(updated);
  }

  /**
   * ==========================================================
   * Remove uma exceção.
   *
   * Soft delete.
   * ==========================================================
   */
  public async delete(id: string, companyId: string): Promise<void> {
    const item = await this.availabilityExceptionRepository.findById(id);

    if (!item || item.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.AVAILABILITY_EXCEPTION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.availabilityExceptionRepository.softDelete(id);
  }
}

export default new AvailabilityExceptionService();