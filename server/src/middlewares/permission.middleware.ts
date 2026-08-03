/**
 * ==========================================================
 * Arquivo: permission.middleware.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Validar se o utilizador possui a permissão
 * necessária para executar uma determinada ação.
 *
 * Fluxo:
 *
 * Request
 *    │
 *    ▼
 * AuthMiddleware
 *    │
 *    ▼
 * RoleMiddleware
 *    │
 *    ▼
 * PermissionMiddleware
 *    │
 *    ▼
 * Controller
 *
 * ==========================================================
 */

import { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/AppError";
import { HttpMessages } from "../constants/http-messages";
import { HttpStatus } from "../constants/http-status";
import { Permission } from "../constants/permissions";
import { RolePermissions } from "../constants/rbac";

export function hasPermission(permission: Permission) {
  return (req: Request, _: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(HttpMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    const permissions = RolePermissions[req.user.role];

    if (!permissions.includes(permission)) {
      throw new AppError(
        HttpMessages.USER_NOT_PREVILEGES,
        HttpStatus.FORBIDDEN
      );
    }

    next();
  };
}
