import type { AppointmentStatus } from "./appointment";

/**
 * Contratos de resposta dos relatórios operacionais.
 * Espelham os tipos retornados por server/src/modules/reports.
 */

export interface ReportOverview {
  total: number;
  byStatus: Record<AppointmentStatus, number>;
}

export interface ReportRevenue {
  completedCount: number;
  estimatedRevenue: number;
  forecastCount: number;
  forecastRevenue: number;
  /**
   * Agendamentos concluídos/previstos sem preço histórico conhecido.
   * Não são valorizados com o preço atual; são sinalizados ao
   * utilizador para que a receita estimada não seja enganadora.
   */
  completedWithoutPrice?: number;
  forecastWithoutPrice?: number;
}

export interface ReportTopService {
  serviceId: string;
  name: string | null;
  count: number;
  completedCount: number;
  estimatedRevenue: number;
  completedWithoutPrice?: number;
}

export interface ReportEmployee {
  employeeId: string;
  name: string | null;
  count: number;
  completedCount: number;
  cancelledCount: number;
  estimatedRevenue: number;
  completedWithoutPrice?: number;
}

export interface ReportClientRank {
  clientId: string;
  name: string | null;
  count: number;
  completedCount: number;
  estimatedRevenue: number;
  completedWithoutPrice?: number;
}

export interface ReportClients {
  totalClients: number;
  recurringCount: number;
  topClients: ReportClientRank[];
}

export interface ReportCancellations {
  total: number;
  cancelledCount: number;
  cancellationRate: number;
}