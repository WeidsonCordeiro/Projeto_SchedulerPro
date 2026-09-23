import { apiClient } from "../apiClient";
import type { ApiResponse } from "../../types/api";
import type {
  MarkAllReadResult,
  Notification,
  UnreadCount,
} from "../../types/notification";

/**
 * API de notificações internas espelhando as rotas reais do
 * backend (server/src/modules/notifications/routes/NotificationRoutes.ts).
 *
 * companyId e userId nunca são enviados: o backend os obtém do
 * usuário autenticado (req.user).
 */
export const notificationsApi = {
  async getNotifications(params?: { limit?: number }) {
    const { data } = params
      ? await apiClient.get<ApiResponse<Notification[]>>("/notifications", {
          params,
        })
      : await apiClient.get<ApiResponse<Notification[]>>("/notifications");
    return data;
  },

  async getUnreadCount() {
    const { data } = await apiClient.get<ApiResponse<UnreadCount>>(
      "/notifications/unread-count",
    );
    return data;
  },

  async markAsRead(id: string) {
    const { data } = await apiClient.patch<ApiResponse<Notification>>(
      `/notifications/${id}/read`,
    );
    return data;
  },

  async markAllAsRead() {
    const { data } = await apiClient.patch<ApiResponse<MarkAllReadResult>>(
      "/notifications/read-all",
    );
    return data;
  },
};

export default notificationsApi;