import mongoose, { ClientSession } from "mongoose";

const MAX_ATTEMPTS = 4;

function isRetryableTransactionError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const mongoError = error as {
    code?: number;
    hasErrorLabel?: (label: string) => boolean;
  };

  if (mongoError.code === 112) {
    return true;
  }

  if (typeof mongoError.hasErrorLabel === "function") {
    return (
      mongoError.hasErrorLabel("TransientTransactionError") ||
      mongoError.hasErrorLabel("UnknownTransactionCommitResult")
    );
  }

  return false;
}

/**
 * Executa operações de reserva dentro de uma transação MongoDB, com
 * reintentos limitados para erros transitórios e conflitos de escrita.
 */
export async function withBookingTransaction<T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();
      const result = await operation(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      lastError = error;

      try {
        await session.abortTransaction();
      } catch {
        // ignore abort failures
      }

      if (attempt < MAX_ATTEMPTS && isRetryableTransactionError(error)) {
        continue;
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  throw lastError;
}
