/**
 * ==========================================================
 * Arquivo: AvailabilityService.ts
 * ---
 * Responsabilidade:
 *
 * Implementar as regras de negócio relacionadas
 * à disponibilidade dos funcionários.
 *
 * ==========================================================
 */

import { Types } from "mongoose";

import AvailabilityRepository from "../repositories/AvailabilityRepository";
import AvailabilityMapper from "../mappers/AvailabilityMapper";

import UserRepository from "../../users/repositories/UserRepository";

import { CreateAvailabilityDto } from "../dto/CreateAvailability.dto";
import { UpdateAvailabilityDto } from "../dto/UpdateAvailability.dto";

import { EmployeeAvailability } from "../models/EmployeeAvailability.model";

import { Role } from "../../../constants/roles";

import { AppError } from "../../../errors/AppError";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import CompanyRepository from "../../companies/repositories/CompanyRepository";
import {
  formatLocalTime,
  luxonWeekdayToDayOfWeek,
  toCompanyDateTime,
} from "../../../utils/timezone";

class AvailabilityService {
  private readonly availabilityRepository = AvailabilityRepository;

  private readonly userRepository = UserRepository;
  private readonly companyRepository = CompanyRepository;

  /**
   * ==========================================================
   * Valida se o funcionário existe, pertence à empresa
   * e está ativo.
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
   * Valida os períodos de disponibilidade.
   * ==========================================================
   */
  private validatePeriods(
    availability: Pick<
      EmployeeAvailability,
      "morningStart" | "morningEnd" | "afternoonStart" | "afternoonEnd"
    >,
  ): void {
    const { morningStart, morningEnd, afternoonStart, afternoonEnd } =
      availability;

    const hasMorning = Boolean(morningStart) || Boolean(morningEnd);

    const hasAfternoon = Boolean(afternoonStart) || Boolean(afternoonEnd);

    /**
     * Deve existir pelo menos um período.
     */
    if (!hasMorning && !hasAfternoon) {
      throw new AppError(
        "Informe pelo menos um período de disponibilidade.",
        HttpStatus.BAD_REQUEST,
      );
    }

    /**
     * Manhã precisa possuir início e fim.
     */
    if ((morningStart && !morningEnd) || (!morningStart && morningEnd)) {
      throw new AppError(
        "Informe o horário inicial e final da manhã.",
        HttpStatus.BAD_REQUEST,
      );
    }

    /**
     * Tarde precisa possuir início e fim.
     */
    if (
      (afternoonStart && !afternoonEnd) ||
      (!afternoonStart && afternoonEnd)
    ) {
      throw new AppError(
        "Informe o horário inicial e final da tarde.",
        HttpStatus.BAD_REQUEST,
      );
    }

    /**
     * Valida período da manhã.
     */
    if (morningStart && morningEnd && morningStart >= morningEnd) {
      throw new AppError(
        "O horário inicial da manhã deve ser anterior ao horário final.",
        HttpStatus.BAD_REQUEST,
      );
    }

    /**
     * Valida período da tarde.
     */
    if (afternoonStart && afternoonEnd && afternoonStart >= afternoonEnd) {
      throw new AppError(
        "O horário inicial da tarde deve ser anterior ao horário final.",
        HttpStatus.BAD_REQUEST,
      );
    }

    /**
     * Garante que manhã e tarde não se sobreponham.
     */
    if (morningEnd && afternoonStart && morningEnd > afternoonStart) {
      throw new AppError(
        "O período da manhã não pode sobrepor o período da tarde.",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * ==========================================================
   * Cria uma disponibilidade.
   * ==========================================================
   */
  public async create(dto: CreateAvailabilityDto, companyId: string) {
    await this.validateEmployee(dto.employeeId, companyId);

    this.validatePeriods(dto);

    const existing = await this.availabilityRepository.findByEmployeeAndDay(
      companyId,
      dto.employeeId,
      dto.dayOfWeek,
    );

    if (existing) {
      throw new AppError(
        "Já existe uma disponibilidade cadastrada para este funcionário neste dia.",
        HttpStatus.CONFLICT,
      );
    }

    const availability = await this.availabilityRepository.create({
      ...dto,
      companyId: new Types.ObjectId(companyId),
    });

    return AvailabilityMapper.toResponse(availability);
  }

  /**
   * ==========================================================
   * Lista todas as disponibilidades da empresa.
   * ==========================================================
   */
  public async findAll(companyId: string) {
    const availabilities =
      await this.availabilityRepository.findByCompanyId(companyId);

    return availabilities.map(AvailabilityMapper.toResponse);
  }

  /**
   * ==========================================================
   * Lista as disponibilidades de um funcionário.
   * ==========================================================
   */
  public async findByEmployeeId(employeeId: string, companyId: string) {
    await this.validateEmployee(employeeId, companyId);

    const availabilities = await this.availabilityRepository.findByEmployeeId(
      companyId,
      employeeId,
    );

    return availabilities.map(AvailabilityMapper.toResponse);
  }

  /**
   * ==========================================================
   * Busca uma disponibilidade pelo ID.
   * ==========================================================
   */
  public async findById(id: string, companyId: string) {
    const item = await this.availabilityRepository.findById(id);

    if (!item || item.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.AVAILABILITY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    return AvailabilityMapper.toResponse(item);
  }

  /**
   * ==========================================================
   * Atualiza uma disponibilidade.
   * ==========================================================
   */
  public async update(
    id: string,
    dto: UpdateAvailabilityDto,
    companyId: string,
  ) {
    const current = await this.availabilityRepository.findById(id);

    if (!current || current.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.AVAILABILITY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    /**
     * Mantém os valores atuais quando não forem enviados.
     */
    const employeeId = dto.employeeId ?? current.employeeId.toString();

    const dayOfWeek = dto.dayOfWeek ?? current.dayOfWeek;

    const availabilityData = {
      morningStart:
        dto.morningStart !== undefined
          ? dto.morningStart
          : current.morningStart,

      morningEnd:
        dto.morningEnd !== undefined ? dto.morningEnd : current.morningEnd,

      afternoonStart:
        dto.afternoonStart !== undefined
          ? dto.afternoonStart
          : current.afternoonStart,

      afternoonEnd:
        dto.afternoonEnd !== undefined
          ? dto.afternoonEnd
          : current.afternoonEnd,
    };

    await this.validateEmployee(employeeId, companyId);

    this.validatePeriods(availabilityData);

    /**
     * Se funcionário ou dia forem alterados,
     * verifica se já existe outra disponibilidade
     * para essa combinação.
     */
    if (
      employeeId !== current.employeeId.toString() ||
      dayOfWeek !== current.dayOfWeek
    ) {
      const existing = await this.availabilityRepository.findByEmployeeAndDay(
        companyId,
        employeeId,
        dayOfWeek,
      );

      if (existing && existing._id.toString() !== id) {
        throw new AppError(
          "Já existe uma disponibilidade cadastrada para este funcionário neste dia.",
          HttpStatus.CONFLICT,
        );
      }
    }

    const updated = await this.availabilityRepository.update(id, {
      ...dto,
      ...availabilityData,
    });

    if (!updated) {
      throw new AppError(
        HttpMessages.AVAILABILITY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    return AvailabilityMapper.toResponse(updated);
  }

  /**
   * ==========================================================
   * Remove uma disponibilidade.
   *
   * Soft delete.
   * ==========================================================
   */
  public async delete(id: string, companyId: string): Promise<void> {
    const item = await this.availabilityRepository.findById(id);

    if (!item || item.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.AVAILABILITY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.availabilityRepository.softDelete(id);
  }

  /**
   * ==========================================================
   * Verifica se um funcionário está disponível para
   * atender durante todo o período do agendamento.
   *
   * O agendamento deve estar completamente dentro
   * do período da manhã ou completamente dentro
   * do período da tarde.
   * ==========================================================
   */
  public async ensureEmployeeAvailable(
    companyId: string,
    employeeId: string | Types.ObjectId,
    dateStart: Date,
    dateEnd: Date,
  ): Promise<void> {
    /**
     * O agendamento não pode atravessar dias.
     */
    const company = await this.companyRepository.findById(companyId);

    if (!company) {
      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const localStart = toCompanyDateTime(dateStart, company.timezone);

    const localEnd = toCompanyDateTime(dateEnd, company.timezone);

    if (
      !localStart.isValid ||
      !localEnd.isValid ||
      localStart.toISODate() !== localEnd.toISODate()
    ) {
      throw new AppError(
        HttpMessages.EMPLOYEE_NOT_AVAILABLE,
        HttpStatus.CONFLICT,
      );
    }

    const day = luxonWeekdayToDayOfWeek(localStart.weekday);
    const start = formatLocalTime(localStart);
    const end = formatLocalTime(localEnd);

    const availability = await this.availabilityRepository.findByEmployeeAndDay(
      companyId,
      employeeId,
      day,
    );

    if (!availability) {
      throw new AppError(
        HttpMessages.EMPLOYEE_NOT_AVAILABLE,
        HttpStatus.CONFLICT,
      );
    }

    /**
     * Verifica se o agendamento está totalmente
     * dentro do período da manhã.
     */
    const isWithinMorning =
      availability.morningStart &&
      availability.morningEnd &&
      start >= availability.morningStart &&
      end <= availability.morningEnd;

    /**
     * Verifica se o agendamento está totalmente
     * dentro do período da tarde.
     */
    const isWithinAfternoon =
      availability.afternoonStart &&
      availability.afternoonEnd &&
      start >= availability.afternoonStart &&
      end <= availability.afternoonEnd;

    /**
     * O agendamento deve caber completamente em
     * um dos períodos.
     */
    if (!isWithinMorning && !isWithinAfternoon) {
      throw new AppError(
        HttpMessages.EMPLOYEE_NOT_AVAILABLE,
        HttpStatus.CONFLICT,
      );
    }
  }
}

export default new AvailabilityService();
