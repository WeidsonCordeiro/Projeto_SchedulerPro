import { beforeEach, describe, expect, it, vi } from "vitest";

const { notification } = vi.hoisted(() => ({
  notification: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    insertMany: vi.fn(),
    updateMany: vi.fn(),
    find: vi.fn(() => ({
      sort: vi.fn(() => ({
        limit: vi.fn(() => ({
          exec: vi.fn(async () => []),
        })),
      })),
    })),
  },
}));

vi.mock("../../../src/modules/notifications/models/Notification.model", () => ({
  default: notification,
}));

import NotificationRepository from "../../../src/modules/notifications/repositories/NotificationRepository";

const companyId = "507f1f77bcf86cd799439011";
const userId = "507f1f77bcf86cd799439016";
const notificationId = "507f1f77bcf86cd799439015";
const readAt = new Date("2026-08-30T18:05:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("NotificationRepository", () => {
  it("busca uma notificação pelo id", async () => {
    notification.findOne.mockResolvedValue({ _id: notificationId });

    await expect(
      NotificationRepository.findById(notificationId),
    ).resolves.toEqual({ _id: notificationId });
    expect(notification.findOne).toHaveBeenCalledWith({ _id: notificationId });
  });

  it("retorna lista vazia quando não há itens para criar", async () => {
    await expect(NotificationRepository.createMany([])).resolves.toEqual([]);
    expect(notification.insertMany).not.toHaveBeenCalled();
  });

  it("cria várias notificações de uma vez", async () => {
    notification.insertMany.mockResolvedValue([{ _id: "n1" }, { _id: "n2" }]);
    const items = [{ companyId, userId }] as never[];

    await expect(NotificationRepository.createMany(items)).resolves.toEqual([
      { _id: "n1" },
      { _id: "n2" },
    ]);
    expect(notification.insertMany).toHaveBeenCalledWith(items);
  });

  it("lista as notificações de um utilizador mais recentes primeiro", async () => {
    notification.find.mockReturnValueOnce({
      sort: vi.fn().mockReturnValueOnce({
        limit: vi.fn().mockResolvedValueOnce([{ _id: "n1" }]),
      }),
    });

    await expect(
      NotificationRepository.findByUser(companyId, userId, 25),
    ).resolves.toEqual([{ _id: "n1" }]);
    expect(notification.find).toHaveBeenCalledWith({ companyId, userId });
    expect(notification.find.mock.results[0].value.sort).toHaveBeenCalledWith({
      createdAt: -1,
    });
    expect(
      notification.find.mock.results[0].value.sort.mock.results[0].value.limit,
    ).toHaveBeenCalledWith(25);
  });

  it("aplica limite padrão quando não informado", async () => {
    notification.find.mockReturnValueOnce({
      sort: vi.fn().mockReturnValueOnce({
        limit: vi.fn().mockResolvedValueOnce([]),
      }),
    });

    await NotificationRepository.findByUser(companyId, userId);
    expect(
      notification.find.mock.results[0].value.sort.mock.results[0].value.limit,
    ).toHaveBeenCalledWith(50);
  });

  it("conta apenas notificações não lidas", async () => {
    notification.countDocuments.mockResolvedValue(3);

    await expect(
      NotificationRepository.countUnread(companyId, userId),
    ).resolves.toBe(3);
    expect(notification.countDocuments).toHaveBeenCalledWith({
      companyId,
      userId,
      readAt: null,
    });
  });

  it("marca uma notificação como lida restringindo à empresa/utilizador", async () => {
    notification.findOneAndUpdate.mockResolvedValue({ _id: notificationId });

    await expect(
      NotificationRepository.markAsRead(notificationId, companyId, userId, readAt),
    ).resolves.toEqual({ _id: notificationId });
    expect(notification.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: notificationId, companyId, userId },
      { readAt },
      { new: true },
    );
  });

  it("marca todas como lidas e retorna a contagem modificada", async () => {
    notification.updateMany.mockResolvedValue({ modifiedCount: 2 });

    await expect(
      NotificationRepository.markAllAsRead(companyId, userId, readAt),
    ).resolves.toBe(2);
    expect(notification.updateMany).toHaveBeenCalledWith(
      { companyId, userId, readAt: null },
      { readAt },
    );
  });

  it("retorna zero quando o servidor não informa modifiedCount", async () => {
    notification.updateMany.mockResolvedValue({});

    await expect(
      NotificationRepository.markAllAsRead(companyId, userId, readAt),
    ).resolves.toBe(0);
  });
});