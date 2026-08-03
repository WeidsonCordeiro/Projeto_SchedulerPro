/**
 * ==========================================================
 * Arquivo: role.middleware.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Validar se o usuário autenticado possui
 * uma determinada função (role).
 *
 * Exemplo:
 *
 * router.get(
 *    "/users",
 *    authenticate,
 *    authorize(Role.ADMIN),
 *    controller.index
 * );
 *
 * ==========================================================
 */

import { NextFunction, Response } from "express";

import { AppError } from "../errors/AppError";
import { HttpStatus } from "../constants/http-status";
import { HttpMessages } from "../constants/http-messages";
import { AuthenticatedRequest } from "../types/AuthenticatedRequest";
import { Role, RoleHierarchy } from "../constants/roles";

export function authorize(...roles: Role[]) /*authorize(minRole: Role)*/ {
  return (req: AuthenticatedRequest, _: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(
        HttpMessages.USER_NOT_UNAUTHORIZED,
        HttpStatus.UNAUTHORIZED
      );
    }

    /*
        const userLevel = RoleHierarchy[req.user.role];
        const requiredLevel = RoleHierarchy[minRole];

        if (userLevel < requiredLevel) {
        throw new AppError(
            HttpMessages.USER_NOT_PERMISSION,
            HttpStatus.FORBIDDEN
        );
        }
    */

    if (!roles.includes(req.user.role)) {
      throw new AppError(
        HttpMessages.USER_NOT_PERMISSION,
        HttpStatus.FORBIDDEN
      );
    }

    next();
  };
}
