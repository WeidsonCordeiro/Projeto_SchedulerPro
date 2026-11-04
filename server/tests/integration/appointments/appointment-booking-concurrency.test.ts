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
import AppointmentService from "../../../src/modules/appointments/services/AppointmentService";
import { AppError } from "../../../src/errors/AppError";
import { HttpMessages } from "../../../src/constants/http-messages";
import { HttpStatus } from "../../../src/constants/http-status";
import { AppointmentStatus } from "../../../src/constants/appointment-status";
import { Role } from "../../../src/constants/roles";
import PublicAppointmentTokenProvider from "../../../src/providers/security/PublicAppointmentTokenProvider";

const NOW = new Date("2028-01-01T00:00:00.000Z");
const SLOT_START = new Date("2028-06-15T10:00:00.000Z");
const DURATION_MIN = 30;

let replSet: MongoMemoryReplSet | undefined;

async function connectTestDatabase(): Promise<void> {
  const externalUri = process.env.GW3_TEST_MONGO_URI?.trim();

  if (externalUri) {
    await mongoose.connect(externalUri);
    await Appointment.syncIndexes();
    return;
  }

  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri());
  await Appointment.syncIndexes();
}

interface TenantSeed {
  companyId: string;
  employeeAId: string;
  employeeBId: string;
  clientAId: string;
  clientBId: string;
  serviceId: string;
}

async function seedTenant(suffix: string): Promise<TenantSeed> {
  const company = await Company.create({
    name: `gw3-test-co-${suffix}-${Date.now()}`,
    timezone: "UTC",
    isActive: true,
  });

  const companyId = company._id.toString();

  const employeeA = await User.create({
    name: "Employee A",
    email: `emp-a-${suffix}-${Date.now()}@test.local`,
    passwordHash: "hash",
    companyId: company._id,
    role: Role.EMPLOYEE,
    isActive: true,
    emailVerified: true,
    phoneVerified: false,
    failedLoginAttempts: 0,
    mustChangePassword: false,
  });

  const employeeB = await User.create({
    name: "Employee B",
    email: `emp-b-${suffix}-${Date.now()}@test.local`,
    passwordHash: "hash",
    companyId: company._id,
    role: Role.EMPLOYEE,
    isActive: true,
    emailVerified: true,
    phoneVerified: false,
    failedLoginAttempts: 0,
    mustChangePassword: false,
  });

  const clientA = await Client.create({
    name: "Client A",
    email: `client-a-${suffix}@test.local`,
    phone: "910000001",
    companyId: company._id,
    isActive: true,
  });

  const clientB = await Client.create({
    name: "Client B",
    email: `client-b-${suffix}@test.local`,
    phone: "910000002",
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
    employeeAId: employeeA._id.toString(),
    employeeBId: employeeB._id.toString(),
    clientAId: clientA._id.toString(),
    clientBId: clientB._id.toString(),
    serviceId: service._id.toString(),
  };
}

function endAt(start: Date): Date {
  return new Date(start.getTime() + DURATION_MIN * 60 * 1000);
}

async function countOverlappingEmployee(
  companyId: string,
  employeeId: string,
  startAt: Date,
  endAtDate: Date,
): Promise<number> {
  return Appointment.countDocuments({
    companyId: new Types.ObjectId(companyId),
    employeeId: new Types.ObjectId(employeeId),
    deletedAt: null,
    status: {
      $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
    },
    startAt: { $lt: endAtDate },
    endAt: { $gt: startAt },
  });
}

async function expectOneSuccessOneConflict(
  operations: Array<Promise<unknown>>,
): Promise<void> {
  const results = await Promise.allSettled(operations);
  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  expect(fulfilled).toHaveLength(1);
  expect(rejected).toHaveLength(1);

  const error = (rejected[0] as PromiseRejectedResult).reason;
  expect(error).toBeInstanceOf(AppError);
  expect((error as AppError).statusCode).toBe(HttpStatus.CONFLICT);
}

describe("GW-3 appointment booking concurrency (ACC-01–07)", () => {
  let tenant: TenantSeed;

  beforeAll(async () => {
    await connectTestDatabase();
  }, 120_000);

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
    tenant = await seedTenant("main");
  });

  it("ACC-01: parallel create same employee and identical slot", async () => {
    const startAt = SLOT_START;
    const end = endAt(startAt);

    await expectOneSuccessOneConflict([
      AppointmentService.create(
        {
          clientId: tenant.clientAId,
          serviceId: tenant.serviceId,
          employeeId: tenant.employeeAId,
          startAt,
        },
        tenant.companyId,
        NOW,
      ),
      AppointmentService.create(
        {
          clientId: tenant.clientBId,
          serviceId: tenant.serviceId,
          employeeId: tenant.employeeAId,
          startAt,
        },
        tenant.companyId,
        NOW,
      ),
    ]);

    expect(
      await countOverlappingEmployee(
        tenant.companyId,
        tenant.employeeAId,
        startAt,
        end,
      ),
    ).toBe(1);
  });

  it("ACC-02: parallel create with partial overlap", async () => {
    const startA = SLOT_START;
    const startB = new Date(SLOT_START.getTime() + 15 * 60 * 1000);
    const windowStart = startA;
    const windowEnd = endAt(startB);

    await expectOneSuccessOneConflict([
      AppointmentService.create(
        {
          clientId: tenant.clientAId,
          serviceId: tenant.serviceId,
          employeeId: tenant.employeeAId,
          startAt: startA,
        },
        tenant.companyId,
        NOW,
      ),
      AppointmentService.create(
        {
          clientId: tenant.clientBId,
          serviceId: tenant.serviceId,
          employeeId: tenant.employeeAId,
          startAt: startB,
        },
        tenant.companyId,
        NOW,
      ),
    ]);

    expect(
      await countOverlappingEmployee(
        tenant.companyId,
        tenant.employeeAId,
        windowStart,
        windowEnd,
      ),
    ).toBe(1);
  });

  it("ACC-03: adjacent intervals allow two active appointments", async () => {
    const startA = SLOT_START;
    const startB = endAt(startA);

    await Promise.all([
      AppointmentService.create(
        {
          clientId: tenant.clientAId,
          serviceId: tenant.serviceId,
          employeeId: tenant.employeeAId,
          startAt: startA,
        },
        tenant.companyId,
        NOW,
      ),
      AppointmentService.create(
        {
          clientId: tenant.clientBId,
          serviceId: tenant.serviceId,
          employeeId: tenant.employeeAId,
          startAt: startB,
        },
        tenant.companyId,
        NOW,
      ),
    ]);

    expect(
      await countOverlappingEmployee(
        tenant.companyId,
        tenant.employeeAId,
        startA,
        endAt(startB),
      ),
    ).toBe(2);
  });

  it("ACC-04: admin and public reschedule to occupied slot returns 409", async () => {
    const occupiedStart = SLOT_START;
    const freeStartAdmin = new Date("2028-06-15T14:00:00.000Z");
    const freeStartPublic = new Date("2028-06-15T16:00:00.000Z");

    await AppointmentService.create(
      {
        clientId: tenant.clientAId,
        serviceId: tenant.serviceId,
        employeeId: tenant.employeeAId,
        startAt: occupiedStart,
      },
      tenant.companyId,
      NOW,
    );

    const movable = await AppointmentService.create(
      {
        clientId: tenant.clientBId,
        serviceId: tenant.serviceId,
        employeeId: tenant.employeeAId,
        startAt: freeStartAdmin,
      },
      tenant.companyId,
      NOW,
    );

    await expect(
      AppointmentService.update(
        movable.id,
        { startAt: occupiedStart },
        tenant.companyId,
        NOW,
      ),
    ).rejects.toMatchObject({
      message: HttpMessages.EMPLOYEE_CONFLICT,
      statusCode: HttpStatus.CONFLICT,
    });

    expect(
      await countOverlappingEmployee(
        tenant.companyId,
        tenant.employeeAId,
        occupiedStart,
        endAt(occupiedStart),
      ),
    ).toBe(1);

    const token = PublicAppointmentTokenProvider.generate();
    const tokenHash = PublicAppointmentTokenProvider.hash(token);

    const movablePublic = await AppointmentService.create(
      {
        clientId: tenant.clientBId,
        serviceId: tenant.serviceId,
        employeeId: tenant.employeeAId,
        startAt: freeStartPublic,
      },
      tenant.companyId,
      NOW,
    );

    await Appointment.updateOne(
      { _id: movablePublic.id },
      {
        $set: {
          publicAccessTokenHash: tokenHash,
          publicAccessTokenCiphertext: PublicAppointmentTokenProvider.encrypt(
            token,
            tokenHash,
          ),
        },
      },
    );

    await expect(
      AppointmentService.updatePublicByToken(
        token,
        { startAt: occupiedStart.toISOString() },
        NOW,
      ),
    ).rejects.toMatchObject({
      message: HttpMessages.EMPLOYEE_CONFLICT,
      statusCode: HttpStatus.CONFLICT,
    });

    expect(
      await countOverlappingEmployee(
        tenant.companyId,
        tenant.employeeAId,
        occupiedStart,
        endAt(occupiedStart),
      ),
    ).toBe(1);
  });

  it("ACC-05: cancelled appointment does not block new booking", async () => {
    const startAt = SLOT_START;

    const existing = await AppointmentService.create(
      {
        clientId: tenant.clientAId,
        serviceId: tenant.serviceId,
        employeeId: tenant.employeeAId,
        startAt,
      },
      tenant.companyId,
      NOW,
    );

    await AppointmentService.cancel(existing.id, tenant.companyId);

    await AppointmentService.create(
      {
        clientId: tenant.clientBId,
        serviceId: tenant.serviceId,
        employeeId: tenant.employeeAId,
        startAt,
      },
      tenant.companyId,
      NOW,
    );

    expect(
      await countOverlappingEmployee(
        tenant.companyId,
        tenant.employeeAId,
        startAt,
        endAt(startAt),
      ),
    ).toBe(1);
  });

  it("ACC-06: same slot in different companies does not interfere", async () => {
    const tenantB = await seedTenant("b");
    const startAt = SLOT_START;

    await Promise.all([
      AppointmentService.create(
        {
          clientId: tenant.clientAId,
          serviceId: tenant.serviceId,
          employeeId: tenant.employeeAId,
          startAt,
        },
        tenant.companyId,
        NOW,
      ),
      AppointmentService.create(
        {
          clientId: tenantB.clientAId,
          serviceId: tenantB.serviceId,
          employeeId: tenantB.employeeAId,
          startAt,
        },
        tenantB.companyId,
        NOW,
      ),
    ]);

    expect(
      await countOverlappingEmployee(
        tenant.companyId,
        tenant.employeeAId,
        startAt,
        endAt(startAt),
      ),
    ).toBe(1);
    expect(
      await countOverlappingEmployee(
        tenantB.companyId,
        tenantB.employeeAId,
        startAt,
        endAt(startAt),
      ),
    ).toBe(1);
  });

  it("ACC-07: same client overlapping with different employees", async () => {
    const startA = SLOT_START;
    const startB = new Date(SLOT_START.getTime() + 15 * 60 * 1000);

    await expectOneSuccessOneConflict([
      AppointmentService.create(
        {
          clientId: tenant.clientAId,
          serviceId: tenant.serviceId,
          employeeId: tenant.employeeAId,
          startAt: startA,
        },
        tenant.companyId,
        NOW,
      ),
      AppointmentService.create(
        {
          clientId: tenant.clientAId,
          serviceId: tenant.serviceId,
          employeeId: tenant.employeeBId,
          startAt: startB,
        },
        tenant.companyId,
        NOW,
      ),
    ]);

    const clientOverlapCount = await Appointment.countDocuments({
      companyId: new Types.ObjectId(tenant.companyId),
      clientId: new Types.ObjectId(tenant.clientAId),
      deletedAt: null,
      status: {
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      },
      startAt: { $lt: endAt(startB) },
      endAt: { $gt: startA },
    });

    expect(clientOverlapCount).toBe(1);
  });
}, 120_000);
