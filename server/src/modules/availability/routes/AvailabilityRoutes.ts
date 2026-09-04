import { Router } from "express";
import AvailabilityController from "../controllers/AvailabilityController";
import AuthMiddleware from "../../../middlewares/auth.middleware";
import { hasPermission } from "../../../middlewares/permission.middleware";
import { validateRequest } from "../../../middlewares/validation.middleware";
import { Permission } from "../../../constants/permissions";
import { createAvailabilityValidator } from "../validators/create-availability.validator";
import { updateAvailabilityValidator } from "../validators/update-availability.validator";
import { validateObjectId } from "../../../middlewares/object-id.middleware";

const routes = Router();

routes.post(
  "/",
  AuthMiddleware.authenticate,
  hasPermission(Permission.AVAILABILITY_CREATE),
  createAvailabilityValidator,
  validateRequest,
  AvailabilityController.create,
);

routes.get(
  "/",
  AuthMiddleware.authenticate,
  hasPermission(Permission.AVAILABILITY_READ),
  AvailabilityController.findAll,
);

routes.get(
  "/employee/:employeeId",
  AuthMiddleware.authenticate,
  validateObjectId("employeeId"),
  hasPermission(Permission.AVAILABILITY_READ),
  AvailabilityController.findByEmployeeId,
);

routes.get(
  "/:id",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.AVAILABILITY_READ),
  AvailabilityController.findById,
);

routes.patch(
  "/:id",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.AVAILABILITY_UPDATE),
  updateAvailabilityValidator,
  validateRequest,
  AvailabilityController.update,
);

routes.delete(
  "/:id",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.AVAILABILITY_DELETE),
  AvailabilityController.delete,
);

export default routes;
