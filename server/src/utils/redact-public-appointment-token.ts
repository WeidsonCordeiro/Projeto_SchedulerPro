/** Redact bearer credentials from public appointment URLs before logging. */
export function redactPublicAppointmentToken(value: string): string {
  return value.replace(
    /(\/api\/public\/appointments\/)[^/?\s]+/g,
    "$1[REDACTED]",
  );
}
