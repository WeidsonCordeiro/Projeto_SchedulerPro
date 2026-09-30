import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ids,
  authUser,
  notificationRepository,
  userRepository,
} = vi.hoisted(() => {
  const ids = {
    companyA: "507f1f77bcf86cd799439011",
    userA: "507f1f77bcf86cd799439012",
    notification: "507f1f77bcf86cd799439015",
    service: "507f1f77bcf86cd799439013",
  };

  return {
    ids,
    authUser: {
      value: {
        userId: ids.userA,
        companyId: ids.companyA,
        role: "OWNER",
      },
    },
    notificationRepository: {
      findByUser: vi.fn(),
      countUnread: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    },
    userRepository: {
      findById: vi.fn(),
      findByIdForAccessControl: vi.fn(),
    },
  };
});

vi.mock("../../../src/middlewares/auth.middleware", () => ({
  default: {
    authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      req.user = authUser.value as never;
      next();
    },
  },
}));
vi.mock("../../../src/modules/notifications/repositories/NotificationRepository", () => ({
  default: notificationRepository,
}));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({
  default: userRepository,
}));

import app from "../../../src/app";
import { Role } from "../../../src/constants/roles";
import { NotificationType } from "../../../src/modules/notifications";

const ref = (id: string) => ({ toString: () => id });

const notification = (extra = {}) => ({
  _id: ref(ids.notification),
  companyId: ref(ids.companyA),
  userId: ref(ids.userA),
  type: NotificationType.APPOINTMENT_CREATED,
  title: "Novo agendamento",
  message: "Maria — Corte em 30/08/2026 às 18:00.",
  readAt: null,
  metadata: { serviceId: ref(ids.service) },
  createdAt: new Date("2026-08-30T18:00:00.000Z"),
  updatedAt: new Date("2026-08-30T18:00:00.000Z"),
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  authUser.value = {
    userId: ids.userA,
    companyId: ids.companyA,
    role: Role.OWNER,
  };

  userRepository.findById.mockResolvedValue({
    mustChangePassword: false,
    isActive: true,
    lockUntil: null,
  });
  userRepository.findByIdForAccessControl.mockResolvedValue({
    mustChangePassword: false,
    isActive: true,
    lockUntil: null,
  });

  notificationRepository.findByUser.mockResolvedValue([notification()]);
  notificationRepository.countUnread.mockResolvedValue(2);
  notificationRepository.markAsRead.mockResolvedValue(
    notification({ readAt: new Date("2026-08-30T19:00:00.000Z") }),
  );
  notificationRepository.markAllAsRead.mockResolvedValue(3);
});

describe("Notificações HTTP integration", () => {
  it("lista as notificações com limite padrão", async () => {
    const response = await request(app).get("/api/notifications");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(notificationRepository.findByUser).toHaveBeenCalledWith(
      ids.companyA,
      ids.userA,
      50,
    );
  });

  it("repassa o limite informado", async () => {
    const response = await request(app).get("/api/notifications?limit=10");

    expect(response.status).toBe(200);
    expect(notificationRepository.findByUser).toHaveBeenCalledWith(
      ids.companyA,
      ids.userA,
      10,
    );
  });

  it("devolve a contagem de não lidas", async () => {
    const response = await request(app).get("/api/notifications/unread-count");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ unreadCount: 2 });
    expect(notificationRepository.countUnread).toHaveBeenCalledWith(
      ids.companyA,
      ids.userA,
    );
  });

  it("marca uma notificação como lida", async () => {
    const response = await request(app).patch(
      `/api/notifications/${ids.notification}/read`,
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(notificationRepository.markAsRead).toHaveBeenCalledWith(
      ids.notification,
      ids.companyA,
      ids.userA,
      expect.any(Date),
    );
  });

  it("devolve 404 ao marcar a notificação de outro utilizador", async () => {
    notificationRepository.markAsRead.mockResolvedValue(null);

    const response = await request(app).patch(
      `/api/notifications/${ids.notification}/read`,
    );

    expect(response.status).toBe(404);
  });

  it("marca todas as notificações como lidas", async () => {
    const response = await request(app).patch("/api/notifications/read-all");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ markedRead: 3 });
    expect(notificationRepository.markAllAsRead).toHaveBeenCalledWith(
      ids.companyA,
      ids.userA,
      expect.any(Date),
    );
  });

  it.each([Role.CLIENT])("bloqueia acesso para %s", async (role) => {
    authUser.value = { userId: ids.userA, companyId: ids.companyA, role };

    const response = await request(app).get("/api/notifications");

    expect(response.status).toBe(403);
    expect(notificationRepository.findByUser).not.toHaveBeenCalled();
  });

  it("usa sempre a empresa e o utilizador da sessão", async () => {
    await request(app).get(
      `/api/notifications?companyId=507f1f77bcf86cd799439099&userId=507f1f77bcf86cd799439099`,
    );

    expect(notificationRepository.findByUser).toHaveBeenCalledWith(
      ids.companyA,
      ids.userA,
      50,
    );
  });

  it("rejeita limite fora da faixa permitida", async () => {
    const response = await request(app).get("/api/notifications?limit=0");

    expect(response.status).toBe(400);
    expect(notificationRepository.findByUser).not.toHaveBeenCalled();
  });

  it("rejeita limite não numérico", async () => {
    const response = await request(app).get("/api/notifications?limit=abc");

    expect(response.status).toBe(400);
  });

  it("rejeita id de notificação inválido", async () => {
    const response = await request(app).patch(`/api/notifications/abc/read`);

    expect(response.status).toBe(400);
    expect(notificationRepository.markAsRead).not.toHaveBeenCalled();
  });
});