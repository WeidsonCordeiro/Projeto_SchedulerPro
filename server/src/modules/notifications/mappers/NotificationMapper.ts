/**
 * ==========================================================
 * Arquivo: NotificationMapper.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Transformar documentos de notificação em objetos de resposta
 * da API.
 *
 * ==========================================================
 */

import { NotificationDocument } from "../models/Notification.model";
import { NotificationResponse } from "../index";

class NotificationMapper {
  /**
   * ==========================================================
   * Transforma uma notificação em objeto de resposta.
   * ==========================================================
   */
  public static toResponse(
    notification: NotificationDocument,
  ): NotificationResponse {
    const metadata = notification.metadata ?? {};

    return {
      id: notification._id.toString(),
      companyId: notification.companyId.toString(),
      userId: notification.userId.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      readAt: notification.readAt
        ? notification.readAt.toISOString()
        : null,
      metadata: {
        appointmentId: metadata.appointmentId
          ? metadata.appointmentId.toString()
          : null,
        clientId: metadata.clientId ? metadata.clientId.toString() : null,
        serviceId: metadata.serviceId ? metadata.serviceId.toString() : null,
        employeeId: metadata.employeeId ? metadata.employeeId.toString() : null,
      },
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
    };
  }
}

export default NotificationMapper;