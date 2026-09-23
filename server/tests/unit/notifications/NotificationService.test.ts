import { beforeEach, describe, expect, it, vi } from "vitest";

const { notificationRepository } = vi.hoisted(() => ({
  notificationRepository: {
    findByUser: vi.fn(),
    countUnread: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

vi.mock("../../../src/modules/notifications/repositories/NotificationRepository", () => ({
  default: notificationRepository,
}));

import NotificationService from "../../../src/modules/notifications/services/NotificationService";
import { NotificationType } from "../../../src/modules/notifications";
import { AppError } from "../../../src/errors/AppError";

const companyId = "507f1f77bcf86cd799439011";
const userId = "507f1f77bcf86cd799439012";
const serviceId = "507f1f77bcf86cd799439013";

const ref = (id: string) => ({ toString: () => id });

const doc = (extra = {}) => ({
  _id: ref("507f1f77bcf86cd799439015"),
  companyId: ref(companyId),
  userId: ref(userId),
  type: NotificationType.APPOINTMENT_CREATED,
  title: "Novo agendamento",
  message: "Maria — Corte em 30/08/2026 às 18:00.",
  readAt: null,
  metadata: { serviceId: ref(serviceId) },
  createdAt: new Date("2026-08-30T18:00:00.000Z"),
  updatedAt: new Date("2026-08-30T18:00:00.000Z"),
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("NotificationService", () => {
  it("lista as notificações do utilizador com limite padrão", async () => {
    notificationRepository.findByUser.mockResolvedValue([doc()]);

    const result = await NotificationService.listForUser(companyId, userId);

    expect(notificationRepository.findByUser).toHaveBeenCalledWith(
      companyId,
      userId,
      50,
    );
    expect(result[0]).toMatchObject({
      id: "507f1f77bcf86cd799439015",
      companyId,
      userId,
      type: NotificationType.APPOINTMENT_CREATED,
      readAt: null,
      metadata: {
        serviceId,
        appointmentId: null,
        clientId: null,
        employeeId: null,
      },
      createdAt: "2026-08-30T18:00:00.000Z",
    });
  });

  it("repassa o limite informado pelo utilizador", async () => {
    notificationRepository.findByUser.mockResolvedValue([]);

    await NotificationService.listForUser(companyId, userId, 10);

    expect(notificationRepository.findByUser).toHaveBeenCalledWith(
      companyId,
      userId,
      10,
    );
  });

  it("converte readAt para ISO quando a notificação foi lida", async () => {
    const readAt = new Date("2026-08-30T19:00:00.000Z");
    notificationRepository.findByUser.mockResolvedValue([
      doc({ readAt }),
    ]);

    const result = await NotificationService.listForUser(companyId, userId);

    expect(result[0].readAt).toBe("2026-08-30T19:00:00.000Z");
  });

  it("conta as notificações não lidas", async () => {
    notificationRepository.countUnread.mockResolvedValue(3);

    const result = await NotificationService.getUnreadCount(companyId, userId);

    expect(notificationRepository.countUnread).toHaveBeenCalledWith(
      companyId,
      userId,
    );
    expect(result).toEqual({ unreadCount: 3 });
  });

  it("marca uma notificação como lida", async () => {
    const readAt = new Date("2026-08-30T19:00:00.000Z");
    notificationRepository.markAsRead.mockResolvedValue(doc({ readAt }));

    const result = await NotificationService.markAsRead(
      "507f1f77bcf86cd799439015",
      companyId,
      userId,
    );

    expect(notificationRepository.markAsRead).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439015",
      companyId,
      userId,
      expect.any(Date),
    );
    expect(result.readAt).toBe("2026-08-30T19:00:00.000Z");
  });

  it("lança NOT_FOUND ao marcar como lida notificação de outro utilizador", async () => {
    notificationRepository.markAsRead.mockResolvedValue(null);

    await expect(
      NotificationService.markAsRead(
        "507f1f77bcf86cd799439015",
        companyId,
        userId,
      ),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("marca todas as notificações como lidas e devolve a quantidade", async () => {
    notificationRepository.markAllAsRead.mockResolvedValue(4);

    const result = await NotificationService.markAllAsRead(companyId, userId);

    expect(notificationRepository.markAllAsRead).toHaveBeenCalledWith(
      companyId,
      userId,
      expect.any(Date),
    );
    expect(result).toEqual({ markedRead: 4 });
  });
});