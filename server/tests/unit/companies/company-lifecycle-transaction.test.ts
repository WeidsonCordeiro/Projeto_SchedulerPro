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
  COMPANY_LIFECYCLE_MAX_ATTEMPTS,
  LIFECYCLE_COMMIT_MAX_ATTEMPTS,
  withCompanyLifecycleTransaction,
} from "../../../src/modules/companies/services/company-lifecycle-transaction";

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

describe("withCompanyLifecycleTransaction", () => {
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

  it("runs the callback and commit once on success", async () => {
    const operation = vi.fn().mockResolvedValue("ok");

    const result = await withCompanyLifecycleTransaction(operation);

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(1);
    expect(startSessionMock).toHaveBeenCalledTimes(1);
    expect(sessions[0]?.startTransaction).toHaveBeenCalledTimes(1);
    expect(sessions[0]?.commitTransaction).toHaveBeenCalledTimes(1);
    expect(sessions[0]?.endSession).toHaveBeenCalledTimes(1);
    expect(sessions[0]?.abortTransaction).not.toHaveBeenCalled();
  });

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

    const result = await runWithTimers(() =>
      withCompanyLifecycleTransaction(operation),
    );

    expect(result).toBe("payload");
    expect(operation).toHaveBeenCalledTimes(1);
    expect(startSessionMock).toHaveBeenCalledTimes(1);
    expect(sessions[0]?.commitTransaction).toHaveBeenCalledTimes(2);
    expect(sessions[0]?.startTransaction).toHaveBeenCalledTimes(1);
    expect(sessions[0]?.abortTransaction).not.toHaveBeenCalled();
  });

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

    await expect(
      withCompanyLifecycleTransaction(operation),
    ).rejects.toBe(unknown);

    expect(operation).toHaveBeenCalledTimes(1);
    expect(sessions[0]?.commitTransaction).toHaveBeenCalledTimes(
      LIFECYCLE_COMMIT_MAX_ATTEMPTS,
    );
    expect(logger.error).toHaveBeenCalledWith(
      "Commit de ciclo de vida esgotou reintentos",
      expect.objectContaining({ exhausted: true, retryScope: "commit" }),
    );
  });

  it("retries the full transaction when the callback fails with TransientTransactionError", async () => {
    const err = transientError();
    const operation = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce("done");

    const result = await runWithTimers(() =>
      withCompanyLifecycleTransaction(operation),
    );

    expect(result).toBe("done");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(startSessionMock).toHaveBeenCalledTimes(2);
    expect(sessions[0]?.abortTransaction).toHaveBeenCalledTimes(1);
    expect(sessions[0]?.endSession).toHaveBeenCalledTimes(1);
  });

  it("retries the full transaction on WriteConflict (112) in the callback", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce({ code: 112 })
      .mockResolvedValueOnce(1);

    await runWithTimers(() => withCompanyLifecycleTransaction(operation));

    expect(operation).toHaveBeenCalledTimes(2);
    expect(startSessionMock).toHaveBeenCalledTimes(2);
  });

  it("retries the full transaction when commit fails with TransientTransactionError", async () => {
    const err = transientError();
    const operation = vi.fn().mockResolvedValue("ok");

    startSessionMock.mockImplementationOnce(async () => {
      const session = createSession();
      session.commitTransaction.mockRejectedValueOnce(err);
      sessions.push(session);
      return session;
    });

    const result = await runWithTimers(() =>
      withCompanyLifecycleTransaction(operation),
    );

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(startSessionMock).toHaveBeenCalledTimes(2);
    expect(sessions[0]?.abortTransaction).toHaveBeenCalledTimes(1);
    expect(sessions[0]?.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it("does not retry AppError", async () => {
    const conflict = new AppError("Conflito", HttpStatus.CONFLICT);
    const operation = vi.fn().mockRejectedValue(conflict);

    await expect(
      withCompanyLifecycleTransaction(operation),
    ).rejects.toBe(conflict);

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("does not retry generic errors", async () => {
    const fatal = new Error("fatal");
    const operation = vi.fn().mockRejectedValue(fatal);

    await expect(
      withCompanyLifecycleTransaction(operation),
    ).rejects.toBe(fatal);

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("preserves the original error when abortTransaction fails", async () => {
    const original = new Error("callback failed");
    startSessionMock.mockImplementationOnce(async () => {
      const session = createSession();
      session.abortTransaction.mockRejectedValue(new Error("abort failed"));
      sessions.push(session);
      return session;
    });

    const operation = vi.fn().mockRejectedValue(original);

    await expect(
      withCompanyLifecycleTransaction(operation),
    ).rejects.toBe(original);
  });

  it("logs endSession failure without masking the primary error", async () => {
    const primary = new Error("primary");
    startSessionMock.mockImplementationOnce(async () => {
      const session = createSession();
      session.endSession.mockRejectedValue(new Error("end failed"));
      sessions.push(session);
      return session;
    });

    const operation = vi.fn().mockRejectedValue(primary);

    await expect(
      withCompanyLifecycleTransaction(operation),
    ).rejects.toBe(primary);

    expect(logger.database).toHaveBeenCalledWith(
      "Falha ao encerrar sessão de ciclo de vida da empresa",
      expect.any(Object),
    );
  });

  it("exhausts integral transaction retries and propagates", async () => {
    vi.useRealTimers();
    const err = transientError();
    const operation = vi.fn().mockRejectedValue(err);

    await expect(
      withCompanyLifecycleTransaction(operation),
    ).rejects.toBe(err);

    expect(operation).toHaveBeenCalledTimes(COMPANY_LIFECYCLE_MAX_ATTEMPTS);
    expect(startSessionMock).toHaveBeenCalledTimes(
      COMPANY_LIFECYCLE_MAX_ATTEMPTS,
    );
    expect(logger.error).toHaveBeenCalledWith(
      "Transação de ciclo de vida esgotou reintentos",
      expect.objectContaining({ exhausted: true, retryScope: "transaction" }),
    );
  });
});