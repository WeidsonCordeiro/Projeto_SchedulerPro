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

class PublicAppointmentController {
  /**
   * ==========================================================
   * Cria um agendamento para uma pessoa sem conta.
   *
   * Sucesso: 201 com o contrato público do agendamento.
   * ==========================================================
   */
  public create = async (req: Request, res: Response) => {
    const companyId = req.params.companyId as string;

    const appointment = await AppointmentService.createPublic(
      req.body,
      companyId,
    );

    return ResponseHandler.success(
      res,
      appointment,
      HttpMessages.APPOINTMENT_CREATED,
      HttpStatus.CREATED,
    );
  };
}

export default new PublicAppointmentController();