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
import { CreateClientDto } from "../dto/CreateClient.dto";
import { UpdateClientDto } from "../dto/UpdateClient.dto";

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
   * Cria um novo cliente.
   * ==========================================================
   */
  public async create(
    data: CreateClientDto & {
      companyId: Types.ObjectId;
    },
  ): Promise<ClientDocument> {
    return Client.create(data);
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
