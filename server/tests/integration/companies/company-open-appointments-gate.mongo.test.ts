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
import AppointmentRepository from "../../../src/modules/appointments/repositories/AppointmentRepository";
import { AppointmentStatus } from "../../../src/constants/appointment-status";

const NOW = new Date("2028-06-15T12:00:00.000Z");
const FUTURE_START = new Date(NOW.getTime() + 30 * 60 * 1000);
const FUTURE_END = new Date(NOW.getTime() + 60 * 60 * 1000);
const IN_PROGRESS_END = new Date(NOW.getTime() + 15 * 60 * 1000);
const IN_PROGRESS_START = new Date(NOW.getTime() - 15 * 60 * 1000);
const PAST_END = new Date(NOW.getTime() - 30 * 60 * 1000);
const EXACT_NOW_END = NOW;

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

async function seedAppt(
  companyId: Types.ObjectId,
  status: AppointmentStatus,
  startAt: Date,
  endAt: Date,
  deletedAt: Date | null = null,
) {
  return Appointment.create({
    companyId,
    clientId: new Types.ObjectId(),
    serviceId: new Types.ObjectId(),
    employeeId: new Types.ObjectId(),
    startAt,
    endAt,
    status,
    deletedAt,
    priceAtTime: 10,
  });
}

describe("hasOpenAppointmentsForCompany — matriz MongoDB", () => {
  let companyA: Types.ObjectId;
  let companyB: Types.ObjectId;

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
    const coA = await Company.create({
      name: `gate-a-${Date.now()}`,
      timezone: "UTC",
      isActive: true,
    });
    const coB = await Company.create({
      name: `gate-b-${Date.now()}`,
      timezone: "UTC",
      isActive: true,
    });
    companyA = coA._id;
    companyB = coB._id;
  });

  it.each([
    ["SCHEDULED futuro", AppointmentStatus.SCHEDULED, FUTURE_START, FUTURE_END, true],
    ["SCHEDULED em curso", AppointmentStatus.SCHEDULED, IN_PROGRESS_START, IN_PROGRESS_END, true],
    [
      "CONFIRMED futuro",
      AppointmentStatus.CONFIRMED,
      PAST_END,
      FUTURE_END,
      true,
    ],
    [
      "CONFIRMED já terminado",
      AppointmentStatus.CONFIRMED,
      PAST_END,
      EXACT_NOW_END,
      false,
    ],
    ["CANCELLED", AppointmentStatus.CANCELLED, PAST_END, FUTURE_END, false],
    ["COMPLETED", AppointmentStatus.COMPLETED, PAST_END, FUTURE_END, false],
    ["NO_SHOW", AppointmentStatus.NO_SHOW, PAST_END, FUTURE_END, false],
  ] as const)(
    "%s → bloqueia=%s",
    async (_label, status, startAt, endAt, expected) => {
      await seedAppt(companyA, status, startAt, endAt);
      const result = await AppointmentRepository.hasOpenAppointmentsForCompany(
        companyA,
        NOW,
      );
      expect(result).toBe(expected);
    },
  );

  it("appointment soft-deleted não bloqueia", async () => {
    await seedAppt(
      companyA,
      AppointmentStatus.CONFIRMED,
      PAST_END,
      FUTURE_END,
      new Date(),
    );
    const result = await AppointmentRepository.hasOpenAppointmentsForCompany(
      companyA,
      NOW,
    );
    expect(result).toBe(false);
  });

  it("agendamento de outra empresa não bloqueia", async () => {
    await seedAppt(
      companyB,
      AppointmentStatus.SCHEDULED,
      PAST_END,
      FUTURE_END,
    );
    const result = await AppointmentRepository.hasOpenAppointmentsForCompany(
      companyA,
      NOW,
    );
    expect(result).toBe(false);
  });

  it("utiliza ClientSession na consulta exists", async () => {
    await seedAppt(
      companyA,
      AppointmentStatus.SCHEDULED,
      PAST_END,
      FUTURE_END,
    );

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const insideTxn = await AppointmentRepository.hasOpenAppointmentsForCompany(
        companyA,
        NOW,
        { session },
      );
      expect(insideTxn).toBe(true);
      await session.commitTransaction();
    } finally {
      await session.endSession();
    }
  });
});