import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { AppError } from "../errors/AppError";
import { HttpMessages } from "../constants/http-messages";
import { HttpStatus } from "../constants/http-status";

/** Validates MongoDB ObjectId route parameters before entering the controller. */
export function validateObjectId(...parameterNames: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    for (const parameterName of parameterNames) {
      const value = req.params[parameterName];
      if (typeof value !== "string" || !Types.ObjectId.isValid(value)) {
        throw new AppError(HttpMessages.VALIDATION_ERROR, HttpStatus.BAD_REQUEST);
      }
    }
    next();
  };
}
