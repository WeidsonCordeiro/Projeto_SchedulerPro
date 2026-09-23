/**
 * ==========================================================
 * Arquivo: NotificationService.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Implementar as regras de negócio de consulta e leitura das
 * notificações internas do utilizador autenticado.
 *
 * Toda operação é escopada à empresa e ao utilizador da
 * sessão (companyId/userId vindos do req.user). Nunca é aceite
 * um companyId ou userId vindo do query/body.
 *
 * ==========================================================
 */

import NotificationRepository from "../repositories/NotificationRepository";
import NotificationMapper from "../mappers/NotificationMapper";
import { AppError } from "../../../errors/AppError";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import {
  DEFAULT_NOTIFICATIONS_LIMIT,
  MarkAllReadResult,
  NotificationResponse,
  UnreadCountResponse,
} from "../index";

class NotificationService {
  private readonly notificationRepository = NotificationRepository;

  /**
   * ==========================================================
   * Lista as notificações do utilizador autenticado.
   *
   * Mais recentes primeiro, limitadas por `limit`
   * (padrão: DEFAULT_NOTIFICATIONS_LIMIT).
   * ==========================================================
   */
  public async listForUser(
    companyId: string,
    userId: string,
    limit?: number,
  ): Promise<NotificationResponse[]> {
    const notifications = await this.notificationRepository.findByUser(
      companyId,
      userId,
      limit ?? DEFAULT_NOTIFICATIONS_LIMIT,
    );

    return notifications.map(NotificationMapper.toResponse);
  }

  /**
   * ==========================================================
   * Conta as notificações não lidas do utilizador autenticado.
   * ==========================================================
   */
  public async getUnreadCount(
    companyId: string,
    userId: string,
  ): Promise<UnreadCountResponse> {
    const unreadCount = await this.notificationRepository.countUnread(
      companyId,
      userId,
    );

    return { unreadCount };
  }

  /**
   * ==========================================================
   * Marca uma notificação como lida.
   *
   * A notificação precisa pertencer ao utilizador e à empresa
   * da sessão; caso contrário é tratada como inexistente.
   * ==========================================================
   */
  public async markAsRead(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<NotificationResponse> {
    const notification = await this.notificationRepository.markAsRead(
      id,
      companyId,
      userId,
      new Date(),
    );

    if (!notification) {
      throw new AppError(
        HttpMessages.NOTIFICATION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    return NotificationMapper.toResponse(notification);
  }

  /**
   * ==========================================================
   * Marca todas as notificações do utilizador como lidas.
   * ==========================================================
   */
  public async markAllAsRead(
    companyId: string,
    userId: string,
  ): Promise<MarkAllReadResult> {
    const markedRead = await this.notificationRepository.markAllAsRead(
      companyId,
      userId,
      new Date(),
    );

    return { markedRead };
  }
}

export default new NotificationService();