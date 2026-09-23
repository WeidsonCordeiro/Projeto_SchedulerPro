/**
 * ==========================================================
 * Arquivo: NotificationController.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Receber as requisições HTTP relacionadas às notificações
 * internas e delegar as regras de negócio para o
 * NotificationService.
 *
 * A empresa e o utilizador vêm sempre da sessão autenticada
 * (req.user). Nunca são aceites companyId/userId do query/body.
 *
 * ==========================================================
 */

import { Request, Response } from "express";

import NotificationService from "../services/NotificationService";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import { ResponseHandler } from "../../../utils/response";

class NotificationController {
  private readonly notificationService = NotificationService;

  /**
   * ==========================================================
   * Lista as notificações do utilizador autenticado.
   * ==========================================================
   */
  public list = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    const { limit } = req.query as Record<string, string | undefined>;

    const notifications = await this.notificationService.listForUser(
      companyId,
      userId,
      limit !== undefined ? Number(limit) : undefined,
    );

    return ResponseHandler.success(
      res,
      notifications,
      HttpMessages.NOTIFICATIONS_FOUND,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * Conta as notificações não lidas do utilizador autenticado.
   * ==========================================================
   */
  public getUnreadCount = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    const result = await this.notificationService.getUnreadCount(
      companyId,
      userId,
    );

    return ResponseHandler.success(
      res,
      result,
      HttpMessages.NOTIFICATION_UNREAD_COUNT_FOUND,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * Marca uma notificação como lida.
   * ==========================================================
   */
  public markAsRead = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    const notification = await this.notificationService.markAsRead(
      req.params.id as string,
      companyId,
      userId,
    );

    return ResponseHandler.success(
      res,
      notification,
      HttpMessages.NOTIFICATION_READ,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * Marca todas as notificações do utilizador como lidas.
   * ==========================================================
   */
  public markAllAsRead = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    const result = await this.notificationService.markAllAsRead(
      companyId,
      userId,
    );

    return ResponseHandler.success(
      res,
      result,
      HttpMessages.NOTIFICATIONS_READ,
      HttpStatus.OK,
    );
  };
}

export default new NotificationController();