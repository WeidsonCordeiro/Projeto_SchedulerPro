/**
 * ==========================================================
 * Arquivo: routes/index.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Centralizar todas as rotas da API.
 *
 * Cada módulo (Auth, Users, Company...)
 * possuirá seu próprio arquivo de rotas.
 *
 * Este arquivo apenas importa e registra
 * todos eles.
 * ==========================================================
 */

import { Router } from "express";
import { ResponseHandler } from "../utils/response";
import authRoutes from "../modules/auth/routes/AuthRoutes";
import userRoutes from "../modules/users/routes/UserRoutes";
import CompanyRoutes from "../modules/companies/routes/CompanyRoutes";
import serviceRoutes from "../modules/services/routes/ServiceRoutes";
import ClientRoutes from "../modules/Clients/routes/ClientRoutes";
import appointmentRoutes from "../modules/appointments/routes/AppointmentRoutes";
import publicAppointmentRoutes from "../modules/appointments/routes/PublicAppointmentRoutes";
import publicBookingRoutes from "../modules/public-booking/routes/PublicBookingRoutes";
import availabilityRoutes from "../modules/availability/routes/AvailabilityRoutes";
import availabilityExceptionRoutes from "../modules/availability/routes/AvailabilityExceptionRoutes";
import reportRoutes from "../modules/reports/routes/ReportRoutes";
import notificationRoutes from "../modules/notifications/routes/NotificationRoutes";
import publicClientInviteRoutes from "../modules/client-invites/routes/PublicClientInviteRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/companies", CompanyRoutes);
router.use("/services", serviceRoutes);
router.use("/clients", ClientRoutes);
router.use("/appointments", appointmentRoutes);

/**
 * ==========================================================
 * Rotas públicas (sem autenticação).
 *
 * O tenant vem sempre da URL: /public/companies/:companyId.
 *
 * Duas surfaces distintas, montadas no mesmo prefixo porque os
 * caminhos não colidem:
 *
 * • `publicAppointmentRoutes` — marcar, consultar, alterar e
 *   cancelar por token (Partes 1 e 2).
 * • `publicBookingRoutes` — catálogo de serviços,
 *   profissionais e horários disponíveis (Parte 4).
 * ==========================================================
 */
router.use("/public", publicAppointmentRoutes);
router.use("/public", publicBookingRoutes);
/**
 * Convites de conta CLIENT (Stage 32): superfície pública
 * sem autenticação — o token do convite (corpo do pedido) é a
 * credencial, com expiração e uso único.
 */
router.use("/public", publicClientInviteRoutes);
router.use("/availability", availabilityRoutes);
router.use("/availability-exceptions", availabilityExceptionRoutes);
router.use("/reports", reportRoutes);
router.use("/notifications", notificationRoutes);

/**
 * Health Check
 * ==========================================================
 * Para verificar se a API está viva.
 */
router.get("/health", (_req, res) => {
  return ResponseHandler.success(
    res,

    {
      uptime: process.uptime(),
      timestamp: new Date(),
    },

    "API funcionando.",
  );
});

export default router;
