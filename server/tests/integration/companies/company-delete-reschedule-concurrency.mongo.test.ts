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
import PublicAppointmentTokenProvider from "../../../src/providers/security/PublicAppointmentTokenProvider";
import { AppError } from "../../../src/errors/AppError";
import { HttpMessages } from "../../../src/constants/http-messages";
import { HttpStatus } from "../../../src/constants/http-status";
import { AppointmentStatus } from "../../../src/constants/appointment-status";
import { Role } from "../../../src/constants/roles";

const NOW = new Date("2028-01-01T00:00:00.000Z");
const SLOT_START = new Date("2028-06-15T10:00:00.000Z");
const ALT_SLOT_START = new Date("2028-06-15T14:00:00.000Z");
const DURATION_MIN = 30;
const PAST_START = new Date("2027-12-30T10:00:00.000Z");
const PAST_END = new Date("2027-12-30T10:30:00.000Z");

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
  ownerId: string;
  employeeId: string;
  clientId: string;
  serviceId: string;
}

async function seedTenant(suffix: string): Promise<TenantSeed> {
  const company = await Company.create({
    name: `cdr-co-${suffix}-${Date.now()}`,
    timezone: "UTC",
    isActive: true,
  });

  const companyId = company._id.toString();

  const owner = await User.create({
    name: "Owner",
    email: `cdr-owner-${suffix}-${Date.now()}@test.local`,
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
    email: `cdr-emp-${suffix}-${Date.now()}@test.local`,
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
    email: `cdr-client-${suffix}@test.local`,
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
    ownerId: owner._id.toString(),
    employeeId: employee._id.toString(),
    clientId: client._id.toString(),
    serviceId: service._id.toString(),
  };
}

function ownerSession(tenant: TenantSeed) {
  return {
    userId: tenant.ownerId,
    companyId: tenant.companyId,
    role: Role.OWNER,
  };
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

async function seedPastScheduled(
  tenant: TenantSeed,
): Promise<{ id: string }> {
  const doc = await Appointment.create({
    companyId: new Types.ObjectId(tenant.companyId),
    clientId: new Types.ObjectId(tenant.clientId),
    serviceId: new Types.ObjectId(tenant.serviceId),
    employeeId: new Types.ObjectId(tenant.employeeId),
    startAt: PAST_START,
    endAt: PAST_END,
    status: AppointmentStatus.SCHEDULED,
    priceAtTime: 50,
  });

  return { id: doc._id.toString() };
}

async function seedFutureWithPublicToken(tenant: TenantSeed) {
  const created = await AppointmentService.create(
    {
      clientId: tenant.clientId,
      serviceId: tenant.serviceId,
      employeeId: tenant.employeeId,
      startAt: ALT_SLOT_START,
    },
    tenant.companyId,
    NOW,
  );

  const token = PublicAppointmentTokenProvider.generate();
  const tokenHash = PublicAppointmentTokenProvider.hash(token);

  await Appointment.updateOne(
    { _id: created.id },
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

  return { id: created.id, token };
}

async function assertDeleteVsRescheduleInvariant(
  tenant: TenantSeed,
  reschedule: () => Promise<unknown>,
): Promise<void> {
  const results = await Promise.allSettled([
    CompanyService.delete(tenant.companyId, tenant.companyId),
    reschedule(),
  ]);

  const company = await Company.findById(tenant.companyId);
  const openCount = await countOpenFuture(tenant.companyId, NOW);
  const deleteSettled = results[0];
  const rescheduleSettled = results[1];

  expect(!(company?.deletedAt && openCount > 0)).toBe(true);

  if (deleteSettled.status === "fulfilled") {
    expect(company?.deletedAt).toBeInstanceOf(Date);
    expect(company?.isActive).toBe(false);
    expect(openCount).toBe(0);
    if (rescheduleSettled.status === "rejected") {
      const err = rescheduleSettled.reason as AppError;
      expect(err).toBeInstanceOf(AppError);
      expect([HttpStatus.NOT_FOUND, HttpStatus.BAD_REQUEST]).toContain(
        err.statusCode,
      );
    }
    return;
  }

  expect(rescheduleSettled.status).toBe("fulfilled");
  expect(openCount).toBeGreaterThanOrEqual(1);
  expect(deleteSettled.reason).toBeInstanceOf(AppError);
  expect((deleteSettled.reason as AppError).statusCode).toBe(
    HttpStatus.CONFLICT,
  );
}

describe("Company delete vs reschedule concurrency (CDR)", () => {
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
    "CDR-01 iter %i: admin move SCHEDULED vencido para futuro vs delete",
    { timeout: 60_000 },
    async () => {
      const past = await seedPastScheduled(tenant);

      await assertDeleteVsRescheduleInvariant(tenant, () =>
        AppointmentService.update(
          past.id,
          { startAt: SLOT_START },
          tenant.companyId,
          ownerSession(tenant),
          NOW,
        ),
      );
    },
  );

  it.each([1, 2, 3, 4, 5, 6])(
    "CDR-02 iter %i: updatePublicByToken vs delete",
    { timeout: 60_000 },
    async () => {
      const seeded = await seedFutureWithPublicToken(tenant);

      await assertDeleteVsRescheduleInvariant(tenant, () =>
        AppointmentService.updatePublicByToken(
          seeded.token,
          { startAt: SLOT_START.toISOString() },
          NOW,
        ),
      );
    },
  );

  it("CDR-03: update após empresa eliminada → 404", async () => {
    const past = await seedPastScheduled(tenant);
    await CompanyService.delete(tenant.companyId, tenant.companyId);

    await expect(
      AppointmentService.update(
        past.id,
        { startAt: SLOT_START },
        tenant.companyId,
        ownerSession(tenant),
        NOW,
      ),
    ).rejects.toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
      message: HttpMessages.COMPANY_NOT_FOUND,
    });
  });

  it("CDR-03b: updatePublic após empresa eliminada → 404", async () => {
    const seeded = await seedFutureWithPublicToken(tenant);

    // endAt no passado remove o agendamento do gate de delete (hasOpen usa
    // endAt > now) mas startAt futuro mantém o fluxo público editável.
    await Appointment.updateOne(
      { _id: seeded.id },
      { $set: { endAt: PAST_END } },
    );

    await CompanyService.delete(tenant.companyId, tenant.companyId);

    await expect(
      AppointmentService.updatePublicByToken(
        seeded.token,
        { startAt: SLOT_START.toISOString() },
        NOW,
      ),
    ).rejects.toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
      message: HttpMessages.COMPANY_NOT_FOUND,
    });
  });

  it("CDR-04: reagendamento com empresa ativa continua funcional", async () => {
    const created = await AppointmentService.create(
      {
        clientId: tenant.clientId,
        serviceId: tenant.serviceId,
        employeeId: tenant.employeeId,
        startAt: ALT_SLOT_START,
      },
      tenant.companyId,
      NOW,
    );

    const updated = await AppointmentService.update(
      created.id,
      { notes: "Reagendamento B2.1" },
      tenant.companyId,
      ownerSession(tenant),
      NOW,
    );

    expect(updated.notes).toBe("Reagendamento B2.1");
    const company = await Company.findById(tenant.companyId);
    expect(company?.deletedAt).toBeNull();
    expect(company?.isActive).toBe(true);
  });
});