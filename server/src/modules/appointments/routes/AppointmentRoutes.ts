/**

* ==========================================================
* Arquivo: AppointmentRoutes.ts
* 
* Responsabilidade:
*
* Definir as rotas relacionadas aos agendamentos.
*
* ==========================================================
  */

import { Router } from "express";

import AppointmentController from "../controllers/AppointmentController";
import AuthMiddleware from "../../../middlewares/auth.middleware";
import { validateRequest } from "../../../middlewares/validation.middleware";
import { hasPermission } from "../../../middlewares/permission.middleware";
import { Permission } from "../../../constants/permissions";
import { createAppointmentValidator } from "../validators/create-appointment.validator";
import { updateAppointmentValidator } from "../validators/update-appointment.validator";
import { validateObjectId } from "../../../middlewares/object-id.middleware";

const appointmentRoutes = Router();

/**

* ==========================================================
* Criar agendamento.
* ==========================================================
  */
appointmentRoutes.post(
  "/",
  AuthMiddleware.authenticate,
  hasPermission(Permission.APPOINTMENT_CREATE),
  createAppointmentValidator,
  validateRequest,
  AppointmentController.create,
);

/**

* ==========================================================
* Listar agendamentos.
* ==========================================================
  */
appointmentRoutes.get(
  "/",
  AuthMiddleware.authenticate,
  hasPermission(Permission.APPOINTMENT_READ),
  AppointmentController.findAll,
);

/**
 * ==========================================================
 * Confirma um agendamento.
 * ==========================================================
 */
appointmentRoutes.patch(
  "/:id/confirm",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.APPOINTMENT_UPDATE),
  AppointmentController.confirm,
);

/**
 * ==========================================================
 * Conclui um agendamento.
 * ==========================================================
 */
appointmentRoutes.patch(
  "/:id/complete",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.APPOINTMENT_UPDATE),
  AppointmentController.complete,
);

/**
 * ==========================================================
 * Cancela um agendamento.
 * ==========================================================
 */
appointmentRoutes.patch(
  "/:id/cancel",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.APPOINTMENT_UPDATE),
  AppointmentController.cancel,
);

/**
 * ==========================================================
 * Marca como não compareceu.
 * ==========================================================
 */
appointmentRoutes.patch(
  "/:id/no-show",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.APPOINTMENT_UPDATE),
  AppointmentController.markAsNoShow,
);

/**

* ==========================================================
* Buscar agendamento pelo ID.
* ==========================================================
  */
appointmentRoutes.get(
  "/:id",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.APPOINTMENT_READ),
  AppointmentController.findById,
);

/**

* ==========================================================
* Atualizar agendamento.
* ==========================================================
  */
appointmentRoutes.patch(
  "/:id",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.APPOINTMENT_UPDATE),
  updateAppointmentValidator,
  validateRequest,
  AppointmentController.update,
);

/**

* ==========================================================
* Remover agendamento.
*
* Soft delete.
* ==========================================================
  */
appointmentRoutes.delete(
  "/:id",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.APPOINTMENT_DELETE),
  AppointmentController.delete,
);

export default appointmentRoutes;
