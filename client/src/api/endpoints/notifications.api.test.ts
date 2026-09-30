import { describe, expect, it, vi } from "vitest";
import notificationsApi from "./notifications.api";
import { httpError } from "../../test/http";

vi.mock("../apiClient", () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
}));

const { apiClient } = await import("../apiClient");

const NOTIFICATION = {
  id: "507f1f77bcf86cd799439015",
  companyId: "507f1f77bcf86cd799439011",
  userId: "507f1f77bcf86cd799439012",
  type: "APPOINTMENT_CREATED",
  title: "Novo agendamento",
  message: "Maria — Corte em 30/08/2026 às 18:00.",
  readAt: null,
  metadata: {
    appointmentId: null,
    clientId: null,
    serviceId: null,
    employeeId: null,
  },
  createdAt: "2026-08-30T18:00:00.000Z",
  updatedAt: "2026-08-30T18:00:00.000Z",
};

function mockGet(data: unknown) {
  vi.mocked(apiClient.get).mockResolvedValue({
    data: { success: true, message: "ok", data },
  });
}

describe("notificationsApi", () => {
  it("gets /notifications", async () => {
    mockGet([NOTIFICATION]);
    const results = await notificationsApi.getNotifications();
    expect(apiClient.get).toHaveBeenCalledWith("/notifications");
    expect(results.data).toHaveLength(1);
  });

  it("gets /notifications with limit", async () => {
    mockGet([NOTIFICATION]);
    await notificationsApi.getNotifications({ limit: 10 });
    expect(apiClient.get).toHaveBeenCalledWith("/notifications", {
      params: { limit: 10 },
    });
  });

  it("gets /notifications/unread-count", async () => {
    mockGet({ unreadCount: 3 });
    const result = await notificationsApi.getUnreadCount();
    expect(apiClient.get).toHaveBeenCalledWith("/notifications/unread-count");
    expect(result.data?.unreadCount).toBe(3);
  });

  it("patches /notifications/:id/read", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "ok", data: NOTIFICATION },
    });
    await notificationsApi.markAsRead(NOTIFICATION.id);
    expect(apiClient.patch).toHaveBeenCalledWith(
      `/notifications/${NOTIFICATION.id}/read`,
    );
  });

  it("patches /notifications/read-all", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "ok", data: { markedRead: 2 } },
    });
    const result = await notificationsApi.markAllAsRead();
    expect(apiClient.patch).toHaveBeenCalledWith("/notifications/read-all");
    expect(result.data?.markedRead).toBe(2);
  });

  it("propagates API errors to the caller", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    await expect(notificationsApi.getNotifications()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});