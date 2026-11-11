/**
 * Intervalo padrão do job de expiração de agendamentos (ms).
 * Espelha {@link REMINDER_JOB_INTERVAL_MS} (60s).
 */
export const DEFAULT_APPOINTMENT_EXPIRATION_INTERVAL_MS = 60_000;

export function resolveAppointmentExpirationIntervalMs(
  raw: string | undefined,
): number {
  if (!raw?.trim()) {
    return DEFAULT_APPOINTMENT_EXPIRATION_INTERVAL_MS;
  }

  return Number(raw.trim());
}
