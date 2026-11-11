import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import Company from "../../../src/modules/companies/models/Company.model";
import User from "../../../src/modules/users/models/User.model";
import Client from "../../../src/modules/Clients/models/Client.model";
import Service from "../../../src/modules/services/models/Service.model";
import Appointment from "../../../src/modules/appointments/models/Appointment.model";
import AppointmentRepository from "../../../src/modules/appointments/repositories/AppointmentRepository";
import { AppointmentStatus } from "../../../src/constants/appointment-status";
import { Role } from "../../../src/constants/roles";

const NOW = new Date("2028-06-15T12:00:00.000Z");
const PAST = new Date(NOW.getTime() - 60_000);
const FUTURE = new Date(NOW.getTime() + 60_000);
const EQUAL = new Date(NOW.getTime());

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
    name: `e3-expiration-co-${suffix}-${Date.now()}`,
    timezone: "UTC",
    isActive: true,
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
    companyId: company._id,
    companyIdStr: company._id.toString(),
    employeeId: employee._id,
    clientId: client._id,
    serviceId: service._id,
  };
}

interface InsertAppointmentInput {
  tenant: TenantSeed;
  startAt: Date;
  status: AppointmentStatus;
  deletedAt?: Date | null;
}

async function insertAppointment(input: InsertAppointmentInput) {
  const { tenant, startAt, status, deletedAt = null } = input;

  return Appointment.create({
    companyId: tenant.companyId,
    clientId: tenant.clientId,
    serviceId: tenant.serviceId,
    employeeId: tenant.employeeId,
    startAt,
    endAt: new Date(startAt.getTime() + 30 * MINUTE_MS),
    status,
    deletedAt,
    priceAtTime: 50,
  });
}

describe("cancelOverdueScheduled — integração MongoDB", () => {
  let tenantA: TenantSeed;
  let tenantB: TenantSeed;

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
  });

  it("cancela scheduled vencido (startAt < now)", async () => {
    const doc = await insertAppointment({
      tenant: tenantA,
      startAt: PAST,
      status: AppointmentStatus.SCHEDULED,
    });

    const modifiedCount = await AppointmentRepository.cancelOverdueScheduled(
      tenantA.companyIdStr,
      NOW,
    );

    expect(modifiedCount).toBe(1);

    const updated = await Appointment.findById(doc._id);
    expect(updated!.status).toBe(AppointmentStatus.CANCELLED);
  });

  it("não altera scheduled futuro (startAt > now)", async () => {
    const doc = await insertAppointment({
      tenant: tenantA,
      startAt: FUTURE,
      status: AppointmentStatus.SCHEDULED,
    });

    const modifiedCount = await AppointmentRepository.cancelOverdueScheduled(
      tenantA.companyIdStr,
      NOW,
    );

    expect(modifiedCount).toBe(0);
    expect((await Appointment.findById(doc._id))!.status).toBe(
      AppointmentStatus.SCHEDULED,
    );
  });

  it("não altera scheduled com startAt exatamente igual a now ($lt)", async () => {
    const doc = await insertAppointment({
      tenant: tenantA,
      startAt: EQUAL,
      status: AppointmentStatus.SCHEDULED,
    });

    const modifiedCount = await AppointmentRepository.cancelOverdueScheduled(
      tenantA.companyIdStr,
      NOW,
    );

    expect(modifiedCount).toBe(0);
    expect((await Appointment.findById(doc._id))!.status).toBe(
      AppointmentStatus.SCHEDULED,
    );
  });

  it("não altera appointment já cancelled", async () => {
    const doc = await insertAppointment({
      tenant: tenantA,
      startAt: PAST,
      status: AppointmentStatus.CANCELLED,
    });

    const modifiedCount = await AppointmentRepository.cancelOverdueScheduled(
      tenantA.companyIdStr,
      NOW,
    );

    expect(modifiedCount).toBe(0);
    expect((await Appointment.findById(doc._id))!.status).toBe(
      AppointmentStatus.CANCELLED,
    );
  });

  it.each([
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.NO_SHOW,
  ])("não altera appointment com status %s no passado", async (status) => {
    const doc = await insertAppointment({
      tenant: tenantA,
      startAt: PAST,
      status,
    });

    const modifiedCount = await AppointmentRepository.cancelOverdueScheduled(
      tenantA.companyIdStr,
      NOW,
    );

    expect(modifiedCount).toBe(0);
    expect((await Appointment.findById(doc._id))!.status).toBe(status);
  });

  it("não altera scheduled vencido com soft delete", async () => {
    const doc = await insertAppointment({
      tenant: tenantA,
      startAt: PAST,
      status: AppointmentStatus.SCHEDULED,
      deletedAt: new Date(),
    });

    const modifiedCount = await AppointmentRepository.cancelOverdueScheduled(
      tenantA.companyIdStr,
      NOW,
    );

    expect(modifiedCount).toBe(0);
    expect((await Appointment.findById(doc._id))!.status).toBe(
      AppointmentStatus.SCHEDULED,
    );
  });

  it("não altera vencido de outra empresa ao processar companyId da sessão", async () => {
    const docB = await insertAppointment({
      tenant: tenantB,
      startAt: PAST,
      status: AppointmentStatus.SCHEDULED,
    });

    const modifiedCount = await AppointmentRepository.cancelOverdueScheduled(
      tenantA.companyIdStr,
      NOW,
    );

    expect(modifiedCount).toBe(0);
    expect((await Appointment.findById(docB._id))!.status).toBe(
      AppointmentStatus.SCHEDULED,
    );
  });

  it("cancela apenas elegíveis da empresa alvo com outros tenants na mesma base", async () => {
    const overdueA1 = await insertAppointment({
      tenant: tenantA,
      startAt: PAST,
      status: AppointmentStatus.SCHEDULED,
    });
    const overdueA2 = await insertAppointment({
      tenant: tenantA,
      startAt: new Date(PAST.getTime() - MINUTE_MS),
      status: AppointmentStatus.SCHEDULED,
    });
    const futureA = await insertAppointment({
      tenant: tenantA,
      startAt: FUTURE,
      status: AppointmentStatus.SCHEDULED,
    });
    const overdueB = await insertAppointment({
      tenant: tenantB,
      startAt: PAST,
      status: AppointmentStatus.SCHEDULED,
    });

    const modifiedCount = await AppointmentRepository.cancelOverdueScheduled(
      tenantA.companyIdStr,
      NOW,
    );

    expect(modifiedCount).toBe(2);
    expect((await Appointment.findById(overdueA1._id))!.status).toBe(
      AppointmentStatus.CANCELLED,
    );
    expect((await Appointment.findById(overdueA2._id))!.status).toBe(
      AppointmentStatus.CANCELLED,
    );
    expect((await Appointment.findById(futureA._id))!.status).toBe(
      AppointmentStatus.SCHEDULED,
    );
    expect((await Appointment.findById(overdueB._id))!.status).toBe(
      AppointmentStatus.SCHEDULED,
    );
  });

  it("retorno modifiedCount coincide com documentos cancelados na empresa", async () => {
    await insertAppointment({
      tenant: tenantA,
      startAt: PAST,
      status: AppointmentStatus.SCHEDULED,
    });
    await insertAppointment({
      tenant: tenantA,
      startAt: new Date(PAST.getTime() - 2 * MINUTE_MS),
      status: AppointmentStatus.SCHEDULED,
    });
    await insertAppointment({
      tenant: tenantA,
      startAt: FUTURE,
      status: AppointmentStatus.SCHEDULED,
    });

    const beforeCancelled = await Appointment.countDocuments({
      companyId: tenantA.companyId,
      status: AppointmentStatus.CANCELLED,
    });

    const modifiedCount = await AppointmentRepository.cancelOverdueScheduled(
      tenantA.companyIdStr,
      NOW,
    );

    const afterCancelled = await Appointment.countDocuments({
      companyId: tenantA.companyId,
      status: AppointmentStatus.CANCELLED,
    });

    expect(modifiedCount).toBe(afterCancelled - beforeCancelled);
    expect(modifiedCount).toBe(2);
  });
});
