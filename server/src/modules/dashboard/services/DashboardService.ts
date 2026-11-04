import AppointmentMapper from "../../appointments/mappers/AppointmentMapper";
import { AppointmentStatus } from "../../../constants/appointment-status";
import DashboardRepository from "../repositories/DashboardRepository";
import {
  DEFAULT_UPCOMING_LIMIT,
  DashboardRange,
  DashboardSummary,
  MAX_UPCOMING_LIMIT,
} from "../index";

class DashboardService {
  private readonly dashboardRepository = DashboardRepository;

  private normalizeUpcomingLimit(limit: number | undefined): number {
    if (limit === undefined) {
      return DEFAULT_UPCOMING_LIMIT;
    }
    if (!Number.isFinite(limit)) {
      return DEFAULT_UPCOMING_LIMIT;
    }
    return Math.min(MAX_UPCOMING_LIMIT, Math.max(1, Math.trunc(limit)));
  }

  private buildByStatus(rows: { status: string; count: number }[]): {
    byStatus: Record<AppointmentStatus, number>;
    total: number;
  } {
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

    return { byStatus, total };
  }

  /**
   * Resumo operacional read-only. Não altera estados de agendamentos.
   */
  public async getSummary(
    companyId: string,
    range: DashboardRange,
    options: { upcomingLimit?: number; now?: Date } = {},
  ): Promise<DashboardSummary> {
    const now = options.now ?? new Date();
    const upcomingLimit = this.normalizeUpcomingLimit(options.upcomingLimit);

    const [statusRows, periodAppointments, upcomingDocuments, activeClientsCount] =
      await Promise.all([
        this.dashboardRepository.findStatusCounts(companyId, range),
        this.dashboardRepository.findAppointmentsInPeriod(companyId, range),
        this.dashboardRepository.findUpcoming(companyId, now, upcomingLimit),
        this.dashboardRepository.countActiveClients(companyId),
      ]);

    const { byStatus, total } = this.buildByStatus(statusRows);

    const todayAppointments = periodAppointments
      .filter((doc) => doc.status !== AppointmentStatus.CANCELLED)
      .map(AppointmentMapper.toResponse);

    return {
      period: {
        startAt: range.startAt.toISOString(),
        endAt: range.endAt.toISOString(),
        total,
        byStatus,
      },
      todayAppointments,
      upcomingAppointments: upcomingDocuments.map(AppointmentMapper.toResponse),
      activeClientsCount,
    };
  }
}

export default new DashboardService();
