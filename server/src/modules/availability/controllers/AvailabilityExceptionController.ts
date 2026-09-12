import { Request, Response } from "express";
import AvailabilityExceptionService from "../services/AvailabilityExceptionService";
import { ResponseHandler } from "../../../utils/response";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";

class AvailabilityExceptionController {
  public create = async (req: Request, res: Response) =>
    ResponseHandler.success(
      res,
      await AvailabilityExceptionService.create(
        req.body,
        req.user!.companyId,
      ),
      HttpMessages.AVAILABILITY_EXCEPTION_CREATED,
      HttpStatus.CREATED,
    );

  public findAll = async (req: Request, res: Response) =>
    ResponseHandler.success(
      res,
      await AvailabilityExceptionService.findAll(
        req.user!.companyId,
        typeof req.query.employeeId === "string"
          ? req.query.employeeId
          : undefined,
      ),
      HttpMessages.AVAILABILITY_EXCEPTIONS_FOUND,
    );

  public findById = async (req: Request, res: Response) =>
    ResponseHandler.success(
      res,
      await AvailabilityExceptionService.findById(
        req.params.id as string,
        req.user!.companyId,
      ),
      HttpMessages.AVAILABILITY_EXCEPTION_FOUND,
    );

  public update = async (req: Request, res: Response) =>
    ResponseHandler.success(
      res,
      await AvailabilityExceptionService.update(
        req.params.id as string,
        req.body,
        req.user!.companyId,
      ),
      HttpMessages.AVAILABILITY_EXCEPTION_UPDATED,
    );

  public delete = async (req: Request, res: Response) => {
    await AvailabilityExceptionService.delete(
      req.params.id as string,
      req.user!.companyId,
    );
    return ResponseHandler.success(
      res,
      null,
      HttpMessages.AVAILABILITY_EXCEPTION_DELETED,
    );
  };
}

export default new AvailabilityExceptionController();