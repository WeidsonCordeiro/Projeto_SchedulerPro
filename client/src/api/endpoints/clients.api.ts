import { apiClient } from "../apiClient";
import type { ApiResponse } from "../../types/api";
import type {
  Client,
  CreateClientPayload,
  SetClientCredentialsPayload,
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

  /**
   * Perfil do cliente autenticado no portal (GET /clients/me).
   * O clientId vem exclusivamente da sessão autenticada.
   */
  async getClientMe() {
    const { data } = await apiClient.get<ApiResponse<Client>>("/clients/me");
    return data;
  },

  /**
   * Define (ou atualiza) as credenciais de acesso do cliente ao portal.
   * Cria um utilizador com role CLIENT vinculado ao cliente.
   */
  async setClientCredentials(id: string, payload: SetClientCredentialsPayload) {
    const { data } = await apiClient.post<ApiResponse<Client>>(
      `/clients/${id}/credentials`,
      payload,
    );
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