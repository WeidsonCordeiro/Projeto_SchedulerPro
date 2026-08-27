/**

* ==========================================================
* Arquivo: AppointmentController.ts
* ---
* Responsabilidade:
*
* Receber as requisições HTTP relacionadas aos
* agendamentos e delegar as regras de negócio
* para o AppointmentService.
*
* ==========================================================
  */

import { Request, Response } from "express";

import AppointmentService from "../services/AppointmentService";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import { ResponseHandler } from "../../../utils/response";

class AppointmentController {
  private readonly appointmentService = AppointmentService;
  /**

* ==========================================================
* Cria um novo agendamento.
* ==========================================================
  */
  public create = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;
    const appointment = await this.appointmentService.create(
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

  /**

* ==========================================================
* Lista os agendamentos da empresa.
* ==========================================================
  */
  public findAll = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;

    const appointments = await this.appointmentService.findAll(companyId);

    return ResponseHandler.success(
      res,
      appointments,
      HttpMessages.APPOINTMENTS_FOUND,
      HttpStatus.OK,
    );
  };

  /**

* ==========================================================
* Busca um agendamento pelo ID.
* ==========================================================
  */
  public findById = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;

    const appointment = await this.appointmentService.findById(
      req.params.id as string,
      companyId,
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
* Atualiza um agendamento.
* ==========================================================
  */
  public update = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;

    const appointment = await this.appointmentService.update(
      req.params.id as string,
      req.body,
      companyId,
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
* Confirma um agendamento.
* ==========================================================
  */
  public confirm = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;

    const appointment = await this.appointmentService.confirm(
      req.params.id as string,
      companyId,
    );

    return ResponseHandler.success(
      res,
      appointment,
      HttpMessages.APPOINTMENT_CONFIRMED,
      HttpStatus.OK,
    );
  };

  /**

* ==========================================================
* Conclui um agendamento.
* ==========================================================
  */
  public complete = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;

    const appointment = await this.appointmentService.complete(
      req.params.id as string,
      companyId,
    );

    return ResponseHandler.success(
      res,
      appointment,
      HttpMessages.APPOINTMENT_COMPLETED,
      HttpStatus.OK,
    );
  };

  /**

* ==========================================================
* Cancela um agendamento.
* ==========================================================
  */
  public cancel = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;

    const appointment = await this.appointmentService.cancel(
      req.params.id as string,
      companyId,
    );

    return ResponseHandler.success(
      res,
      appointment,
      HttpMessages.APPOINTMENT_CANCELLED,
      HttpStatus.OK,
    );
  };

  /**

* ==========================================================
* Marca um agendamento como não comparecido.
* ==========================================================
  */
  public markAsNoShow = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;

    const appointment = await this.appointmentService.markAsNoShow(
      req.params.id as string,
      companyId,
    );

    return ResponseHandler.success(
      res,
      appointment,
      HttpMessages.APPOINTMENT_NO_SHOW,
      HttpStatus.OK,
    );
  };

  /**

* ==========================================================
* Remove um agendamento.
*
* Soft delete.
* ==========================================================
  */
  public delete = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;

    await this.appointmentService.delete(req.params.id as string, companyId);

    return ResponseHandler.success(
      res,
      null,
      HttpMessages.APPOINTMENT_DELETED,
      HttpStatus.OK,
    );
  };
}

export default new AppointmentController();
