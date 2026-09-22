/**
 * ==========================================================
 * Arquivo: ReportRoutes.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Definir as rotas de consulta dos relatórios operacionais.
 *
 * Autorização: OWNER, ADMIN e MANAGER (reutilizando o RBAC de
 * roles existente — nenhuma permissão nova é criada, pois
 * nenhuma permissão do RolePermissions atual distingue
 * MANAGER de EMPLOYEE; relatórios exigem leitura completa da
 * empresa). CLIENT e EMPLOYEE nunca acessam.
 * ==========================================================
 */

import { Router } from "express";

import ReportController from "../controllers/ReportController";
import AuthMiddleware from "../../../middlewares/auth.middleware";
import { validateRequest } from "../../../middlewares/validation.middleware";
import { authorize } from "../../../middlewares/role.middleware";
import { Role } from "../../../constants/roles";
import { listReportsValidator } from "../validators/list-reports.validator";
import PasswordChangeMiddleware from "../../../middlewares/require-password-change.middleware";

const reportRoutes = Router();

/**
 * Middlewares comuns a todos os endpoints de relatórios.
 */
const reportGuards = [
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  authorize(Role.OWNER, Role.ADMIN, Role.MANAGER),
  listReportsValidator,
  validateRequest,
];

/**
 * ==========================================================
 * Visão geral de agendamentos.
 * ==========================================================
 */
reportRoutes.get("/overview", ...reportGuards, ReportController.getOverview);

/**
 * ==========================================================
 * Receita estimada no período.
 * ==========================================================
 */
reportRoutes.get("/revenue", ...reportGuards, ReportController.getRevenue);

/**
 * ==========================================================
 * Serviços mais realizados no período.
 * ==========================================================
 */
reportRoutes.get(
  "/top-services",
  ...reportGuards,
  ReportController.getTopServices,
);

/**
 * ==========================================================
 * Ranking de funcionários no período.
 * ==========================================================
 */
reportRoutes.get("/employees", ...reportGuards, ReportController.getEmployees);

/**
 * ==========================================================
 * Clientes recorrentes no período.
 * ==========================================================
 */
reportRoutes.get("/clients", ...reportGuards, ReportController.getClients);

/**
 * ==========================================================
 * Cancelamentos no período.
 * ==========================================================
 */
reportRoutes.get(
  "/cancellations",
  ...reportGuards,
  ReportController.getCancellations,
);

export default reportRoutes;