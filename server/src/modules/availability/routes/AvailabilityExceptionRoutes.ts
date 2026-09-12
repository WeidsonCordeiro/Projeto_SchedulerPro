import { Router } from "express";
import { query } from "express-validator";
import AvailabilityExceptionController from "../controllers/AvailabilityExceptionController";
import AuthMiddleware from "../../../middlewares/auth.middleware";
import { hasPermission } from "../../../middlewares/permission.middleware";
import { validateRequest } from "../../../middlewares/validation.middleware";
import { Permission } from "../../../constants/permissions";
import { createAvailabilityExceptionValidator } from "../validators/create-availability-exception.validator";
import { updateAvailabilityExceptionValidator } from "../validators/update-availability-exception.validator";
import { validateObjectId } from "../../../middlewares/object-id.middleware";
import PasswordChangeMiddleware from "../../../middlewares/require-password-change.middleware";

const routes = Router();

routes.post(
  "/",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.AVAILABILITY_CREATE),
  createAvailabilityExceptionValidator,
  validateRequest,
  AvailabilityExceptionController.create,
);

routes.get(
  "/",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.AVAILABILITY_READ),
  query("employeeId").optional().isMongoId().withMessage("ID do funcionário inválido."),
  validateRequest,
  AvailabilityExceptionController.findAll,
);

routes.get(
  "/:id",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  validateObjectId("id"),
  hasPermission(Permission.AVAILABILITY_READ),
  AvailabilityExceptionController.findById,
);

routes.patch(
  "/:id",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  validateObjectId("id"),
  hasPermission(Permission.AVAILABILITY_UPDATE),
  updateAvailabilityExceptionValidator,
  validateRequest,
  AvailabilityExceptionController.update,
);

routes.delete(
  "/:id",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  validateObjectId("id"),
  hasPermission(Permission.AVAILABILITY_DELETE),
  AvailabilityExceptionController.delete,
);

export default routes;