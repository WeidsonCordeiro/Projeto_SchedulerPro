import { apiClient } from "../apiClient";
import type { ApiResponse } from "../../types/api";
import type {
  Client,
  CreateClientPayload,
  UpdateClientPayload,
} from "../../types/client";

export const clientsApi = {
  async getClients() {
    const { data } = await apiClient.get<ApiResponse<Client[]>>("/clients");
    return data;
  },

  async getClient(id: string) {
    const { data } = await apiClient.get<ApiResponse<Client>>(`/clients/${id}`);
    return data;
  },

  async createClient(payload: CreateClientPayload) {
    const { data } = await apiClient.post<ApiResponse<Client>>(
      "/clients",
      payload,
    );
    return data;
  },

  async updateClient(id: string, payload: UpdateClientPayload) {
    const { data } = await apiClient.patch<ApiResponse<Client>>(
      `/clients/${id}`,
      payload,
    );
    return data;
  },

  async deleteClient(id: string) {
    const { data } = await apiClient.delete<ApiResponse<null>>(
      `/clients/${id}`,
    );
    return data;
  },
};

export default clientsApi;