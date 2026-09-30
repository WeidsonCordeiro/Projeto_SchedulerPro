import { Request, Response } from "express";
import AvailabilityService from "../services/AvailabilityService";
import { ResponseHandler } from "../../../utils/response";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";

class AvailabilityController {
  public create = async (req: Request, res: Response) =>
    ResponseHandler.success(
      res,
      await AvailabilityService.create(req.body, req.user!.companyId),
      HttpMessages.AVAILABILITY_CREATED,
      HttpStatus.CREATED,
    );

  public findAll = async (req: Request, res: Response) =>
    ResponseHandler.success(
      res,
      await AvailabilityService.findAll(req.user!.companyId),
      HttpMessages.AVAILABILITIES_FOUND,
    );

  public findByEmployeeId = async (req: Request, res: Response) =>
    ResponseHandler.success(
      res,
      await AvailabilityService.findByEmployeeId(
        req.params.employeeId as string,
        req.user!.companyId,
      ),
      HttpMessages.AVAILABILITIES_FOUND,
    );

  public findById = async (req: Request, res: Response) =>
    ResponseHandler.success(
      res,
      await AvailabilityService.findById(
        req.params.id as string,
        req.user!.companyId,
      ),
      HttpMessages.AVAILABILITY_FOUND,
    );

  public update = async (req: Request, res: Response) =>
    ResponseHandler.success(
      res,
      await AvailabilityService.update(
        req.params.id as string,
        req.body,
        req.user!.companyId,
      ),
      HttpMessages.AVAILABILITY_UPDATED,
    );
  public delete = async (req: Request, res: Response) => {
    await AvailabilityService.delete(
      req.params.id as string,
      req.user!.companyId,
    );
    return ResponseHandler.success(
      res,
      null,
      HttpMessages.AVAILABILITY_DELETED,
    );
  };
}
export default new AvailabilityController();
