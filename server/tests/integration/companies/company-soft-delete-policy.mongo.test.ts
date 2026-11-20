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

import Company from "../../../src/modules/companies/models/Company.model";
import Appointment from "../../../src/modules/appointments/models/Appointment.model";
import CompanyService from "../../../src/modules/companies/services/CompanyService";
import { AppointmentStatus } from "../../../src/constants/appointment-status";
import { AppError } from "../../../src/errors/AppError";
import { HttpMessages } from "../../../src/constants/http-messages";
import { HttpStatus } from "../../../src/constants/http-status";

const NOW = new Date("2028-06-15T12:00:00.000Z");
const FUTURE_END = new Date(NOW.getTime() + 60 * 60 * 1000);
const PAST_END = new Date(NOW.getTime() - 60 * 1000);

let replSet: MongoMemoryReplSet | undefined;

async function connectTestDatabase(): Promise<void> {
  const externalUri = process.env.GW3_TEST_MONGO_URI?.trim();

  if (externalUri) {
    await mongoose.connect(externalUri);
    await Company.syncIndexes();
    await Appointment.syncIndexes();
    return;
  }

  replSet = await MongoMemoryReplSet.create({
    instanceOpts: [{ launchTimeout: 120_000 }],
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri());
  await Company.syncIndexes();
  await Appointment.syncIndexes();
}

async function seedAppointment(
  companyId: Types.ObjectId,
  status: AppointmentStatus,
  endAt: Date,
) {
  return Appointment.create({
    companyId,
    clientId: new Types.ObjectId(),
    serviceId: new Types.ObjectId(),
    employeeId: new Types.ObjectId(),
    startAt: new Date(endAt.getTime() - 30 * 60 * 1000),
    endAt,
    status,
    priceAtTime: 10,
  });
}

describe("Company soft delete policy (MongoDB)", () => {
  let companyId: Types.ObjectId;

  beforeAll(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    await connectTestDatabase();
  }, 120_000);

  afterAll(async () => {
    vi.useRealTimers();
    if (replSet) {
      await mongoose.disconnect();
      await replSet.stop();
    } else {
      await mongoose.disconnect();
    }
  });

  beforeEach(async () => {
    await Appointment.deleteMany({});
    await Company.deleteMany({});

    const company = await Company.create({
      name: `soft-delete-co-${Date.now()}`,
      timezone: "UTC",
      isActive: true,
    });
    companyId = company._id;
  });

  it("bloqueia delete com CONFIRMED futuro (409)", async () => {
    await seedAppointment(companyId, AppointmentStatus.CONFIRMED, FUTURE_END);

    await expect(
      CompanyService.delete(companyId.toString(), companyId.toString()),
    ).rejects.toMatchObject({
      statusCode: HttpStatus.CONFLICT,
      message: HttpMessages.COMPANY_DELETE_BLOCKED_OPEN_APPOINTMENTS,
    });

    const doc = await Company.findById(companyId);
    expect(doc?.deletedAt).toBeNull();
    expect(doc?.isActive).toBe(true);
  });

  it("permite delete quando só há histórico e grava deletedAt + isActive false", async () => {
    await seedAppointment(companyId, AppointmentStatus.COMPLETED, PAST_END);
    await seedAppointment(
      companyId,
      AppointmentStatus.CONFIRMED,
      PAST_END,
    );
    const appointmentsBefore = await Appointment.countDocuments({
      companyId,
    });

    await CompanyService.delete(companyId.toString(), companyId.toString());

    const doc = await Company.findOne({ _id: companyId });
    expect(doc?.deletedAt).toBeInstanceOf(Date);
    expect(doc?.isActive).toBe(false);
    expect(await Appointment.countDocuments({ companyId })).toBe(
      appointmentsBefore,
    );
  });

  it("segunda tentativa após soft delete → 404", async () => {
    await CompanyService.delete(companyId.toString(), companyId.toString());

    await expect(
      CompanyService.delete(companyId.toString(), companyId.toString()),
    ).rejects.toBeInstanceOf(AppError);
  });
});