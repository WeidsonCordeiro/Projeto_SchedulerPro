/**
 * ==========================================================
 * Arquivo: index.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Centralizar as tipagens internas e de resposta do módulo
 * de notificações.
 *
 * Notificações internas são criadas automaticamente quando um
 * agendamento é criado, atualizado ou cancelado e entregues a
 * todos os utilizadores internos da empresa (OWNER, ADMIN,
 * MANAGER e EMPLOYEE). O CLIENT não recebe notificação interna:
 * recebe apenas o e-mail do agendamento.
 * ==========================================================
 */

import { Types } from "mongoose";

/**
 * Tipos de notificação suportados.
 *
 * Cada tipo corresponde a um evento de agendamento.
 */
export enum NotificationType {
  APPOINTMENT_CREATED = "APPOINTMENT_CREATED",
  APPOINTMENT_UPDATED = "APPOINTMENT_UPDATED",
  APPOINTMENT_CANCELLED = "APPOINTMENT_CANCELLED",
}

/**
 * Dados utilizados para persistir uma notificação interna.
 */
export interface CreateNotificationData {
  companyId: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: {
    appointmentId?: Types.ObjectId | null;
    clientId?: Types.ObjectId | null;
    serviceId?: Types.ObjectId | null;
    employeeId?: Types.ObjectId | null;
  };
}

/**
 * Tipos de resposta da API (contrato com o frontend).
 */
export interface NotificationResponse {
  id: string;
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string | null;
  metadata: {
    appointmentId: string | null;
    clientId: string | null;
    serviceId: string | null;
    employeeId: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Relatório de não lidas da API.
 */
export interface UnreadCountResponse {
  unreadCount: number;
}

/**
 * Resultado de "marcar todas como lidas".
 */
export interface MarkAllReadResult {
  markedRead: number;
}

/**
 * Limite padrão da listagem de notificações.
 */
export const DEFAULT_NOTIFICATIONS_LIMIT = 50;