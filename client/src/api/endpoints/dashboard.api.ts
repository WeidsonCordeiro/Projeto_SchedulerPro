import { apiClient } from "../apiClient";
import type { ApiResponse } from "../../types/api";
import type { DashboardSummary } from "../../types/dashboard";

/**
 * Período [startAt, endAt) em UTC — calculado no timezone da empresa
 * (config/reportPeriod.ts). companyId nunca é enviado.
 */
export interface GetDashboardSummaryParams {
  startAt: string;
  endAt: string;
  upcomingLimit?: number;
}

export const dashboardApi = {
  async getSummary(params: GetDashboardSummaryParams) {
    const { data } = await apiClient.get<ApiResponse<DashboardSummary>>(
      "/dashboard/summary",
      { params },
    );
    return data;
  },
};

export default dashboardApi;
