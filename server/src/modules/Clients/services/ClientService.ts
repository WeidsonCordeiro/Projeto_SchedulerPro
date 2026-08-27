/**
 * ==========================================================
 * Arquivo: ClientService.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Implementar as regras de negócio relacionadas
 * aos clientes.
 *
 * ==========================================================
 */

import { Types } from "mongoose";
import ClientRepository from "../repositories/ClientRepository";
import ClientMapper from "../mappers/ClientMapper";
import { CreateClientDto } from "../dto/CreateClient.dto";
import { UpdateClientDto } from "../dto/UpdateClient.dto";
import { AppError } from "../../../errors/AppError";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";

class ClientService {
  private readonly clientRepository = ClientRepository;

  /**
   * ==========================================================
   * Cria um novo cliente.
   * ==========================================================
   */
  public async create(dto: CreateClientDto, companyId: string) {
    const client = await this.clientRepository.create({
      ...dto,
      companyId: new Types.ObjectId(companyId),
    });

    return ClientMapper.toResponse(client);
  }

  /**
   * ==========================================================
   * Lista todos os clientes de uma empresa.
   * ==========================================================
   */
  public async findAll(companyId: string) {
    const clients = await this.clientRepository.findByCompanyId(companyId);

    return clients.map(ClientMapper.toResponse);
  }

  /**
   * ==========================================================
   * Procura um cliente pelo ID.
   * ==========================================================
   */
  public async findById(id: string, companyId: string) {
    const client = await this.clientRepository.findByIdAndCompany(
      id,
      companyId,
    );

    if (!client) {
      throw new AppError(HttpMessages.CLIENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return ClientMapper.toResponse(client);
  }

  /**
   * ==========================================================
   * Atualiza um cliente.
   * ==========================================================
   */
  public async update(id: string, dto: UpdateClientDto, companyId: string) {
    const client = await this.clientRepository.update(id, companyId, dto);

    if (!client) {
      throw new AppError(HttpMessages.CLIENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return ClientMapper.toResponse(client);
  }

  /**
   * ==========================================================
   * Remove um cliente.
   *
   * Utiliza soft delete.
   * ==========================================================
   */
  public async delete(id: string, companyId: string): Promise<void> {
    const client = await this.clientRepository.findByIdAndCompany(
      id,
      companyId,
    );

    if (!client) {
      throw new AppError(HttpMessages.CLIENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    await this.clientRepository.softDelete(id, companyId);
  }

  /**
   * ==========================================================
   * Ativa um cliente.
   * ==========================================================
   */
  public async activate(id: string, companyId: string) {
    const client = await this.clientRepository.activate(id, companyId);

    if (!client) {
      throw new AppError(HttpMessages.CLIENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return ClientMapper.toResponse(client);
  }

  /**
   * ==========================================================
   * Desativa um cliente.
   * ==========================================================
   */
  public async deactivate(id: string, companyId: string) {
    const client = await this.clientRepository.deactivate(id, companyId);

    if (!client) {
      throw new AppError(HttpMessages.CLIENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return ClientMapper.toResponse(client);
  }
}

export default new ClientService();
