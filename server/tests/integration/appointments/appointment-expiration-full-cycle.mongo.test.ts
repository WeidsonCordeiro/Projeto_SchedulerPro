import express from "express";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import request from "supertest";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { authUser } = vi.hoisted(() => ({
  authUser: {
    value: {
      userId: "",
      companyId: "",
      role: "OWNER" as const,
    },
  },
}));

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

vi.mock("../../../src/modules/availability/services/AvailabilityService", () => ({
  default: {
    ensureEmployeeAvailable: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../../../src/modules/notifications/services/NotificationDispatcher", () => ({
  default: {
    dispatchAppointmentEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

import app from "../../../src/app";
import Company from "../../../src/modules/companies/models/Company.model";
import User from "../../../src/modules/users/models/User.model";
import Client from "../../../src/modules/Clients/models/Client.model";
import Service from "../../../src/modules/services/models/Service.model";
import Appointment from "../../../src/modules/appointments/models/Appointment.model";
import { AppointmentExpirationScheduler } from "../../../src/modules/appointments/scheduler/AppointmentExpirationScheduler";
import { AppointmentStatus } from "../../../src/constants/appointment-status";
import { Role } from "../../../src/constants/roles";

const PAST_START = new Date("2020-01-01T10:00:00.000Z");
const PAST_END = new Date("2020-01-01T10:30:00.000Z");
let replSet: MongoMemoryReplSet | undefined;

async function connectTestDatabase(): Promise<void> {
  const externalUri = process.env.GW3_TEST_MONGO_URI?.trim();

  if (externalUri) {
    await mongoose.connect(externalUri);
    await Appointment.syncIndexes();
    return;
  }

  replSet = await MongoMemoryReplSet.create({
    instanceOpts: [{ launchTimeout: 120_000 }],
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri());
  await Appointment.syncIndexes();
}

interface TenantSeed {
  companyId: Types.ObjectId;
  companyIdStr: string;
  ownerUserId: Types.ObjectId;
  ownerUserIdStr: string;
  employeeId: Types.ObjectId;
  clientId: Types.ObjectId;
  serviceId: Types.ObjectId;
}

async function seedTenant(): Promise<TenantSeed> {
  const company = await Company.create({
    name: `e41-fullcycle-co-${Date.now()}`,
    timezone: "UTC",
    isActive: true,
    deletedAt: null,
  });

  const owner = await User.create({
    name: "Owner",
    email: `owner-e41-${Date.now()}@test.local`,
    passwordHash: "hash",
    companyId: company._id,
    role: Role.OWNER,
    isActive: true,
    emailVerified: true,
    phoneVerified: false,
    failedLoginAttempts: 0,
    mustChangePassword: false,
  });

  const employee = await User.create({
    name: "Employee",
    email: `emp-e41-${Date.now()}@test.local`,
    passwordHash: "hash",
    companyId: company._id,
    role: Role.EMPLOYEE,
    isActive: true,
    emailVerified: true,
    phoneVerified: false,
    failedLoginAttempts: 0,
    mustChangePassword: false,
  });

  const client = await Client.create({
    name: "Client",
    email: `client-e41-${Date.now()}@test.local`,
    phone: "910000001",
    companyId: company._id,
    isActive: true,
  });

  const service = await Service.create({
    companyId: company._id,
    name: "Serviço",
    duration: 30,
    price: 50,
    isActive: true,
  });

  return {
    companyId: company._id,
    companyIdStr: company._id.toString(),
    ownerUserId: owner._id,
    ownerUserIdStr: owner._id.toString(),
    employeeId: employee._id,
    clientId: client._id,
    serviceId: service._id,
  };
}

describe("E4.1 — ciclo completo GET → scheduler (integração Mongo)", () => {
  beforeAll(async () => {
    await connectTestDatabase();
  }, 180_000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) {
      await replSet.stop();
    }
  }, 60_000);

  beforeEach(async () => {
    await Promise.all([
      Appointment.deleteMany({}),
      Client.deleteMany({}),
      Service.deleteMany({}),
      User.deleteMany({}),
      Company.deleteMany({}),
    ]);
  });

  it("scheduled vencido permanece após GET e passa a cancelled após scheduler.run()", async () => {
    const tenant = await seedTenant();

    authUser.value = {
      userId: tenant.ownerUserIdStr,
      companyId: tenant.companyIdStr,
      role: Role.OWNER,
    };

    const appointment = await Appointment.create({
      companyId: tenant.companyId,
      clientId: tenant.clientId,
      serviceId: tenant.serviceId,
      employeeId: tenant.employeeId,
      startAt: PAST_START,
      endAt: PAST_END,
      status: AppointmentStatus.SCHEDULED,
      deletedAt: null,
      priceAtTime: 50,
    });

    const beforeGet = await Appointment.findById(appointment._id);
    expect(beforeGet!.status).toBe(AppointmentStatus.SCHEDULED);

    const listResponse = await request(app).get("/api/appointments");

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    const listed = listResponse.body.data as { id: string; status: string }[];
    const match = listed.find(
      (item) => item.id === appointment._id.toString(),
    );
    expect(match?.status).toBe(AppointmentStatus.SCHEDULED);

    const afterGet = await Appointment.findById(appointment._id);
    expect(afterGet).not.toBeNull();
    expect(afterGet!.status).toBe(AppointmentStatus.SCHEDULED);

    const scheduler = new AppointmentExpirationScheduler();
    await scheduler.run();

    const afterScheduler = await Appointment.findById(appointment._id);
    expect(afterScheduler).not.toBeNull();
    expect(afterScheduler!.status).toBe(AppointmentStatus.CANCELLED);
  });
});
