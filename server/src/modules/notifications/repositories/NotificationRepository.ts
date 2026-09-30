/**
 * ==========================================================
 * Arquivo: NotificationRepository.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Camada responsável por acessar os dados das notificações
 * internas.
 *
 * Nenhuma regra de negócio deve existir aqui. Toda consulta é
 * sempre escopada pelos critérios informados (companyId e
 * userId) quando pertinentes.
 *
 * ==========================================================
 */

import { Types } from "mongoose";
import Notification, {
  NotificationDocument,
} from "../models/Notification.model";
import { CreateNotificationData } from "../index";

class NotificationRepository {
  /**
   * ==========================================================
   * Busca uma notificação pelo ID.
   * ==========================================================
   */
  public async findById(
    id: string | Types.ObjectId,
  ): Promise<NotificationDocument | null> {
    return Notification.findOne({ _id: id });
  }

  /**
   * ==========================================================
   * Cria várias notificações de uma vez.
   *
   * Usado para entregar o mesmo evento a todos os utilizadores
   * internos da empresa.
   * ==========================================================
   */
  public async createMany(
    data: CreateNotificationData[],
  ): Promise<NotificationDocument[]> {
    if (data.length === 0) {
      return [];
    }
    return Notification.insertMany(data);
  }

  /**
   * ==========================================================
   * Lista as notificações de um utilizador, mais recentes
   * primeiro.
   *
   * A consulta é sempre restrita à empresa e ao utilizador.
   * ==========================================================
   */
  public async findByUser(
    companyId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    limit = 50,
  ): Promise<NotificationDocument[]> {
    return Notification.find({
      companyId,
      userId,
    })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * ==========================================================
   * Conta as notificações não lidas de um utilizador.
   * ==========================================================
   */
  public async countUnread(
    companyId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<number> {
    return Notification.countDocuments({
      companyId,
      userId,
      readAt: null,
    });
  }

  /**
   * ==========================================================
   * Marca uma notificação como lida.
   *
   * Retorna o documento atualizado ou nulo quando a notificação
   * não existe (ou não pertence ao utilizador/empresa).
   * ==========================================================
   */
  public async markAsRead(
    id: string | Types.ObjectId,
    companyId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    readAt: Date,
  ): Promise<NotificationDocument | null> {
    return Notification.findOneAndUpdate(
      {
        _id: id,
        companyId,
        userId,
      },
      { readAt },
      { new: true },
    );
  }

  /**
   * ==========================================================
   * Marca todas as notificações de um utilizador como lidas.
   *
   * Apenas as não lidas são alteradas. Retorna a quantidade
   * de documentos atualizados.
   * ==========================================================
   */
  public async markAllAsRead(
    companyId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    readAt: Date,
  ): Promise<number> {
    const result = await Notification.updateMany(
      {
        companyId,
        userId,
        readAt: null,
      },
      { readAt },
    );

    return result.modifiedCount ?? 0;
  }
}

export default new NotificationRepository();