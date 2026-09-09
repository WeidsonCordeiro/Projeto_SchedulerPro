import { apiClient } from "../apiClient";
import type { ApiResponse } from "../../types/api";
import type {
  Service,
  CreateServicePayload,
  UpdateServicePayload,
} from "../../types/service";

export const servicesApi = {
  async getServices() {
    const { data } = await apiClient.get<ApiResponse<Service[]>>("/services");
    return data;
  },

  async getService(id: string) {
    const { data } = await apiClient.get<ApiResponse<Service>>(
      `/services/${id}`,
    );
    return data;
  },

  async createService(payload: CreateServicePayload) {
    const { data } = await apiClient.post<ApiResponse<Service>>(
      "/services",
      payload,
    );
    return data;
  },

  async updateService(id: string, payload: UpdateServicePayload) {
    const { data } = await apiClient.patch<ApiResponse<Service>>(
      `/services/${id}`,
      payload,
    );
    return data;
  },

  async activateService(id: string) {
    const { data } = await apiClient.patch<ApiResponse<Service>>(
      `/services/${id}/activate`,
    );
    return data;
  },

  async deactivateService(id: string) {
    const { data } = await apiClient.patch<ApiResponse<Service>>(
      `/services/${id}/deactivate`,
    );
    return data;
  },

  async deleteService(id: string) {
    const { data } = await apiClient.delete<ApiResponse<null>>(
      `/services/${id}`,
    );
    return data;
  },
};

export default servicesApi;