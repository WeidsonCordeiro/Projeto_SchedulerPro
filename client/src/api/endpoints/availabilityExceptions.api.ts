import { apiClient } from "../apiClient";
import type { ApiResponse } from "../../types/api";
import type {
  AvailabilityException,
  CreateAvailabilityExceptionPayload,
  UpdateAvailabilityExceptionPayload,
} from "../../types/availabilityException";

export const availabilityExceptionApi = {
  async getAvailabilityExceptions(employeeId?: string) {
    const query = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : "";
    const { data } = await apiClient.get<ApiResponse<AvailabilityException[]>>(
      `/availability-exceptions${query}`,
    );
    return data;
  },

  async getAvailabilityException(id: string) {
    const { data } = await apiClient.get<ApiResponse<AvailabilityException>>(
      `/availability-exceptions/${id}`,
    );
    return data;
  },

  async createAvailabilityException(payload: CreateAvailabilityExceptionPayload) {
    const { data } = await apiClient.post<ApiResponse<AvailabilityException>>(
      "/availability-exceptions",
      payload,
    );
    return data;
  },

  async updateAvailabilityException(
    id: string,
    payload: UpdateAvailabilityExceptionPayload,
  ) {
    const { data } = await apiClient.patch<ApiResponse<AvailabilityException>>(
      `/availability-exceptions/${id}`,
      payload,
    );
    return data;
  },

  async deleteAvailabilityException(id: string) {
    const { data } = await apiClient.delete<ApiResponse<null>>(
      `/availability-exceptions/${id}`,
    );
    return data;
  },
};

export default availabilityExceptionApi;