/**
 * ==========================================================
 * Arquivo: index.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Centralizar as tipagens internas e de resposta do módulo
 * de relatórios.
 *
 * O módulo é apenas de leitura (GET). Nenhuma operação de
 * escrita é realizada aqui.
 * ==========================================================
 */

import { Types } from "mongoose";
import { AppointmentStatus } from "../../constants/appointment-status";

/**
 * Janela opcional de período em UTC (mesmo contrato de
 * startAt/endAt dos agendamentos). Quando informada, apenas
 * os agendamentos cujo startAt cai no intervalo
 * [startAt, endAt) são considerados.
 *
 * O cálculo do início/fim do período (hoje, semana, mês,
 * personalizado) é feito no timezone da empresa pelo
 * frontend antes de converter para UTC.
 */
export interface ReportRange {
  startAt?: Date;
  endAt?: Date;
}

/* ==========================================================
 * Dados brutos retornados pelo ReportRepository
 * ========================================================== */

export interface StatusCountRow {
  status: string;
  count: number;
}

export interface RevenueAggregateRow {
  completedCount: number;
  estimatedRevenue: number;
  forecastCount: number;
  forecastRevenue: number;
}

export interface TopServiceRow {
  serviceId: Types.ObjectId;
  name: string | null;
  count: number;
  completedCount: number;
  estimatedRevenue: number;
}

export interface EmployeeRow {
  employeeId: Types.ObjectId;
  name: string | null;
  count: number;
  completedCount: number;
  cancelledCount: number;
  estimatedRevenue: number;
}

export interface ClientTopRow {
  clientId: Types.ObjectId;
  name: string | null;
  count: number;
  completedCount: number;
  estimatedRevenue: number;
}

export interface ClientMetricsAggregate {
  totalClients: number;
  recurringCount: number;
  topClients: ClientTopRow[];
}

/* ==========================================================
 * Tipos de resposta da API (contrato com o frontend)
 * ========================================================== */

export interface ReportOverview {
  total: number;
  byStatus: Record<AppointmentStatus, number>;
}

export interface ReportRevenue {
  completedCount: number;
  estimatedRevenue: number;
  forecastCount: number;
  forecastRevenue: number;
}

export interface ReportTopService {
  serviceId: string;
  name: string | null;
  count: number;
  completedCount: number;
  estimatedRevenue: number;
}

export interface ReportEmployee {
  employeeId: string;
  name: string | null;
  count: number;
  completedCount: number;
  cancelledCount: number;
  estimatedRevenue: number;
}

export interface ReportClientRank {
  clientId: string;
  name: string | null;
  count: number;
  completedCount: number;
  estimatedRevenue: number;
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

/**
 * Limite padrão dos rankings (serviços/clientes).
 */
export const DEFAULT_REPORT_LIMIT = 5;