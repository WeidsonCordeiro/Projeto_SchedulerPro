/**
 * ==========================================================
 * Arquivo: ReportService.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Implementar as regras de negócio dos relatórios.
 *
 * O módulo é apenas de leitura: nenhum agendamento é
 * modificado durante a geração (não há expiração de
 * "scheduled" vencidos, por exemplo).
 *
 * A autorização (OWNER, ADMIN, MANAGER) é garantida pelas
 * rotas. A empresa é sempre derivada da sessão autenticada.
 * ==========================================================
 */

import ReportRepository from "../repositories/ReportRepository";
import {
  AppointmentStatus,
} from "../../../constants/appointment-status";
import {
  DEFAULT_REPORT_LIMIT,
  ReportCancellations,
  ReportClients,
  ReportEmployee,
  ReportOverview,
  ReportRange,
  ReportRevenue,
  ReportTopService,
} from "../index";

class ReportService {
  private readonly reportRepository = ReportRepository;

  /**
   * Ajusta o limite dos rankings para dentro da faixa aceita
   * pelo backend (1..20).
   */
  private normalizeLimit(limit: number | undefined): number {
    if (limit === undefined) {
      return DEFAULT_REPORT_LIMIT;
    }

    if (!Number.isFinite(limit)) {
      return DEFAULT_REPORT_LIMIT;
    }

    return Math.min(20, Math.max(1, Math.trunc(limit)));
  }

  /**
   * ==========================================================
   * Visão geral: total e contagens por status no período.
   * ==========================================================
   */
  public async getOverview(
    companyId: string,
    range: ReportRange = {},
  ): Promise<ReportOverview> {
    const rows = await this.reportRepository.findStatusCounts(companyId, range);

    const byStatus = {
      [AppointmentStatus.SCHEDULED]: 0,
      [AppointmentStatus.CONFIRMED]: 0,
      [AppointmentStatus.COMPLETED]: 0,
      [AppointmentStatus.CANCELLED]: 0,
      [AppointmentStatus.NO_SHOW]: 0,
    };

    let total = 0;

    for (const row of rows) {
      if (row.status in byStatus) {
        byStatus[row.status as AppointmentStatus] = row.count;
      }
      total += row.count;
    }

    return { total, byStatus };
  }

  /**
   * ==========================================================
   * Receita estimada no período.
   *
   * Os valores são estimativas baseadas no preço dos serviços,
   * nunca pagamentos efetivos.
   * ==========================================================
   */
  public async getRevenue(
    companyId: string,
    range: ReportRange = {},
  ): Promise<ReportRevenue> {
    const row = await this.reportRepository.findRevenue(companyId, range);

    return {
      completedCount: row?.completedCount ?? 0,
      estimatedRevenue: row?.estimatedRevenue ?? 0,
      forecastCount: row?.forecastCount ?? 0,
      forecastRevenue: row?.forecastRevenue ?? 0,
    };
  }

  /**
   * ==========================================================
   * Serviços mais realizados no período.
   * ==========================================================
   */
  public async getTopServices(
    companyId: string,
    range: ReportRange = {},
    limit?: number,
  ): Promise<ReportTopService[]> {
    const rows = await this.reportRepository.findTopServices(
      companyId,
      range,
      this.normalizeLimit(limit),
    );

    return rows.map((row) => ({
      serviceId: row.serviceId.toString(),
      name: row.name,
      count: row.count,
      completedCount: row.completedCount,
      estimatedRevenue: row.estimatedRevenue,
    }));
  }

  /**
   * ==========================================================
   * Ranking de funcionários no período.
   *
   * Os dados já são filtrados no agregado para excluir
   * utilizadores com role CLIENT.
   * ==========================================================
   */
  public async getEmployees(
    companyId: string,
    range: ReportRange = {},
  ): Promise<ReportEmployee[]> {
    const rows = await this.reportRepository.findEmployeeMetrics(
      companyId,
      range,
    );

    return rows.map((row) => ({
      employeeId: row.employeeId.toString(),
      name: row.name,
      count: row.count,
      completedCount: row.completedCount,
      cancelledCount: row.cancelledCount,
      estimatedRevenue: row.estimatedRevenue,
    }));
  }

  /**
   * ==========================================================
   * Clientes recorrentes no período.
   * ==========================================================
   */
  public async getClients(
    companyId: string,
    range: ReportRange = {},
    limit?: number,
  ): Promise<ReportClients> {
    const result = await this.reportRepository.findClientMetrics(
      companyId,
      range,
      this.normalizeLimit(limit),
    );

    return {
      totalClients: result.totalClients,
      recurringCount: result.recurringCount,
      topClients: result.topClients.map((row) => ({
        clientId: row.clientId.toString(),
        name: row.name,
        count: row.count,
        completedCount: row.completedCount,
        estimatedRevenue: row.estimatedRevenue,
      })),
    };
  }

  /**
   * ==========================================================
   * Cancelamentos no período.
   *
   * cancellationRate: percentual de cancelamentos sobre o
   * total de agendamentos (0 quando não há agendamentos).
   * ==========================================================
   */
  public async getCancellations(
    companyId: string,
    range: ReportRange = {},
  ): Promise<ReportCancellations> {
    const rows = await this.reportRepository.findStatusCounts(companyId, range);

    let total = 0;
    let cancelledCount = 0;

    for (const row of rows) {
      total += row.count;
      if (row.status === AppointmentStatus.CANCELLED) {
        cancelledCount = row.count;
      }
    }

    const cancellationRate =
      total > 0 ? Math.round((cancelledCount / total) * 10000) / 100 : 0;

    return { total, cancelledCount, cancellationRate };
  }
}

export default new ReportService();