/**

* ==========================================================
* Arquivo: PublicAppointmentRoutes.ts
*
* Responsabilidade:
*
* Definir as rotas PÚBLICAS de agendamento (sem autenticação).
*
* A empresa (tenant) faz parte da URL:
*
*   POST /api/public/companies/:companyId/appointments
*
* O companyId nunca é aceite no corpo do pedido: é o que
* impede que um pedido público crie um agendamento noutra
* empresa.
*
* ==========================================================
  */

import { Router } from "express";

import PublicAppointmentController from "../controllers/PublicAppointmentController";
import { createPublicAppointmentValidator } from "../validators/create-public-appointment.validator";
import { validateRequest } from "../../../middlewares/validation.middleware";
import { validateObjectId } from "../../../middlewares/object-id.middleware";
import { publicBookingRateLimit } from "../../../middlewares/public-booking-rate-limit.middleware";

const publicAppointmentRoutes = Router();

/**
 * ==========================================================
 * Criar agendamento sem autenticação.
 *
 * Ordem deliberada:
 *
 * 1. rate limit (antes de qualquer trabalho de base de dados);
 * 2. validação do ObjectId do tenant;
 * 3. validação do corpo (inclui rejeição de campos extras);
 * 4. controller (regras de negócio).
 *
 * Não há `AuthMiddleware.authenticate`, `authorize` nem
 * `hasPermission`: este endpoint é público por definição.
 * ==========================================================
 */
publicAppointmentRoutes.post(
  "/companies/:companyId/appointments",
  publicBookingRateLimit,
  validateObjectId("companyId"),
  createPublicAppointmentValidator,
  validateRequest,
  PublicAppointmentController.create,
);

export default publicAppointmentRoutes;