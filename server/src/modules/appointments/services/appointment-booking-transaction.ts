import mongoose, { ClientSession } from "mongoose";
import { AppError } from "../../../errors/AppError";
import Logger from "../../../providers/logger";

export const BOOKING_TRANSACTION_MAX_ATTEMPTS = 8;

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

/**
 * Resultado ambíguo de commit — reintentar apenas `commitTransaction` na mesma sessão.
 */
export function isUnknownTransactionCommitResultError(error: unknown): boolean {
  if (error instanceof AppError) {
    return false;
  }

  return hasMongoErrorLabel(error, UNKNOWN_COMMIT_LABEL);
}

/**
 * Erros que exigem reiniciar a transação completa (nova sessão + callback).
 * Não inclui `UnknownTransactionCommitResult` (tratado na fase de commit).
 */
export function isRetryableBookingTransactionError(error: unknown): boolean {
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

/**
 * Full jitter: uniforme em [0, min(base * 2^(failedAttempt-1), max)].
 */
export function computeBookingTransactionBackoffMs(
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

export function delayForBookingTransactionRetry(ms: number): Promise<void> {
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

async function endBookingSession(session: ClientSession): Promise<void> {
  try {
    await session.endSession();
  } catch (endError) {
    const { code, errorLabels } = extractMongoErrorMeta(endError);

    Logger.database("Falha ao encerrar sessão de agendamento", {
      code,
      errorLabels,
    });
  }
}

function logTransientFailure(
  error: unknown,
  attempt: number,
  delayMs: number,
): void {
  const { code, errorLabels } = extractMongoErrorMeta(error);

  Logger.database("Reintento de transação de agendamento (erro transitório)", {
    attempt,
    maxAttempts: BOOKING_TRANSACTION_MAX_ATTEMPTS,
    code,
    errorLabels,
    willRetry: true,
    delayMs,
    retryScope: "transaction",
  });
}

function logCommitRetry(
  error: unknown,
  transactionAttempt: number,
  commitAttempt: number,
  delayMs: number,
): void {
  const { code, errorLabels } = extractMongoErrorMeta(error);

  Logger.database("Reintento de commit de agendamento (resultado desconhecido)", {
    transactionAttempt,
    commitAttempt,
    maxAttempts: BOOKING_TRANSACTION_MAX_ATTEMPTS,
    code,
    errorLabels,
    willRetry: true,
    delayMs,
    retryScope: "commit",
  });
}

function logRetrySuccess(attempt: number): void {
  Logger.database("Transação de agendamento concluída após reintento", {
    attempt,
    maxAttempts: BOOKING_TRANSACTION_MAX_ATTEMPTS,
  });
}

function logExhaustedRetries(
  error: unknown,
  attempt: number,
  scope: "transaction" | "commit",
): void {
  const { code, errorLabels } = extractMongoErrorMeta(error);

  Logger.error(
    scope === "commit"
      ? "Commit de agendamento esgotou reintentos"
      : "Transação de agendamento esgotou reintentos",
    {
      attempt,
      maxAttempts: BOOKING_TRANSACTION_MAX_ATTEMPTS,
      code,
      errorLabels,
      exhausted: true,
      retryScope: scope,
    },
  );
}

async function commitWithUnknownResultRetries(
  session: ClientSession,
  transactionAttempt: number,
): Promise<void> {
  for (
    let commitAttempt = 1;
    commitAttempt <= BOOKING_TRANSACTION_MAX_ATTEMPTS;
    commitAttempt++
  ) {
    try {
      await session.commitTransaction();
      return;
    } catch (commitError) {
      if (!isUnknownTransactionCommitResultError(commitError)) {
        throw commitError;
      }

      const canRetryCommit = commitAttempt < BOOKING_TRANSACTION_MAX_ATTEMPTS;

      if (canRetryCommit) {
        const delayMs = computeBookingTransactionBackoffMs(commitAttempt);
        logCommitRetry(
          commitError,
          transactionAttempt,
          commitAttempt,
          delayMs,
        );
        await delayForBookingTransactionRetry(delayMs);
        continue;
      }

      logExhaustedRetries(commitError, commitAttempt, "commit");
      throw commitError;
    }
  }
}

/**
 * Executa operações de reserva dentro de uma transação MongoDB, com
 * reintentos limitados para erros transitórios e conflitos de escrita.
 */
export async function withBookingTransaction<T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= BOOKING_TRANSACTION_MAX_ATTEMPTS; attempt++) {
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
          attempt < BOOKING_TRANSACTION_MAX_ATTEMPTS &&
          isRetryableBookingTransactionError(operationError);

        if (canRetryTransaction) {
          const delayMs = computeBookingTransactionBackoffMs(attempt);
          logTransientFailure(operationError, attempt, delayMs);
          await delayForBookingTransactionRetry(delayMs);
          continue;
        }

        if (
          attempt >= BOOKING_TRANSACTION_MAX_ATTEMPTS &&
          isRetryableBookingTransactionError(operationError)
        ) {
          logExhaustedRetries(operationError, attempt, "transaction");
        }

        throw operationError;
      }

      try {
        await commitWithUnknownResultRetries(session, attempt);
      } catch (commitError) {
        lastError = commitError;

        if (isUnknownTransactionCommitResultError(commitError)) {
          throw commitError;
        }

        await tryAbortTransaction(session);

        const canRetryTransaction =
          attempt < BOOKING_TRANSACTION_MAX_ATTEMPTS &&
          isRetryableBookingTransactionError(commitError);

        if (canRetryTransaction) {
          const delayMs = computeBookingTransactionBackoffMs(attempt);
          logTransientFailure(commitError, attempt, delayMs);
          await delayForBookingTransactionRetry(delayMs);
          continue;
        }

        if (
          attempt >= BOOKING_TRANSACTION_MAX_ATTEMPTS &&
          isRetryableBookingTransactionError(commitError)
        ) {
          logExhaustedRetries(commitError, attempt, "transaction");
        }

        throw commitError;
      }

      if (attempt > 1) {
        logRetrySuccess(attempt);
      }

      return result;
    } finally {
      await endBookingSession(session);
    }
  }

  throw lastError;
}
