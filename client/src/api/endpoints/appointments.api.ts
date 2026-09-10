import { apiClient } from "../apiClient";
import type { ApiResponse } from "../../types/api";
import type {
  Appointment,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
} from "../../types/appointment";

/**
 * API de agendamentos espelhando as rotas reais do backend
 * (server/src/modules/appointments/routes/AppointmentRoutes.ts).
 *
 * companyId nunca é enviado: o backend o obtém do usuário autenticado.
 * startAt é enviado como instante ISO 8601 em UTC (ver config/appointmentTime.ts);
 * endAt e status não pertencem ao payload (endAt é calculado pelo backend e
 * status muda apenas pelos endpoints dedicados abaixo).
 */
export const appointmentsApi = {
  async getAppointments() {
    const { data } = await apiClient.get<ApiResponse<Appointment[]>>(
      "/appointments",
    );
    return data;
  },

  async getAppointment(id: string) {
    const { data } = await apiClient.get<ApiResponse<Appointment>>(
      `/appointments/${id}`,
    );
    return data;
  },

  async createAppointment(payload: CreateAppointmentPayload) {
    const { data } = await apiClient.post<ApiResponse<Appointment>>(
      "/appointments",
      payload,
    );
    return data;
  },

  async updateAppointment(id: string, payload: UpdateAppointmentPayload) {
    const { data } = await apiClient.patch<ApiResponse<Appointment>>(
      `/appointments/${id}`,
      payload,
    );
    return data;
  },

  async confirmAppointment(id: string) {
    const { data } = await apiClient.patch<ApiResponse<Appointment>>(
      `/appointments/${id}/confirm`,
    );
    return data;
  },

  async completeAppointment(id: string) {
    const { data } = await apiClient.patch<ApiResponse<Appointment>>(
      `/appointments/${id}/complete`,
    );
    return data;
  },

  async cancelAppointment(id: string) {
    const { data } = await apiClient.patch<ApiResponse<Appointment>>(
      `/appointments/${id}/cancel`,
    );
    return data;
  },

  async markAppointmentAsNoShow(id: string) {
    const { data } = await apiClient.patch<ApiResponse<Appointment>>(
      `/appointments/${id}/no-show`,
    );
    return data;
  },

  async deleteAppointment(id: string) {
    const { data } = await apiClient.delete<ApiResponse<null>>(
      `/appointments/${id}`,
    );
    return data;
  },
};

export default appointmentsApi;