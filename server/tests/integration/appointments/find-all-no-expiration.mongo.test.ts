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
import { AppointmentStatus } from "../../../src/constants/appointment-status";
import { Role } from "../../../src/constants/roles";

const NOW = new Date("2028-06-15T12:00:00.000Z");
const PAST = new Date(NOW.getTime() - 60_000);
const MINUTE_MS = 60_000;

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
  employeeId: Types.ObjectId;
  clientId: Types.ObjectId;
  serviceId: Types.ObjectId;
}

async function seedTenant(suffix: string): Promise<TenantSeed> {
  const company = await Company.create({
    name: `e4-findall-co-${suffix}-${Date.now()}`,
    timezone: "UTC",
    isActive: true,
  });

  const employee = await User.create({
    name: "Employee",
    email: `emp-e4-${suffix}-${Date.now()}@test.local`,
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
    email: `client-e4-${suffix}@test.local`,
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
    employeeId: employee._id,
    clientId: client._id,
    serviceId: service._id,
  };
}

describe("findAll — integração MongoDB sem expiração na listagem", () => {
  let tenant: TenantSeed;

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

    tenant = await seedTenant("a");
  });

  it("mantém scheduled vencido no Mongo após findAll com escopo de empresa", async () => {
    const doc = await Appointment.create({
      companyId: tenant.companyId,
      clientId: tenant.clientId,
      serviceId: tenant.serviceId,
      employeeId: tenant.employeeId,
      startAt: PAST,
      endAt: new Date(PAST.getTime() + 30 * MINUTE_MS),
      status: AppointmentStatus.SCHEDULED,
      deletedAt: null,
      priceAtTime: 50,
    });

    const listed = await AppointmentService.findAll(
      tenant.companyIdStr,
      {},
      { companyId: tenant.companyIdStr },
      NOW,
    );

    expect(listed).toHaveLength(1);
    expect(listed[0].status).toBe(AppointmentStatus.SCHEDULED);

    const persisted = await Appointment.findById(doc._id);
    expect(persisted!.status).toBe(AppointmentStatus.SCHEDULED);
  });
});
