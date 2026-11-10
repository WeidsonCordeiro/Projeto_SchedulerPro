import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpStatus } from "../../../src/constants/http-status";
import { AppError } from "../../../src/errors/AppError";

const logger = vi.hoisted(() => ({
  database: vi.fn(),
  error: vi.fn(),
}));

function createSession() {
  return {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn().mockResolvedValue(undefined),
    abortTransaction: vi.fn().mockResolvedValue(undefined),
    endSession: vi.fn().mockResolvedValue(undefined),
  };
}

const { sessions, startSessionMock } = vi.hoisted(() => {
  const sessions: ReturnType<typeof createSession>[] = [];

  const startSessionMock = vi.fn(async () => {
    const session = createSession();
    sessions.push(session);
    return session;
  });

  return { sessions, startSessionMock };
});

vi.mock("mongoose", () => ({
  default: {
    startSession: startSessionMock,
  },
}));

vi.mock("../../../src/providers/logger", () => ({
  default: logger,
}));

import {
  BOOKING_TRANSACTION_MAX_ATTEMPTS,
  computeBookingTransactionBackoffMs,
  delayForBookingTransactionRetry,
  isRetryableBookingTransactionError,
  isUnknownTransactionCommitResultError,
  withBookingTransaction,
} from "../../../src/modules/appointments/services/appointment-booking-transaction";

function mongoError(labels?: string[], code?: number) {
  return Object.assign(new Error("mongo"), {
    code,
    errorLabels: labels,
    hasErrorLabel: (label: string) => labels?.includes(label) ?? false,
  });
}

function unknownCommitError() {
  return mongoError(["UnknownTransactionCommitResult"]);
}

function transientError(code?: number) {
  return mongoError(
    code === 112 ? ["TransientTransactionError"] : ["TransientTransactionError"],
    code,
  );
}

describe("isUnknownTransactionCommitResultError", () => {
  it("returns true for UnknownTransactionCommitResult", () => {
    expect(isUnknownTransactionCommitResultError(unknownCommitError())).toBe(
      true,
    );
  });

  it("returns false for TransientTransactionError only", () => {
    expect(isUnknownTransactionCommitResultError(transientError(112))).toBe(
      false,
    );
  });
});

describe("isRetryableBookingTransactionError", () => {
  it("returns false for AppError", () => {
    expect(
      isRetryableBookingTransactionError(
        new AppError("Conflito", HttpStatus.CONFLICT),
      ),
    ).toBe(false);
  });

  it("returns true for MongoDB code 112", () => {
    expect(isRetryableBookingTransactionError({ code: 112 })).toBe(true);
  });

  it("returns true for TransientTransactionError", () => {
    expect(
      isRetryableBookingTransactionError(transientError()),
    ).toBe(true);
  });

  it("returns false for UnknownTransactionCommitResult", () => {
    expect(isRetryableBookingTransactionError(unknownCommitError())).toBe(
      false,
    );
  });

  it("returns false for generic errors", () => {
    expect(isRetryableBookingTransactionError(new Error("fail"))).toBe(false);
  });
});

describe("computeBookingTransactionBackoffMs", () => {
  it("applies full jitter with a deterministic random", () => {
    const ms = computeBookingTransactionBackoffMs(1, () => 0.5);
    expect(ms).toBe(2);
  });
});

describe("withBookingTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessions.length = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function runWithTimers<T>(run: () => Promise<T>): Promise<T> {
    const promise = run();
    await vi.runAllTimersAsync();
    return promise;
  }

  // Cenário 1 — commit com sucesso
  it("runs the callback and commit once on success", async () => {
    const operation = vi.fn().mockResolvedValue("ok");

    const result = await withBookingTransaction(operation);

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(1);
    expect(startSessionMock).toHaveBeenCalledTimes(1);
    expect(sessions[0]?.commitTransaction).toHaveBeenCalledTimes(1);
  });

  // Cenário 2 — UnknownTransactionCommitResult seguido de sucesso
  it("retries commit only on UnknownTransactionCommitResult without re-running the callback", async () => {
    const operation = vi.fn().mockResolvedValue("payload");
    const unknown = unknownCommitError();

    startSessionMock.mockImplementationOnce(async () => {
      const session = createSession();
      session.commitTransaction
        .mockRejectedValueOnce(unknown)
        .mockResolvedValueOnce(undefined);
      sessions.push(session);
      return session;
    });

    const result = await runWithTimers(() => withBookingTransaction(operation));

    expect(result).toBe("payload");
    expect(operation).toHaveBeenCalledTimes(1);
    expect(startSessionMock).toHaveBeenCalledTimes(1);
    expect(sessions[0]?.commitTransaction).toHaveBeenCalledTimes(2);
    expect(sessions[0]?.startTransaction).toHaveBeenCalledTimes(1);
  });

  // Cenário 3 — Unknown esgotado
  it("propagates after exhausting commit retries without re-running the callback", async () => {
    vi.useRealTimers();

    const unknown = unknownCommitError();
    startSessionMock.mockImplementationOnce(async () => {
      const session = createSession();
      session.commitTransaction.mockRejectedValue(unknown);
      sessions.push(session);
      return session;
    });

    const operation = vi.fn().mockResolvedValue("x");

    await expect(withBookingTransaction(operation)).rejects.toBe(unknown);

    expect(operation).toHaveBeenCalledTimes(1);
    expect(sessions[0]?.commitTransaction).toHaveBeenCalledTimes(
      BOOKING_TRANSACTION_MAX_ATTEMPTS,
    );
    expect(logger.error).toHaveBeenCalledWith(
      "Commit de agendamento esgotou reintentos",
      expect.objectContaining({ exhausted: true, retryScope: "commit" }),
    );
  });

  // Cenário 4 — Transient no callback
  it("retries the full transaction when the callback fails with TransientTransactionError", async () => {
    const err = transientError(112);
    const operation = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce("done");

    const result = await runWithTimers(() => withBookingTransaction(operation));

    expect(result).toBe("done");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(startSessionMock).toHaveBeenCalledTimes(2);
  });

  // Cenário 5 — WriteConflict no callback
  it("retries the full transaction on WriteConflict (112) in the callback", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce({ code: 112 })
      .mockResolvedValueOnce(1);

    await runWithTimers(() => withBookingTransaction(operation));

    expect(operation).toHaveBeenCalledTimes(2);
    expect(startSessionMock).toHaveBeenCalledTimes(2);
  });

  // Cenário 6 — AppError
  it("does not retry AppError", async () => {
    const conflict = new AppError("Conflito", HttpStatus.CONFLICT);
    const operation = vi.fn().mockRejectedValue(conflict);

    await expect(withBookingTransaction(operation)).rejects.toBe(conflict);

    expect(operation).toHaveBeenCalledTimes(1);
  });

  // Cenário 7 — erro genérico
  it("does not retry generic errors", async () => {
    const fatal = new Error("fatal");
    const operation = vi.fn().mockRejectedValue(fatal);

    await expect(withBookingTransaction(operation)).rejects.toBe(fatal);

    expect(operation).toHaveBeenCalledTimes(1);
  });

  // Cenário 8 — falha no abortTransaction
  it("preserves the original error when abortTransaction fails", async () => {
    const original = new Error("callback failed");
    startSessionMock.mockImplementationOnce(async () => {
      const session = createSession();
      session.abortTransaction.mockRejectedValue(new Error("abort failed"));
      sessions.push(session);
      return session;
    });

    const operation = vi.fn().mockRejectedValue(original);

    await expect(withBookingTransaction(operation)).rejects.toBe(original);
  });

  // Cenário 9 — falha no endSession
  it("logs endSession failure without masking the primary error", async () => {
    const primary = new Error("primary");
    startSessionMock.mockImplementationOnce(async () => {
      const session = createSession();
      session.endSession.mockRejectedValue(new Error("end failed"));
      sessions.push(session);
      return session;
    });

    const operation = vi.fn().mockRejectedValue(primary);

    await expect(withBookingTransaction(operation)).rejects.toBe(primary);

    expect(logger.database).toHaveBeenCalledWith(
      "Falha ao encerrar sessão de agendamento",
      expect.any(Object),
    );
  });
});

describe("delayForBookingTransactionRetry", () => {
  it("resolves immediately for zero delay", async () => {
    await expect(delayForBookingTransactionRetry(0)).resolves.toBeUndefined();
  });
});
