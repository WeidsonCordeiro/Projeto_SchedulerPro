import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { activeCompany, ref } from "../helpers/tenant-ids";

const {
  ids,
  authUser,
  notificationRepository,
  userRepository,
  companyRepository,
} = vi.hoisted(() => {
  const { TENANT_IDS: tenantIds } =
    require("../helpers/tenant-ids.cjs") as typeof import("../helpers/tenant-ids");
  return {
  ids: tenantIds,
  authUser: {
    value: {
      userId: tenantIds.userA,
      companyId: tenantIds.companyA,
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
  companyRepository: { findById: vi.fn() },
};
});

vi.mock("../../../src/middlewares/auth.middleware", () => ({
  default: {
    authenticate: (
      req: express.Request,
      _res: express.Response,
      next: express.NextFunction,
    ) => {
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
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({
  default: companyRepository,
}));

import app from "../../../src/app";
import { Role } from "../../../src/constants/roles";
import { NotificationType } from "../../../src/modules/notifications";

const notificationId = "507f1f77bcf86cd799439099";

const notification = () => ({
  _id: ref(notificationId),
  companyId: ref(ids.companyA),
  userId: ref(ids.userA),
  type: NotificationType.APPOINTMENT_CREATED,
  title: "T",
  message: "M",
  readAt: null,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
});

beforeEach(() => {
  vi.clearAllMocks();
  authUser.value = {
    userId: ids.userA,
    companyId: ids.companyA,
    role: Role.OWNER,
  };

  companyRepository.findById.mockResolvedValue(activeCompany(ids.companyA));
  userRepository.findById.mockResolvedValue({
    mustChangePassword: false,
    isActive: true,
    lockUntil: null,
    emailVerified: true,
  });
  userRepository.findByIdForAccessControl.mockResolvedValue({
    mustChangePassword: false,
    isActive: true,
    lockUntil: null,
    emailVerified: true,
  });

  notificationRepository.findByUser.mockResolvedValue([notification()]);
  notificationRepository.countUnread.mockResolvedValue(1);
  notificationRepository.markAsRead.mockResolvedValue(notification());
  notificationRepository.markAllAsRead.mockResolvedValue(1);
});

describe("Multi-tenant — Notifications HTTP (Bloco A)", () => {
  it("lista com empresa e utilizador da sessão", async () => {
    await request(app).get("/api/notifications");

    expect(notificationRepository.findByUser).toHaveBeenCalledWith(
      ids.companyA,
      ids.userA,
      50,
    );
  });

  it("marca como lida apenas no tenant da sessão", async () => {
    await request(app).patch(`/api/notifications/${notificationId}/read`);

    expect(notificationRepository.markAsRead).toHaveBeenCalledWith(
      notificationId,
      ids.companyA,
      ids.userA,
      expect.any(Date),
    );
  });

  it("sessão empresa B não reutiliza contexto da empresa A", async () => {
    authUser.value = {
      userId: ids.userB,
      companyId: ids.companyB,
      role: Role.OWNER,
    };
    notificationRepository.markAsRead.mockResolvedValue(null);

    const response = await request(app).patch(
      `/api/notifications/${notificationId}/read`,
    );

    expect(response.status).toBe(404);
    expect(notificationRepository.markAsRead).toHaveBeenCalledWith(
      notificationId,
      ids.companyB,
      ids.userB,
      expect.any(Date),
    );
  });
});