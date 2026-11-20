import mongoose, { ClientSession } from "mongoose";
import { AppError } from "../../../errors/AppError";
import Logger from "../../../providers/logger";

export const COMPANY_LIFECYCLE_MAX_ATTEMPTS = 4;
export const LIFECYCLE_COMMIT_MAX_ATTEMPTS = 8;

const BACKOFF_BASE_MS = 5;
const BACKOFF_MAX_MS = 50;

const UNKNOWN_COMMIT_LABEL = "UnknownTransactionCommitResult";
const TRANSIENT_TRANSACTION_LABEL = "TransientTransactionError";

function extractMongoErrorMeta(error: unknown): {
  code?: number;
  errorLabels?: string[];
} {
  if (!error || typeof error !== "object") {
    return {};
  }

  const mongoError = error as {
    code?: number;
    errorLabels?: string[];
    hasErrorLabel?: (label: string) => boolean;
  };

  const labels = mongoError.errorLabels?.slice();

  if (!labels?.length && typeof mongoError.hasErrorLabel === "function") {
    const candidates = [UNKNOWN_COMMIT_LABEL, TRANSIENT_TRANSACTION_LABEL];
    const fromFn = candidates.filter((label) => mongoError.hasErrorLabel!(label));
    if (fromFn.length > 0) {
      return { code: mongoError.code, errorLabels: fromFn };
    }
  }

  return { code: mongoError.code, errorLabels: labels };
}

function hasMongoErrorLabel(error: unknown, label: string): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const { errorLabels } = extractMongoErrorMeta(error);

  if (errorLabels?.includes(label)) {
    return true;
  }

  const mongoError = error as { hasErrorLabel?: (l: string) => boolean };
  return (
    typeof mongoError.hasErrorLabel === "function" &&
    mongoError.hasErrorLabel(label)
  );
}

function isUnknownTransactionCommitResultError(error: unknown): boolean {
  if (error instanceof AppError) {
    return false;
  }

  return hasMongoErrorLabel(error, UNKNOWN_COMMIT_LABEL);
}

function isRetryableLifecycleTransactionError(error: unknown): boolean {
  if (error instanceof AppError) {
    return false;
  }

  if (!error || typeof error !== "object") {
    return false;
  }

  if (isUnknownTransactionCommitResultError(error)) {
    return false;
  }

  const { code, errorLabels } = extractMongoErrorMeta(error);

  if (code === 112) {
    return true;
  }

  if (errorLabels?.includes(TRANSIENT_TRANSACTION_LABEL)) {
    return true;
  }

  return hasMongoErrorLabel(error, TRANSIENT_TRANSACTION_LABEL);
}

function computeLifecycleTransactionBackoffMs(
  failedAttempt: number,
  random: () => number = Math.random,
): number {
  if (failedAttempt < 1) {
    return 0;
  }

  const capped =
    Math.min(BACKOFF_BASE_MS * 2 ** (failedAttempt - 1), BACKOFF_MAX_MS);
  return Math.floor(random() * capped);
}

function delayForLifecycleTransactionRetry(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function tryAbortTransaction(session: ClientSession): Promise<void> {
  try {
    await session.abortTransaction();
  } catch {
    // ignore abort failures
  }
}

async function endLifecycleSession(session: ClientSession): Promise<void> {
  try {
    await session.endSession();
  } catch (endError) {
    const { code, errorLabels } = extractMongoErrorMeta(endError);

    Logger.database("Falha ao encerrar sessão de ciclo de vida da empresa", {
      code,
      errorLabels,
    });
  }
}

function logExhaustedRetries(
  error: unknown,
  attempt: number,
  scope: "transaction" | "commit",
): void {
  const { code, errorLabels } = extractMongoErrorMeta(error);

  Logger.error(
    scope === "commit"
      ? "Commit de ciclo de vida esgotou reintentos"
      : "Transação de ciclo de vida esgotou reintentos",
    {
      attempt,
      maxAttempts:
        scope === "commit"
          ? LIFECYCLE_COMMIT_MAX_ATTEMPTS
          : COMPANY_LIFECYCLE_MAX_ATTEMPTS,
      code,
      errorLabels,
      exhausted: true,
      retryScope: scope,
    },
  );
}

async function commitWithUnknownResultRetries(
  session: ClientSession,
): Promise<void> {
  for (
    let commitAttempt = 1;
    commitAttempt <= LIFECYCLE_COMMIT_MAX_ATTEMPTS;
    commitAttempt++
  ) {
    try {
      await session.commitTransaction();
      return;
    } catch (commitError) {
      if (!isUnknownTransactionCommitResultError(commitError)) {
        throw commitError;
      }

      const canRetryCommit =
        commitAttempt < LIFECYCLE_COMMIT_MAX_ATTEMPTS;

      if (canRetryCommit) {
        const delayMs = computeLifecycleTransactionBackoffMs(commitAttempt);
        await delayForLifecycleTransactionRetry(delayMs);
        continue;
      }

      logExhaustedRetries(commitError, commitAttempt, "commit");
      throw commitError;
    }
  }
}

export async function withCompanyLifecycleTransaction<T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= COMPANY_LIFECYCLE_MAX_ATTEMPTS;
    attempt += 1
  ) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      let result: T;
      try {
        result = await operation(session);
      } catch (operationError) {
        lastError = operationError;
        await tryAbortTransaction(session);

        const canRetryTransaction =
          attempt < COMPANY_LIFECYCLE_MAX_ATTEMPTS &&
          isRetryableLifecycleTransactionError(operationError);

        if (canRetryTransaction) {
          const delayMs = computeLifecycleTransactionBackoffMs(attempt);
          await delayForLifecycleTransactionRetry(delayMs);
          continue;
        }

        if (
          attempt >= COMPANY_LIFECYCLE_MAX_ATTEMPTS &&
          isRetryableLifecycleTransactionError(operationError)
        ) {
          logExhaustedRetries(operationError, attempt, "transaction");
        }

        throw operationError;
      }

      try {
        await commitWithUnknownResultRetries(session);
      } catch (commitError) {
        lastError = commitError;

        if (isUnknownTransactionCommitResultError(commitError)) {
          throw commitError;
        }

        await tryAbortTransaction(session);

        const canRetryTransaction =
          attempt < COMPANY_LIFECYCLE_MAX_ATTEMPTS &&
          isRetryableLifecycleTransactionError(commitError);

        if (canRetryTransaction) {
          const delayMs = computeLifecycleTransactionBackoffMs(attempt);
          await delayForLifecycleTransactionRetry(delayMs);
          continue;
        }

        if (
          attempt >= COMPANY_LIFECYCLE_MAX_ATTEMPTS &&
          isRetryableLifecycleTransactionError(commitError)
        ) {
          logExhaustedRetries(commitError, attempt, "transaction");
        }

        throw commitError;
      }

      return result;
    } finally {
      await endLifecycleSession(session);
    }
  }

  throw lastError;
}