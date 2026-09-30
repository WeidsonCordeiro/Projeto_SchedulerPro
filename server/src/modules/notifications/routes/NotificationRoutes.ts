/**
 * ==========================================================
 * Arquivo: NotificationRoutes.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Definir as rotas da central de notificações internas.
 *
 * Autorização: OWNER, ADMIN, MANAGER e EMPLOYEE (todos os
 * utilizadores internos). O CLIENT é bloqueado: recebe apenas
 * e-mails de agendamento, nunca notificações internas.
 * Nenhuma permissão nova é criada — reaproveita-se apenas o
 * RBAC de roles existente.
 *
 * ==========================================================
 */

import { Router } from "express";

import NotificationController from "../controllers/NotificationController";
import AuthMiddleware from "../../../middlewares/auth.middleware";
import { validateRequest } from "../../../middlewares/validation.middleware";
import { authorize } from "../../../middlewares/role.middleware";
import { validateObjectId } from "../../../middlewares/object-id.middleware";
import { Role } from "../../../constants/roles";
import { listNotificationsValidator } from "../validators/list-notifications.validator";
import PasswordChangeMiddleware from "../../../middlewares/require-password-change.middleware";

const notificationRoutes = Router();

/**
 * Middlewares comuns a todos os endpoints de notificações.
 */
const notificationGuards = [
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  authorize(Role.OWNER, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE),
];

/**
 * ==========================================================
 * Lista as notificações do utilizador autenticado.
 * ==========================================================
 */
notificationRoutes.get(
  "/",
  ...notificationGuards,
  listNotificationsValidator,
  validateRequest,
  NotificationController.list,
);

/**
 * ==========================================================
 * Conta as notificações não lidas do utilizador autenticado.
 * ==========================================================
 */
notificationRoutes.get(
  "/unread-count",
  ...notificationGuards,
  NotificationController.getUnreadCount,
);

/**
 * ==========================================================
 * Marca todas as notificações do utilizador como lidas.
 *
 * Precisa estar registada antes de "/:id/read".
 * ==========================================================
 */
notificationRoutes.patch(
  "/read-all",
  ...notificationGuards,
  NotificationController.markAllAsRead,
);

/**
 * ==========================================================
 * Marca uma notificação como lida.
 * ==========================================================
 */
notificationRoutes.patch(
  "/:id/read",
  ...notificationGuards,
  validateObjectId("id"),
  NotificationController.markAsRead,
);

export default notificationRoutes;