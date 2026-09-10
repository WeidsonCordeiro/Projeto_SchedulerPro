import { apiClient } from "../apiClient";
import type { ApiResponse } from "../../types/api";
import type {
  Availability,
  CreateAvailabilityPayload,
  UpdateAvailabilityPayload,
} from "../../types/availability";

export const availabilityApi = {
  async getAvailabilities() {
    const { data } = await apiClient.get<ApiResponse<Availability[]>>(
      "/availability",
    );
    return data;
  },

  async getEmployeeAvailabilities(employeeId: string) {
    const { data } = await apiClient.get<ApiResponse<Availability[]>>(
      `/availability/employee/${employeeId}`,
    );
    return data;
  },

  async getAvailability(id: string) {
    const { data } = await apiClient.get<ApiResponse<Availability>>(
      `/availability/${id}`,
    );
    return data;
  },

  async createAvailability(payload: CreateAvailabilityPayload) {
    const { data } = await apiClient.post<ApiResponse<Availability>>(
      "/availability",
      payload,
    );
    return data;
  },

  async updateAvailability(id: string, payload: UpdateAvailabilityPayload) {
    const { data } = await apiClient.patch<ApiResponse<Availability>>(
      `/availability/${id}`,
      payload,
    );
    return data;
  },

  async deleteAvailability(id: string) {
    const { data } = await apiClient.delete<ApiResponse<null>>(
      `/availability/${id}`,
    );
    return data;
  },
};

export default availabilityApi;