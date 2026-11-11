import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
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

const NOW = new Date("2028-01-01T00:00:00.000Z");
const SLOT_START = new Date("2028-06-15T10:00:00.000Z");

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
  companyId: string;
  ownerUserId: string;
  employeeId: string;
  clientId: string;
  serviceId: string;
}

async function seedTenant(suffix: string): Promise<TenantSeed> {
  const company = await Company.create({
    name: `o7-mt-co-${suffix}-${Date.now()}`,
    timezone: "UTC",
    isActive: true,
  });

  const companyId = company._id.toString();

  const owner = await User.create({
    name: "Owner",
    email: `owner-${suffix}-${Date.now()}@test.local`,
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
    email: `emp-${suffix}-${Date.now()}@test.local`,
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
    email: `client-${suffix}@test.local`,
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
    companyId,
    ownerUserId: owner._id.toString(),
    employeeId: employee._id.toString(),
    clientId: client._id.toString(),
    serviceId: service._id.toString(),
  };
}

describe("O7 — isolamento multi-tenant (Mongo real)", () => {
  let tenantA: TenantSeed;
  let tenantB: TenantSeed;
  let appointmentBId: string;

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

    tenantA = await seedTenant("a");
    tenantB = await seedTenant("b");

    const appointmentB = await AppointmentService.create(
      {
        clientId: tenantB.clientId,
        serviceId: tenantB.serviceId,
        employeeId: tenantB.employeeId,
        startAt: SLOT_START,
      },
      tenantB.companyId,
      NOW,
    );

    appointmentBId = appointmentB.id;
  });

  it("empresa A não altera agendamento da empresa B (update)", async () => {
      await expect(
        AppointmentService.update(
          appointmentBId,
          { notes: "tentativa" },
          tenantA.companyId,
          {
            userId: tenantA.ownerUserId,
            companyId: tenantA.companyId,
            role: Role.OWNER,
          },
          NOW,
        ),
      ).rejects.toMatchObject({
        message: HttpMessages.APPOINTMENT_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
      });
  });

  it("empresa A não confirma agendamento da empresa B", async () => {
      await expect(
        AppointmentService.confirm(appointmentBId, tenantA.companyId, {
          userId: tenantA.ownerUserId,
          companyId: tenantA.companyId,
          role: Role.OWNER,
        }),
      ).rejects.toBeInstanceOf(AppError);
  });

  it("empresa A não elimina agendamento da empresa B", async () => {
      await expect(
        AppointmentService.delete(appointmentBId, tenantA.companyId, {
          userId: tenantA.ownerUserId,
          companyId: tenantA.companyId,
          role: Role.OWNER,
        }),
      ).rejects.toBeInstanceOf(AppError);

      const stillThere = await Appointment.findById(appointmentBId);
      expect(stillThere).not.toBeNull();
      expect(stillThere!.companyId.toString()).toBe(tenantB.companyId);
  });

  it("updateInCompany não afeta documento de outra empresa", async () => {
      const other = await Appointment.findById(appointmentBId);
      expect(other).not.toBeNull();

      await expect(
        AppointmentService.update(
          appointmentBId,
          { notes: "x" },
          tenantA.companyId,
          {
            userId: tenantA.employeeId,
            companyId: tenantA.companyId,
            role: Role.EMPLOYEE,
          },
          NOW,
        ),
      ).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });

      const unchanged = await Appointment.findById(appointmentBId);
      expect(unchanged!.status).toBe(AppointmentStatus.SCHEDULED);
      expect(unchanged!.notes).not.toBe("x");
  });
});
