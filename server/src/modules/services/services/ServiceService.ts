/**
 * ==========================================================
 * Arquivo: ServiceService.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Implementar as regras de negócio relacionadas
 * aos serviços.
 *
 * ==========================================================
 */

import { Types } from "mongoose";

import { CreateServiceDto } from "../dto/CreateService.dto";
import { UpdateServiceDto } from "../dto/UpdateService.dto";
import ServiceRepository from "../repositories/ServiceRepository";
import ServiceMapper from "../mappers/ServiceMapper";

import CompanyRepository from "../../companies/repositories/CompanyRepository";

import { AppError } from "../../../errors/AppError";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";

class ServiceService {
  private readonly serviceRepository = ServiceRepository;
  private readonly companyRepository = CompanyRepository;

  /**
   * ==========================================================
   * Cria um novo serviço.
   * ==========================================================
   */
  public async create(dto: CreateServiceDto, companyId: string) {
    const company = await this.companyRepository.findById(companyId);

    if (!company) {
      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const service = await this.serviceRepository.create({
      name: dto.name,
      description: dto.description,
      duration: dto.duration,
      price: dto.price,
      companyId: new Types.ObjectId(companyId),
    });

    return ServiceMapper.toResponse(service);
  }

  /**
   * ==========================================================
   * Lista todos os serviços de uma empresa.
   * ==========================================================
   */
  public async findAll(companyId: string) {
    const services = await this.serviceRepository.findByCompanyId(companyId);

    return services.map(ServiceMapper.toResponse);
  }

  /**
   * ==========================================================
   * Procura um serviço pelo ID.
   *
   * O serviço deve pertencer à empresa do utilizador autenticado.
   * ==========================================================
   */
  public async findById(id: string, companyId: string) {
    const service = await this.serviceRepository.findById(id);

    if (!service) {
      throw new AppError(HttpMessages.SERVICE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (service.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.USER_NOT_PREVILEGES,
        HttpStatus.FORBIDDEN,
      );
    }

    return ServiceMapper.toResponse(service);
  }

  /**
   * ==========================================================
   * Atualiza um serviço.
   *
   * O serviço deve pertencer à empresa do utilizador autenticado.
   * ==========================================================
   */
  public async update(id: string, dto: UpdateServiceDto, companyId: string) {
    const service = await this.serviceRepository.findById(id);

    if (!service) {
      throw new AppError(HttpMessages.SERVICE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (service.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.USER_NOT_PREVILEGES,
        HttpStatus.FORBIDDEN,
      );
    }

    const updatedService = await this.serviceRepository.update(id, dto);

    if (!updatedService) {
      throw new AppError(HttpMessages.SERVICE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return ServiceMapper.toResponse(updatedService);
  }

  /**
   * ==========================================================
   * Remove um serviço.
   *
   * O serviço deve pertencer à empresa do utilizador autenticado.
   * ==========================================================
   */
  public async delete(id: string, companyId: string): Promise<void> {
    const service = await this.serviceRepository.findById(id);

    if (!service) {
      throw new AppError(HttpMessages.SERVICE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (service.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.USER_NOT_PREVILEGES,
        HttpStatus.FORBIDDEN,
      );
    }

    await this.serviceRepository.softDelete(id);
  }

  /**
   * ==========================================================
   * Ativa um serviço.
   * ==========================================================
   */
  public async activate(id: string, companyId: string) {
    const service = await this.serviceRepository.findById(id);

    if (!service) {
      throw new AppError(HttpMessages.SERVICE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (service.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.USER_NOT_PREVILEGES,
        HttpStatus.FORBIDDEN,
      );
    }

    const updatedService = await this.serviceRepository.activate(id);

    if (!updatedService) {
      throw new AppError(HttpMessages.SERVICE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return ServiceMapper.toResponse(updatedService);
  }

  /**
   * ==========================================================
   * Desativa um serviço.
   * ==========================================================
   */
  public async deactivate(id: string, companyId: string) {
    const service = await this.serviceRepository.findById(id);

    if (!service) {
      throw new AppError(HttpMessages.SERVICE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (service.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.USER_NOT_PREVILEGES,
        HttpStatus.FORBIDDEN,
      );
    }

    const updatedService = await this.serviceRepository.deactivate(id);

    if (!updatedService) {
      throw new AppError(HttpMessages.SERVICE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return ServiceMapper.toResponse(updatedService);
  }
}

export default new ServiceService();
