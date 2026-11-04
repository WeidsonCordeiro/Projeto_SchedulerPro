/**
 * ==========================================================
 * Arquivo: ClientInviteController.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Controlar as requisições HTTP relacionadas aos convites de
 * conta CLIENT (emissão autenticada e superfície pública).
 *
 * Nenhuma regra de negócio deve existir aqui: o controller
 * apenas extrai o tenant da sessão, delega ao service e
 * formata a resposta.
 * ==========================================================
 */

import { Request, Response } from "express";

import ClientInviteService from "../services/ClientInviteService";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import { ResponseHandler } from "../../../utils/response";

class ClientInviteController {
  private readonly inviteService = ClientInviteService;

  /**
   * ==========================================================
   * Emite o convite para um cliente da empresa autenticada.
   *
   * O `companyId` vem da sessão; o `clientId` do path — o
   * serviço garante o isolamento entre tenants.
   * ==========================================================
   */
  public create = async (req: Request, res: Response): Promise<Response> => {
    const companyId = req.user!.companyId;
    const actorUserId = req.user!.userId;

    const result = await this.inviteService.createInvite(
      req.params.id as string,
      companyId,
      actorUserId,
    );

    return ResponseHandler.success(
      res,
      result,
      HttpMessages.CLIENT_INVITE_SENT,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * Consulta pública do convite (página de aceite).
   *
   * O token vem NO CORPO, nunca na URL — um token em path
   * apareceria nos registos de acesso.
   * ==========================================================
   */
  public inspect = async (req: Request, res: Response): Promise<Response> => {
    const invite = await this.inviteService.inspect(req.body.token);

    return ResponseHandler.success(
      res,
      invite,
      HttpMessages.CLIENT_INVITE_FOUND,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * Aceite público do convite: cria a conta CLIENT.
   * ==========================================================
   */
  public accept = async (req: Request, res: Response): Promise<Response> => {
    const result = await this.inviteService.accept(req.body.token, req.body);

    return ResponseHandler.success(
      res,
      result,
      HttpMessages.CLIENT_ACCOUNT_CREATED,
      HttpStatus.OK,
    );
  };
}

export default new ClientInviteController();
