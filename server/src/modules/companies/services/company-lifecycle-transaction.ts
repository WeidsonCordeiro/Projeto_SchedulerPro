import mongoose, { ClientSession } from "mongoose";

const MAX_ATTEMPTS = 4;

function isTransientTransactionError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: number; errorLabels?: string[] };
  if (candidate.code === 112) {
    return true;
  }

  return (
    candidate.errorLabels?.includes("TransientTransactionError") === true ||
    candidate.errorLabels?.includes("UnknownTransactionCommitResult") === true
  );
}

export async function withCompanyLifecycleTransaction<T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();
      const result = await operation(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      lastError = error;
      await session.abortTransaction().catch(() => undefined);

      if (isTransientTransactionError(error) && attempt < MAX_ATTEMPTS) {
        continue;
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  throw lastError;
}
