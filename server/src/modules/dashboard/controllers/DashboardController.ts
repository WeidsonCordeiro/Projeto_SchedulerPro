import { Request, Response } from "express";

import DashboardService from "../services/DashboardService";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import { ResponseHandler } from "../../../utils/response";
import type { DashboardRange } from "../index";

class DashboardController {
  private readonly dashboardService = DashboardService;

  private buildRange(req: Request): DashboardRange {
    const { startAt, endAt } = req.query as Record<string, string>;
    return {
      startAt: new Date(startAt),
      endAt: new Date(endAt),
    };
  }

  private readUpcomingLimit(req: Request): number | undefined {
    const { upcomingLimit } = req.query as Record<string, string | undefined>;
    if (upcomingLimit === undefined) {
      return undefined;
    }
    return Number(upcomingLimit);
  }

  public getSummary = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;

    const summary = await this.dashboardService.getSummary(
      companyId,
      this.buildRange(req),
      { upcomingLimit: this.readUpcomingLimit(req) },
    );

    return ResponseHandler.success(
      res,
      summary,
      HttpMessages.DASHBOARD_SUMMARY_FOUND,
      HttpStatus.OK,
    );
  };
}

export default new DashboardController();
