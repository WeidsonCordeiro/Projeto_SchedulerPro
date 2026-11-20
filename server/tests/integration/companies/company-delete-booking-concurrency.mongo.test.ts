import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

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

import Company from "../../../src/modules/companies/models/Company.model";
import User from "../../../src/modules/users/models/User.model";
import Client from "../../../src/modules/Clients/models/Client.model";
import Service from "../../../src/modules/services/models/Service.model";
import Appointment from "../../../src/modules/appointments/models/Appointment.model";
import CompanyService from "../../../src/modules/companies/services/CompanyService";
import AppointmentService from "../../../src/modules/appointments/services/AppointmentService";
import { AppError } from "../../../src/errors/AppError";
import { HttpStatus } from "../../../src/constants/http-status";
import { AppointmentStatus } from "../../../src/constants/appointment-status";
import { Role } from "../../../src/constants/roles";

const NOW = new Date("2028-01-01T00:00:00.000Z");
const SLOT_START = new Date("2028-06-15T10:00:00.000Z");
const DURATION_MIN = 30;

let replSet: MongoMemoryReplSet | undefined;

async function connectTestDatabase(): Promise<void> {
  const externalUri = process.env.GW3_TEST_MONGO_URI?.trim();

  if (externalUri) {
    await mongoose.connect(externalUri);
    await Appointment.syncIndexes();
    await Company.syncIndexes();
    return;
  }

  replSet = await MongoMemoryReplSet.create({
    instanceOpts: [{ launchTimeout: 120_000 }],
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri());
  await Appointment.syncIndexes();
  await Company.syncIndexes();
}

interface TenantSeed {
  companyId: string;
  employeeId: string;
  clientId: string;
  serviceId: string;
}

async function seedTenant(suffix: string): Promise<TenantSeed> {
  const company = await Company.create({
    name: `cdb-co-${suffix}-${Date.now()}`,
    timezone: "UTC",
    isActive: true,
  });

  const companyId = company._id.toString();

  const employee = await User.create({
    name: "Employee",
    email: `cdb-emp-${suffix}-${Date.now()}@test.local`,
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
    email: `cdb-client-${suffix}@test.local`,
    phone: "910000001",
    companyId: company._id,
    isActive: true,
  });

  const service = await Service.create({
    companyId: company._id,
    name: "Consulta",
    duration: DURATION_MIN,
    price: 50,
    isActive: true,
  });

  return {
    companyId,
    employeeId: employee._id.toString(),
    clientId: client._id.toString(),
    serviceId: service._id.toString(),
  };
}

function endAt(start: Date): Date {
  return new Date(start.getTime() + DURATION_MIN * 60 * 1000);
}

async function countOpenFuture(
  companyId: string,
  referenceNow: Date,
): Promise<number> {
  return Appointment.countDocuments({
    companyId: new Types.ObjectId(companyId),
    deletedAt: null,
    status: {
      $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
    },
    endAt: { $gt: referenceNow },
  });
}

function createPayload(tenant: TenantSeed) {
  return {
    clientId: tenant.clientId,
    serviceId: tenant.serviceId,
    employeeId: tenant.employeeId,
    startAt: SLOT_START,
  };
}

function publicPayload(tenant: TenantSeed) {
  return {
    clientName: "Ana",
    clientEmail: `ana-cdb-${Date.now()}@test.local`,
    clientPhone: "910000099",
    serviceId: tenant.serviceId,
    employeeId: tenant.employeeId,
    startAt: SLOT_START,
  };
}

async function assertDeleteVsBookingInvariant(
  tenant: TenantSeed,
  booking: () => Promise<unknown>,
): Promise<void> {
  const results = await Promise.allSettled([
    CompanyService.delete(tenant.companyId, tenant.companyId),
    booking(),
  ]);

  const company = await Company.findById(tenant.companyId);
  const openCount = await countOpenFuture(tenant.companyId, NOW);
  const deleteSettled = results[0];
  const bookSettled = results[1];

  expect(
    !(company?.deletedAt && openCount > 0),
  ).toBe(true);

  if (deleteSettled.status === "fulfilled") {
    expect(company?.deletedAt).toBeInstanceOf(Date);
    expect(company?.isActive).toBe(false);
    expect(openCount).toBe(0);
    if (bookSettled.status === "rejected") {
      const err = bookSettled.reason as AppError;
      expect(err).toBeInstanceOf(AppError);
      expect([HttpStatus.NOT_FOUND, HttpStatus.BAD_REQUEST]).toContain(
        err.statusCode,
      );
    }
    return;
  }

  expect(bookSettled.status).toBe("fulfilled");
  expect(openCount).toBeGreaterThanOrEqual(1);
  expect(deleteSettled.reason).toBeInstanceOf(AppError);
  expect((deleteSettled.reason as AppError).statusCode).toBe(HttpStatus.CONFLICT);
}

describe("Company delete vs booking concurrency (CDB)", () => {
  let tenant: TenantSeed;

  beforeAll(async () => {
    vi.setConfig({ testTimeout: 60_000 });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    await connectTestDatabase();
  }, 120_000);

  afterAll(async () => {
    vi.useRealTimers();
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
    tenant = await seedTenant("main");
  });

  it.each([1, 2, 3, 4, 5, 6])(
    "CDB-01 iter %i: delete paralelo com create administrativo",
    { timeout: 60_000 },
    async () => {
      await assertDeleteVsBookingInvariant(tenant, () =>
        AppointmentService.create(createPayload(tenant), tenant.companyId, NOW),
      );
    },
  );

  it.each([1, 2, 3, 4, 5, 6])(
    "CDB-02 iter %i: delete paralelo com createPublic",
    { timeout: 60_000 },
    async () => {
      await assertDeleteVsBookingInvariant(tenant, () =>
        AppointmentService.createPublic(
          publicPayload(tenant),
          tenant.companyId,
          NOW,
        ),
      );
    },
  );

  it("CDB-03: dois deletes concorrentes — uma sucesso e outra 404", async () => {
    const results = await Promise.allSettled([
      CompanyService.delete(tenant.companyId, tenant.companyId),
      CompanyService.delete(tenant.companyId, tenant.companyId),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      AppError,
    );
    expect(
      ((rejected[0] as PromiseRejectedResult).reason as AppError).statusCode,
    ).toBe(HttpStatus.NOT_FOUND);

    const doc = await Company.findOne({ _id: tenant.companyId });
    expect(doc?.deletedAt).toBeInstanceOf(Date);
  });
});