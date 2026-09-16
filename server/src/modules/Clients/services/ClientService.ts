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
import { SetClientCredentialsDto } from "../dto/SetClientCredentials.dto";
import UserRepository from "../../users/repositories/UserRepository";
import { UpdateUserData } from "../../users/types";
import PasswordProvider from "../../../providers/security/PasswordProvider";
import { Role } from "../../../constants/roles";
import { AppError } from "../../../errors/AppError";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";

class ClientService {
  private readonly clientRepository = ClientRepository;
  private readonly userRepository = UserRepository;
  private readonly passwordProvider = PasswordProvider;

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
    const updateData: UpdateClientDto = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const client = await this.clientRepository.update(id, companyId, updateData);

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

  /**
   * ==========================================================
   * Perfil do cliente autenticado no portal.
   *
   * Apenas o vínculo da sessão (clientId) é aceite; não há
   * parâmetro vindo da requisição.
   * ==========================================================
   */
  public async findMe(clientId: string, companyId: string) {
    const client = await this.clientRepository.findByIdAndCompany(
      clientId,
      companyId,
    );

    if (!client) {
      throw new AppError(HttpMessages.CLIENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return ClientMapper.toResponse(client);
  }

  /**
   * ==========================================================
   * Define as credenciais de acesso de um cliente ao portal.
   *
   * Cria (ou atualiza) o utilizador com role CLIENT vinculado
   * ao cliente. A senha é armazenada apenas como hash e a
   * alteração é forçada no primeiro login.
   *
   * O e-mail da conta é o e-mail cadastrado no cliente.
   * ==========================================================
   */
  public async setCredentials(
    id: string,
    companyId: string,
    dto: SetClientCredentialsDto,
  ) {
    const client = await this.clientRepository.findByIdAndCompany(
      id,
      companyId,
    );

    if (!client) {
      throw new AppError(HttpMessages.CLIENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (!client.email) {
      throw new AppError(
        HttpMessages.CLIENT_EMAIL_REQUIRED,
        HttpStatus.BAD_REQUEST,
      );
    }

    const email = client.email;

    /**
     * O índice unique de email do MongoDB continua reservando o e-mail
     * mesmo para documentos soft-deleted. A checagem precisa considerar
     * esses documentos para evitar E11000 (HTTP 500) e duplicação.
     */
    const emailUser = await this.userRepository.findByEmailIncludingDeleted(
      email,
    );

    if (
      emailUser &&
      emailUser.clientId?.toString() !== client._id.toString()
    ) {
      throw new AppError(HttpMessages.EMAIL_ALREADY_EXISTS, HttpStatus.CONFLICT);
    }

    /**
     * Recupera o vínculo CLIENT (se existir), inclusive soft-deleted.
     * Quando o usuário do e-mail é o próprio vínculo, reaproveita a
     * referência para evitar consultas redundantes.
     */
    const linkedUser =
      emailUser?.clientId?.toString() === client._id.toString()
        ? emailUser
        : await this.userRepository.findByClientIdIncludingDeleted(client._id);

    const passwordHash = await this.passwordProvider.hash(dto.password);

    if (linkedUser) {
      /**
       * Conta já existe (ativa, ou soft-deleted): restaura/atualiza o
       * vínculo em vez de criar uma segunda conta com o mesmo e-mail.
       */
      const updateData: UpdateUserData = {
        passwordHash,
        mustChangePassword: true,
        emailVerified: true,
        isActive: true,
        deletedAt: null,
      };

      if (linkedUser.email !== email) {
        updateData.email = email;
      }

      await this.userRepository.updateIncludingDeleted(
        linkedUser._id.toString(),
        updateData,
      );
    } else {
      await this.userRepository.create({
        name: client.name,
        email,
        passwordHash,
        companyId: new Types.ObjectId(companyId),
        role: Role.CLIENT,
        clientId: client._id,
        mustChangePassword: true,
        isActive: true,
        emailVerified: true,
      });
    }

    return ClientMapper.toResponse(client);
  }
}

export default new ClientService();
