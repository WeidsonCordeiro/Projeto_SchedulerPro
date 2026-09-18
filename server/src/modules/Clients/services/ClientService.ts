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
import ClientMapper, { ClientPortalAccess } from "../mappers/ClientMapper";
import { CreateClientDto } from "../dto/CreateClient.dto";
import { UpdateClientDto } from "../dto/UpdateClient.dto";
import { SetClientCredentialsDto } from "../dto/SetClientCredentials.dto";
import UserRepository from "../../users/repositories/UserRepository";
import { UpdateUserData } from "../../users/types";
import { ClientDocument } from "../models/Client.model";
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
   * Resolve o estado de acesso ao portal de um cliente.
   *
   * A busca é limitada à empresa do cliente para garantir o
   * isolamento: um cliente da Company A nunca resolve (nem
   * escreve em) um usuário da Company B.
   * ==========================================================
   */
  private async resolvePortalAccess(
    clientId: string,
    companyId: string,
  ): Promise<ClientPortalAccess> {
    const user = await this.userRepository.findByClientIdIncludingDeleted(
      clientId,
      companyId,
    );

    if (!user) {
      return { exists: false, isActive: false };
    }

    return {
      exists: true,
      isActive: user.isActive === true && user.deletedAt == null,
    };
  }

  /**
   * ==========================================================
   * Resolve o estado de acesso de uma lista de clientes em lote.
   * ==========================================================
   */
  private async resolvePortalAccessMap(
    clients: ClientDocument[],
    companyId: string,
  ): Promise<Map<string, ClientPortalAccess>> {
    const map = new Map<string, ClientPortalAccess>();

    for (const client of clients) {
      map.set(client._id.toString(), { exists: false, isActive: false });
    }

    const users = await this.userRepository.findByClientIdsAndCompanyIncludingDeleted(
      clients.map((client) => client._id),
      companyId,
    );

    for (const user of users) {
      if (!user.clientId) {
        continue;
      }

      map.set(user.clientId.toString(), {
        exists: true,
        isActive: user.isActive === true && user.deletedAt == null,
      });
    }

    return map;
  }

  /**
   * ==========================================================
   * Cria um novo cliente.
   *
   * Quando um e-mail é informado, verifica-se conflito global
   * com a coleção User (incluindo soft-deleted, pois o índice
   * unique de email é global). Conflito => 409 antes de gravar:
   * o Client não é criado e nenhum User é tocado.
   *
   * Cliente pode existir sem conta de acesso; a unicidade do
   * e-mail com User vale independentemente disso.
   * ==========================================================
   */
  public async create(dto: CreateClientDto, companyId: string) {
    const email = dto.email?.trim().toLowerCase();

    if (email) {
      const emailUser = await this.userRepository.findByEmailIncludingDeleted(
        email,
      );

      if (emailUser) {
        throw new AppError(
          HttpMessages.EMAIL_ALREADY_EXISTS,
          HttpStatus.CONFLICT,
        );
      }
    }

    const client = await this.clientRepository.create({
      ...dto,
      companyId: new Types.ObjectId(companyId),
    });

    return ClientMapper.toResponse(client, { exists: false, isActive: false });
  }

  /**
   * ==========================================================
   * Lista todos os clientes de uma empresa.
   * ==========================================================
   */
  public async findAll(companyId: string) {
    const clients = await this.clientRepository.findByCompanyId(companyId);
    const portalAccessMap = await this.resolvePortalAccessMap(clients, companyId);

    return clients.map((client) =>
      ClientMapper.toResponse(
        client,
        portalAccessMap.get(client._id.toString()),
      ),
    );
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

    return ClientMapper.toResponse(
      client,
      await this.resolvePortalAccess(client._id.toString(), companyId),
    );
  }

  /**
   * ==========================================================
   * Atualiza um cliente.
   *
   * Quando o cliente possui conta de acesso (User CLIENT
   * vinculado por clientId), os campos de identidade name e
   * email são sincronizados nessa conta. Nenhum dado sensível é
   * tocado: passwordHash, role, clientId, companyId e isActive
   * da conta permanecem inalterados.
   *
   * O vínculo é sempre buscado de forma isolada (mesma empresa)
   * e contas soft-deleted não são sincronizadas. A validação de
   * conflito de e-mail com User vale também para clientes sem
   * conta de acesso.
   * ==========================================================
   */
  public async update(id: string, dto: UpdateClientDto, companyId: string) {
    const updateData: UpdateClientDto = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) {
      updateData.email = dto.email.trim().toLowerCase();
    }
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const linkedUser = await this.userRepository.findByClientIdIncludingDeleted(
      id,
      companyId,
    );

    /**
     * Conflito de e-mail: o índice unique de email do User é
     * global, então a checagem considera qualquer empresa e até
     * contas soft-deleted (que seguem reservando o e-mail).
     *
     * Vale também para clientes sem conta de acesso (Client sem
     * User vinculado não pode usar um e-mail já reservado). O
     * próprio e-mail da conta vinculada é permitido.
     */
    if (
      updateData.email !== undefined &&
      updateData.email !== linkedUser?.email
    ) {
      const owner = await this.userRepository.findByEmailIncludingDeleted(
        updateData.email,
      );

      if (owner && owner._id.toString() !== linkedUser?._id.toString()) {
        throw new AppError(
          HttpMessages.EMAIL_ALREADY_EXISTS,
          HttpStatus.CONFLICT,
        );
      }
    }

    const client = await this.clientRepository.update(id, companyId, updateData);

    if (!client) {
      throw new AppError(HttpMessages.CLIENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    /**
     * Sincroniza apenas a identidade (name e/ou email) na conta
     * de acesso ativa. Conta soft-deleted não é restaurada nem
     * alterada por esta operação.
     */
    if (linkedUser && linkedUser.deletedAt == null) {
      const userUpdate: UpdateUserData = {};

      if (updateData.name !== undefined && client.name !== linkedUser.name) {
        userUpdate.name = client.name;
      }

      if (
        updateData.email !== undefined &&
        client.email !== null &&
        client.email !== linkedUser.email
      ) {
        userUpdate.email = client.email;
      }

      if (Object.keys(userUpdate).length > 0) {
        await this.userRepository.update(linkedUser._id.toString(), userUpdate);
      }
    }

    const portalAccess: ClientPortalAccess = linkedUser
      ? {
          exists: true,
          isActive: linkedUser.isActive === true && linkedUser.deletedAt == null,
        }
      : { exists: false, isActive: false };

    return ClientMapper.toResponse(client, portalAccess);
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

    return ClientMapper.toResponse(
      client,
      await this.resolvePortalAccess(id, companyId),
    );
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

    return ClientMapper.toResponse(
      client,
      await this.resolvePortalAccess(id, companyId),
    );
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

    return ClientMapper.toResponse(
      client,
      await this.resolvePortalAccess(clientId, companyId),
    );
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

    return ClientMapper.toResponse(client, { exists: true, isActive: true });
  }
}

export default new ClientService();
