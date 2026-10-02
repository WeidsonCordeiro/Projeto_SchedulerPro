/**

* ==========================================================
* Arquivo: PublicAppointmentRoutes.ts
*
* Responsabilidade:
*
* Definir as rotas PÚBLICAS de agendamento (sem autenticação).
*
* Criação (o tenant vem da URL):
*
*   POST   /api/public/companies/:companyId/appointments
*
* Acesso por link (o token é a credencial; o tenant vem do
* próprio agendamento e nunca da URL):
*
*   GET    /api/public/appointments/:token
*   PATCH  /api/public/appointments/:token
*   DELETE /api/public/appointments/:token
*
* O companyId nunca é aceite no corpo do pedido: é o que
* impede que um pedido público crie um agendamento noutra
* empresa.
*
* Nas rotas por token não há `validateObjectId`: o `:token`
* NÃO é um ObjectId, e aplicar essa validação revelaria a
* quem chama a diferença entre um token malformado e um
* `_id` inválido.
*
* ==========================================================
  */

import { Router } from "express";

import PublicAppointmentController from "../controllers/PublicAppointmentController";
import { createPublicAppointmentValidator } from "../validators/create-public-appointment.validator";
import {
  rejectCancelBodyValidator,
  updatePublicAppointmentValidator,
} from "../validators/update-public-appointment.validator";
import { validateRequest } from "../../../middlewares/validation.middleware";
import { validateObjectId } from "../../../middlewares/object-id.middleware";
import { publicBookingRateLimit } from "../../../middlewares/public-booking-rate-limit.middleware";
import {
  publicAppointmentReadRateLimit,
  publicAppointmentWriteRateLimit,
  publicAppointmentCancelRateLimit,
} from "../../../middlewares/public-appointment-link-rate-limit.middleware";

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

/**
 * ==========================================================
 * Acesso por token público.
 *
 * Sem `AuthMiddleware.authenticate`, `authorize` nem
 * `hasPermission`: o token É a autorização.
 *
 * O limitador vem antes de tudo em cada rota, por isso tokens
 * tentados a erro ou inválidos também contam para o limite.
 *
 * O `PATCH` não usa `validateObjectId` a propósito: o token não
 * é um ObjectId.
 * ==========================================================
 */
publicAppointmentRoutes.get(
  "/appointments/:token",
  publicAppointmentReadRateLimit,
  PublicAppointmentController.findByToken,
);

publicAppointmentRoutes.patch(
  "/appointments/:token",
  publicAppointmentWriteRateLimit,
  updatePublicAppointmentValidator,
  validateRequest,
  PublicAppointmentController.updateByToken,
);

/**
 * ==========================================================
 * Cancelamento público.
 *
 * `DELETE` não recebe body. A transição de estado é controlada
 * pelo backend, a partir do estado atual do agendamento; um
 * corpo com `status` é RECUSADO com 400 em vez de silenciosamente
 * ignorado — um pedido recusado é inequivoco, um pedido
 * ignorado faz o cliente achar que controlou o estado.
 *
 * `{}` (ou nenhum body) continua a ser aceite.
 * ==========================================================
 */
publicAppointmentRoutes.delete(
  "/appointments/:token",
  publicAppointmentCancelRateLimit,
  rejectCancelBodyValidator,
  validateRequest,
  PublicAppointmentController.cancelByToken,
);

export default publicAppointmentRoutes;