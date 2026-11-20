import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const T1 = new Date("2028-06-01T10:00:00.000Z");
const T2 = new Date("2028-06-01T10:05:00.000Z");

function createSession() {
  return {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn().mockResolvedValue(undefined),
    abortTransaction: vi.fn().mockResolvedValue(undefined),
    endSession: vi.fn().mockResolvedValue(undefined),
  };
}

const { sessions, startSessionMock, retryState } = vi.hoisted(() => {
  const sessions: ReturnType<typeof createSession>[] = [];
  const retryState = { rejectTransientOnFirstCommit: true };

  const startSessionMock = vi.fn(async () => {
    if (sessions.length >= 1) {
      vi.setSystemTime(T2);
    }

    const session = createSession();

    if (retryState.rejectTransientOnFirstCommit) {
      retryState.rejectTransientOnFirstCommit = false;
      session.commitTransaction.mockRejectedValueOnce(
        Object.assign(new Error("transient commit"), {
          errorLabels: ["TransientTransactionError"],
          hasErrorLabel: (label: string) => label === "TransientTransactionError",
        }),
      );
    }

    sessions.push(session);
    return session;
  });

  return { sessions, startSessionMock, retryState };
});

vi.mock("mongoose", async (importOriginal) => {
  const mongoose = await importOriginal<typeof import("mongoose")>();
  return {
    ...mongoose,
    default: {
      ...mongoose.default,
      startSession: startSessionMock,
    },
  };
});

vi.mock("../../../src/providers/logger", () => ({
  default: { database: vi.fn(), error: vi.fn() },
}));

const companyRepository = vi.hoisted(() => ({
  findById: vi.fn(),
  touchBookingSerialization: vi.fn(),
  softDelete: vi.fn(),
}));

const appointmentRepository = vi.hoisted(() => ({
  hasOpenAppointmentsForCompany: vi.fn(),
}));

vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({
  default: companyRepository,
}));

vi.mock("../../../src/modules/appointments/repositories/AppointmentRepository", () => ({
  default: appointmentRepository,
}));

import CompanyService from "../../../src/modules/companies/services/CompanyService";

const companyId = "507f1f77bcf86cd799439011";

const activeCompany = {
  _id: { toString: () => companyId },
  id: companyId,
  name: "Empresa",
  timezone: "Europe/Lisbon",
  isActive: true,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("CompanyService.delete — referenceNow por tentativa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessions.length = 0;
    retryState.rejectTransientOnFirstCommit = true;
    vi.useFakeTimers();
    vi.setSystemTime(T1);

    companyRepository.findById.mockResolvedValue(activeCompany);
    companyRepository.touchBookingSerialization.mockResolvedValue(activeCompany);
    companyRepository.softDelete.mockResolvedValue({
      ...activeCompany,
      isActive: false,
      deletedAt: new Date(),
    });
    appointmentRepository.hasOpenAppointmentsForCompany.mockResolvedValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function runWithTimers<T>(run: () => Promise<T>): Promise<T> {
    const promise = run();
    await vi.runAllTimersAsync();
    return promise;
  }

  it("atualiza referenceNow entre retries integrais da transação", async () => {
    const nowByCall: number[] = [];
    appointmentRepository.hasOpenAppointmentsForCompany.mockImplementation(
      async (_id, now: Date) => {
        nowByCall.push(now.getTime());
        return false;
      },
    );

    await runWithTimers(() => CompanyService.delete(companyId, companyId));

    expect(startSessionMock).toHaveBeenCalledTimes(2);
    expect(companyRepository.softDelete.mock.calls.length).toBeGreaterThanOrEqual(1);

    const firstAttemptTimes = nowByCall.slice(0, 4);
    const secondAttemptTimes = nowByCall.slice(4);

    expect(firstAttemptTimes.length).toBe(4);
    expect(secondAttemptTimes.length).toBe(4);
    expect(new Set(firstAttemptTimes).size).toBe(1);
    expect(new Set(secondAttemptTimes).size).toBe(1);
    expect(firstAttemptTimes[0]).toBe(T1.getTime());
    expect(secondAttemptTimes[0]).toBe(T2.getTime());
    expect(secondAttemptTimes[0]!).toBeGreaterThan(firstAttemptTimes[0]!);
  });
});