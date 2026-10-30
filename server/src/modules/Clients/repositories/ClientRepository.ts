/**
 * ==========================================================
 * Arquivo: ClientRepository.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Camada responsável por acessar os dados dos clientes.
 *
 * Nenhuma regra de negócio deve existir aqui.
 *
 * ==========================================================
 */

import { Types } from "mongoose";
import Client, { ClientDocument } from "../models/Client.model";
import { UpdateClientDto } from "../dto/UpdateClient.dto";
import { StoredImage } from "../../../providers/images/types";
import { ClientSession } from "mongoose";
import { RepositorySessionOptions } from "../../appointments/repositories/appointment-repository.types";

class ClientRepository {
  /**
   * ==========================================================
   * Busca um cliente pelo ID.
   * ==========================================================
   */
  public async findById(
    id: string | Types.ObjectId,
  ): Promise<ClientDocument | null> {
    return Client.findOne({
      _id: id,
      deletedAt: null,
    });
  }

  /**
   * ==========================================================
   * Busca um cliente pelo ID dentro de uma empresa.
   *
   * O companyId garante o isolamento entre empresas.
   * ==========================================================
   */
  public async findByIdAndCompany(
    id: string | Types.ObjectId,
    companyId: string | Types.ObjectId,
  ): Promise<ClientDocument | null> {
    return Client.findOne({
      _id: id,
      companyId,
      deletedAt: null,
    });
  }

  /**
   * ==========================================================
   * Busca todos os clientes de uma empresa.
   * ==========================================================
   */
  public async findByCompanyId(
    companyId: string | Types.ObjectId,
  ): Promise<ClientDocument[]> {
    return Client.find({
      companyId,
      deletedAt: null,
    }).sort({ name: 1 });
  }

  /**
   * ==========================================================
   * Busca um cliente pelo e-mail dentro de uma empresa.
   *
   * Usado pelo agendamento público para reaproveitar o cliente já
   * cadastrado em vez de duplicar o registo a cada agendamento.
   *
   * O companyId garante o isolamento entre empresas: um e-mail
   * existente noutra empresa nunca é reutilizado.
   * ==========================================================
   */
  public async findByEmailAndCompany(
    email: string,
    companyId: string | Types.ObjectId,
    options?: RepositorySessionOptions,
  ): Promise<ClientDocument | null> {
    if (!email) {
      return null;
    }

    let query = Client.findOne({
      companyId,
      email: email.trim().toLowerCase(),
      deletedAt: null,
    });

    if (options?.session) {
      query = query.session(options.session);
    }

    return query;
  }

  /**
   * ==========================================================
   * Cria um novo cliente.
   *
   * `phone` é opcional porque o agendamento público pode criar um
   * cliente sem telefone. O fluxo administrativo continua a exigir
   * telefone antes de chegar aqui (`create-client.validator.ts`).
   * ==========================================================
   */
  public async create(
    data: {
      companyId: Types.ObjectId;
      name: string;
      email?: string | null;
      phone?: string | null;
      notes?: string | null;
    },
    options?: RepositorySessionOptions,
  ): Promise<ClientDocument> {
    if (options?.session) {
      const [created] = await Client.create([data], {
        session: options.session,
      });
      return created;
    }

    return Client.create(data);
  }

  /**
   * Serializa reservas concorrentes que partilham o mesmo cliente.
   */
  public async touchBookingSerialization(
    id: string | Types.ObjectId,
    companyId: string | Types.ObjectId,
    session: ClientSession,
  ): Promise<void> {
    await Client.findOneAndUpdate(
      { _id: id, companyId, deletedAt: null },
      { $set: { updatedAt: new Date() } },
      { session, new: false },
    );
  }

  /**
   * ==========================================================
   * Atualiza um cliente.
   *
   * Apenas clientes não eliminados podem ser atualizados.
   * ==========================================================
   */
  public async update(
    id: string,
    companyId: string | Types.ObjectId,
    data: UpdateClientDto,
  ): Promise<ClientDocument | null> {
    return Client.findOneAndUpdate(
      {
        _id: id,
        companyId,
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
   * Persiste apenas a foto do cliente.
   *
   * O repository não conhece o storage: recebe um
   * `StoredImage | null` pronto a gravar.
   * ==========================================================
   */
  public async updateAvatar(
    id: string,
    companyId: string | Types.ObjectId,
    avatar: StoredImage | null,
  ): Promise<ClientDocument | null> {
    return Client.findOneAndUpdate(
      {
        _id: id,
        companyId,
        deletedAt: null,
      },
      { avatar },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  /**
   * ==========================================================
   * Soft Delete.
   *
   * O documento permanece no banco de dados.
   * ==========================================================
   */
  public async softDelete(
    id: string,
    companyId: string | Types.ObjectId,
  ): Promise<void> {
    await Client.findOneAndUpdate(
      {
        _id: id,
        companyId,
        deletedAt: null,
      },
      {
        deletedAt: new Date(),
      },
    );
  }

  /**
   * ==========================================================
   * Ativa um cliente.
   * ==========================================================
   */
  public async activate(
    id: string,
    companyId: string | Types.ObjectId,
  ): Promise<ClientDocument | null> {
    return Client.findOneAndUpdate(
      {
        _id: id,
        companyId,
        deletedAt: null,
      },
      {
        isActive: true,
      },
      {
        new: true,
      },
    );
  }

  /**
   * ==========================================================
   * Desativa um cliente.
   * ==========================================================
   */
  public async deactivate(
    id: string,
    companyId: string | Types.ObjectId,
  ): Promise<ClientDocument | null> {
    return Client.findOneAndUpdate(
      {
        _id: id,
        companyId,
        deletedAt: null,
      },
      {
        isActive: false,
      },
      {
        new: true,
      },
    );
  }
}

export default new ClientRepository();
