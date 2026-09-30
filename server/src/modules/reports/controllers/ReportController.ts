/**
 * ==========================================================
 * Arquivo: ReportController.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Receber as requisições HTTP relacionadas aos relatórios e
 * delegar as regras de negócio para o ReportService.
 *
 * A empresa é sempre derivada da sessão autenticada
 * (req.user.companyId). Nunca é aceite um companyId vindo do
 * query/body.
 * ==========================================================
 */

import { Request, Response } from "express";

import ReportService from "../services/ReportService";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import { ResponseHandler } from "../../../utils/response";
import { ReportRange } from "../index";

class ReportController {
  private readonly reportService = ReportService;

  /**
   * Converte os query params de período em um ReportRange.
   *
   * A validação de formato/ordem já foi feita pelo validador;
   * aqui apenas ocorre a conversão para instantes UTC.
   */
  private buildRange(req: Request): ReportRange {
    const { startAt, endAt } = req.query as Record<string, string | undefined>;
    const range: ReportRange = {};

    if (startAt) {
      range.startAt = new Date(startAt);
    }
    if (endAt) {
      range.endAt = new Date(endAt);
    }

    return range;
  }

  private readLimit(req: Request): number | undefined {
    const { limit } = req.query as Record<string, string | undefined>;
    if (limit === undefined) {
      return undefined;
    }
    return Number(limit);
  }

  /**
   * ==========================================================
   * Visão geral de agendamentos.
   * ==========================================================
   */
  public getOverview = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;

    const report = await this.reportService.getOverview(
      companyId,
      this.buildRange(req),
    );

    return ResponseHandler.success(
      res,
      report,
      HttpMessages.REPORT_OVERVIEW_FOUND,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * Receita estimada no período.
   * ==========================================================
   */
  public getRevenue = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;

    const report = await this.reportService.getRevenue(
      companyId,
      this.buildRange(req),
    );

    return ResponseHandler.success(
      res,
      report,
      HttpMessages.REPORT_REVENUE_FOUND,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * Serviços mais realizados no período.
   * ==========================================================
   */
  public getTopServices = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;

    const report = await this.reportService.getTopServices(
      companyId,
      this.buildRange(req),
      this.readLimit(req),
    );

    return ResponseHandler.success(
      res,
      report,
      HttpMessages.REPORT_TOP_SERVICES_FOUND,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * Ranking de funcionários no período.
   * ==========================================================
   */
  public getEmployees = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;

    const report = await this.reportService.getEmployees(
      companyId,
      this.buildRange(req),
    );

    return ResponseHandler.success(
      res,
      report,
      HttpMessages.REPORT_EMPLOYEES_FOUND,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * Clientes recorrentes no período.
   * ==========================================================
   */
  public getClients = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;

    const report = await this.reportService.getClients(
      companyId,
      this.buildRange(req),
      this.readLimit(req),
    );

    return ResponseHandler.success(
      res,
      report,
      HttpMessages.REPORT_CLIENTS_FOUND,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * Cancelamentos no período.
   * ==========================================================
   */
  public getCancellations = async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;

    const report = await this.reportService.getCancellations(
      companyId,
      this.buildRange(req),
    );

    return ResponseHandler.success(
      res,
      report,
      HttpMessages.REPORT_CANCELLATIONS_FOUND,
      HttpStatus.OK,
    );
  };
}

export default new ReportController();