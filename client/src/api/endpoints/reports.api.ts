import { apiClient } from "../apiClient";
import type { ApiResponse } from "../../types/api";
import type {
  ReportCancellations,
  ReportClients,
  ReportEmployee,
  ReportOverview,
  ReportRevenue,
  ReportTopService,
} from "../../types/report";

/**
 * Parâmetros de período consultados nos relatórios.
 *
 * startAt e endAt são instantes ISO 8601 em UTC, calculados no
 * timezone da empresa pelo frontend (config/reportPeriod.ts).
 * O backend deriva a empresa da sessão autenticada.
 */
export interface GetReportsParams {
  startAt?: string;
  endAt?: string;
}

export interface GetRankingReportsParams extends GetReportsParams {
  limit?: number;
}

export const reportsApi = {
  async getOverview(params?: GetReportsParams) {
    const { data } = params
      ? await apiClient.get<ApiResponse<ReportOverview>>("/reports/overview", {
          params,
        })
      : await apiClient.get<ApiResponse<ReportOverview>>("/reports/overview");
    return data;
  },

  async getRevenue(params?: GetReportsParams) {
    const { data } = params
      ? await apiClient.get<ApiResponse<ReportRevenue>>("/reports/revenue", {
          params,
        })
      : await apiClient.get<ApiResponse<ReportRevenue>>("/reports/revenue");
    return data;
  },

  async getTopServices(params?: GetRankingReportsParams) {
    const { data } = params
      ? await apiClient.get<ApiResponse<ReportTopService[]>>(
          "/reports/top-services",
          { params },
        )
      : await apiClient.get<ApiResponse<ReportTopService[]>>(
          "/reports/top-services",
        );
    return data;
  },

  async getEmployees(params?: GetReportsParams) {
    const { data } = params
      ? await apiClient.get<ApiResponse<ReportEmployee[]>>("/reports/employees", {
          params,
        })
      : await apiClient.get<ApiResponse<ReportEmployee[]>>("/reports/employees");
    return data;
  },

  async getClients(params?: GetRankingReportsParams) {
    const { data } = params
      ? await apiClient.get<ApiResponse<ReportClients>>("/reports/clients", {
          params,
        })
      : await apiClient.get<ApiResponse<ReportClients>>("/reports/clients");
    return data;
  },

  async getCancellations(params?: GetReportsParams) {
    const { data } = params
      ? await apiClient.get<ApiResponse<ReportCancellations>>(
          "/reports/cancellations",
          { params },
        )
      : await apiClient.get<ApiResponse<ReportCancellations>>(
          "/reports/cancellations",
        );
    return data;
  },
};

export default reportsApi;