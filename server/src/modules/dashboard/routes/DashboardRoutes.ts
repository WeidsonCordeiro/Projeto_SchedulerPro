import { Router } from "express";

import DashboardController from "../controllers/DashboardController";
import AuthMiddleware from "../../../middlewares/auth.middleware";
import PasswordChangeMiddleware from "../../../middlewares/require-password-change.middleware";
import RequireOperationalCompanyMiddleware from "../../../middlewares/require-operational-company.middleware";
import { hasPermission } from "../../../middlewares/permission.middleware";
import { authorize } from "../../../middlewares/role.middleware";
import { Permission } from "../../../constants/permissions";
import { Role } from "../../../constants/roles";
import { validateRequest } from "../../../middlewares/validation.middleware";
import { dashboardSummaryValidator } from "../validators/dashboard-summary.validator";

const dashboardRoutes = Router();

const dashboardGuards = [
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  RequireOperationalCompanyMiddleware.requireOperationalCompany,
  authorize(Role.OWNER, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE),
  hasPermission(Permission.APPOINTMENT_READ),
  dashboardSummaryValidator,
  validateRequest,
];

dashboardRoutes.get("/summary", ...dashboardGuards, DashboardController.getSummary);

export default dashboardRoutes;
