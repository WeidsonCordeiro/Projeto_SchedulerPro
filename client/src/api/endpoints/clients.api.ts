import { apiClient } from "../apiClient";
import type { ApiResponse } from "../../types/api";
import type { ClientInviteEmission } from "../../types/clientInvite";
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

  /**
   * Perfil do cliente autenticado no portal (GET /clients/me).
   * O clientId vem exclusivamente da sessão autenticada.
   */
  async getClientMe() {
    const { data } = await apiClient.get<ApiResponse<Client>>("/clients/me");
    return data;
  },

  /**
   * POST /clients/:id/invite — emite um convite por e-mail para o
   * cliente criar a própria conta de acesso (role CLIENT).
   * A resposta devolve apenas a validade; o token fica no e-mail.
   */
  async sendClientInvite(id: string) {
    const { data } = await apiClient.post<ApiResponse<ClientInviteEmission>>(
      `/clients/${id}/invite`,
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

  /**
   * POST /clients/:id/photo (multipart/form-data, campo "photo").
   * Envia/substitui a foto do cliente. O axios gera o boundary do multipart.
   */
  async uploadClientPhoto(id: string, file: File) {
    const formData = new FormData();
    formData.append("photo", file);
    const { data } = await apiClient.post<ApiResponse<Client>>(
      `/clients/${id}/photo`,
      formData,
    );
    return data;
  },

  /** DELETE /clients/:id/photo. Remove a foto (idempotente no backend). */
  async removeClientPhoto(id: string) {
    const { data } = await apiClient.delete<ApiResponse<Client>>(
      `/clients/${id}/photo`,
    );
    return data;
  },
};

export default clientsApi;