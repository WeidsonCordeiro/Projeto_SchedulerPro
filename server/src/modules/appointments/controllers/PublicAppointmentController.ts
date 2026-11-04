/**

* ==========================================================
* Arquivo: PublicAppointmentController.ts
* ---
* Responsabilidade:
*
* Receber o pedido público de criação de agendamento e
* delegar as regras de negócio ao AppointmentService.
*
* Esta rota NÃO é autenticada. O `companyId` provém
* exclusivamente do parâmetro de URL — nunca do corpo —
* para manter o isolamento multi-tenant.
* ==========================================================
  */

import { Request, Response } from "express";

import AppointmentService from "../services/AppointmentService";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import { ResponseHandler } from "../../../utils/response";

/**
 * ==========================================================
 * Lê o token da URL.
 *
 * Só rejeita formatos estruturalmente impossíveis. Um token
 * bem formado mas inexistente é resolvido no serviço, para que
 * o `404` seja idêntico em todos os casos de falha.
 * ==========================================================
 */
function readToken(req: Request): unknown {
  return req.params.token;
}

class PublicAppointmentController {
  /**
   * ==========================================================
   * Cria um agendamento para uma pessoa sem conta.
   *
   * Sucesso: 201 com o contrato público do agendamento e o
   * token de acesso, devolvidos UMA ÚNCA vez. A partir deste
   * momento só o hash fica guardado.
   * ==========================================================
   */
  public create = async (req: Request, res: Response) => {
    const companyId = req.params.companyId as string;

    const result = await AppointmentService.createPublic(
      req.body,
      companyId,
    );

    return ResponseHandler.success(
      res,
      result,
      HttpMessages.APPOINTMENT_CREATED,
      HttpStatus.CREATED,
    );
  };

  /**
   * ==========================================================
   * Consulta o agendamento pelo link público.
   * ==========================================================
   */
  public findByToken = async (req: Request, res: Response) => {
    const appointment = await AppointmentService.findPublicByToken(
      readToken(req),
    );

    return ResponseHandler.success(
      res,
      appointment,
      HttpMessages.APPOINTMENT_FOUND,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * Altera o agendamento pelo link público.
   *
   * O corpo só pode conter `serviceId`, `employeeId`,
   * `startAt` e `notes`. Qualquer outro campo é rejeitado pelo
   * validator com `400`.
   * ==========================================================
   */
  public updateByToken = async (req: Request, res: Response) => {
    const appointment = await AppointmentService.updatePublicByToken(
      readToken(req),
      req.body,
    );

    return ResponseHandler.success(
      res,
      appointment,
      HttpMessages.APPOINTMENT_UPDATED,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * Cancela o agendamento pelo link público.
   *
   * A transição é controlada pelo backend, a partir do estado
   * atual. O corpo não é lido: qualquer campo, `status` incluído,
   * já foi recusado com `400` pelo validador da rota.
   *
   * Idempotente: repetir o cancelamento devolve `200` com o
   * estado atual.
   * ==========================================================
   */
  public cancelByToken = async (req: Request, res: Response) => {
    const appointment = await AppointmentService.cancelPublicByToken(
      readToken(req),
    );

    return ResponseHandler.success(
      res,
      appointment,
      HttpMessages.APPOINTMENT_CANCELLED,
      HttpStatus.OK,
    );
  };
}

export default new PublicAppointmentController();