/**
 * ==========================================================
 * Arquivo: CompanyService.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Implementar as regras de negócio relacionadas
 * às empresas.
 *
 * ==========================================================
 */

import CompanyMapper from "../mappers/CompanyMapper";
import CompanyRepository from "../repositories/CompanyRepository";
import { AppError } from "../../../errors/AppError";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import { UpdateCompanyDto } from "../dto/UpdateCompany.dto";
import { isValidIanaTimezone } from "../../../utils/timezone";

class CompanyService {
  /**
   * ==========================================================
   * Procura uma empresa pelo ID.
   * ==========================================================
   */
  public async findById(id: string) {
    const company = await CompanyRepository.findById(id);

    if (!company) {
      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return CompanyMapper.toResponse(company);
  }

  /**
   * ==========================================================
   * Procura todas as empresas.
   * ==========================================================
   */
  public async findAll() {
    const companies = await CompanyRepository.findAll();

    return CompanyMapper.toResponseList(companies);
  }

  /**
   * ==========================================================
   * Cria uma empresa.
   * ==========================================================
   */
  public async create() {}

  /**
   * ==========================================================
   * Atualiza uma empresa.
   * ==========================================================
   */
  public async update(id: string, data: UpdateCompanyDto) {
    if (data.timezone !== undefined && !isValidIanaTimezone(data.timezone)) {
      throw new AppError(HttpMessages.TIMEZONE_INVALID, HttpStatus.BAD_REQUEST);
    }
    const company = await CompanyRepository.findById(id);

    if (!company) {
      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const updatedCompany = await CompanyRepository.update(id, data);

    return CompanyMapper.toResponse(updatedCompany!);
  }

  /**
   * ==========================================================
   * Remove uma empresa.
   * ==========================================================
   */
  public async delete(id: string): Promise<void> {
    const company = await CompanyRepository.findById(id);

    if (!company) {
      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    await CompanyRepository.softDelete(id);
  }

  /**
   * ==========================================================
   * Ativa uma empresa.
   * ==========================================================
   */
  public async activate(id: string) {
    const company = await CompanyRepository.findById(id);

    if (!company) {
      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const updatedCompany = await CompanyRepository.activate(id);

    return CompanyMapper.toResponse(updatedCompany!);
  }

  /**
   * ==========================================================
   * Desativa uma empresa.
   * ==========================================================
   */
  public async deactivate(id: string) {
    const company = await CompanyRepository.findById(id);

    if (!company) {
      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const updatedCompany = await CompanyRepository.deactivate(id);

    return CompanyMapper.toResponse(updatedCompany!);
  }
}

export default new CompanyService();
