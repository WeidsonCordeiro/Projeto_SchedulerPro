import type { AppointmentStatus } from "../types/appointment";

export interface ServiceCalendarPaletteEntry {
  bg: string;
  fg: string;
}

/** Fundos claros + texto escuro; faixa de estado usa cores saturadas em CSS. */
export const SERVICE_CALENDAR_PALETTE: readonly ServiceCalendarPaletteEntry[] = [
  { bg: "#dbeafe", fg: "#1e3a5f" },
  { bg: "#d1fae5", fg: "#14532d" },
  { bg: "#fce7f3", fg: "#831843" },
  { bg: "#fef3c7", fg: "#78350f" },
  { bg: "#e0e7ff", fg: "#312e81" },
  { bg: "#ccfbf1", fg: "#134e4a" },
  { bg: "#fae8ff", fg: "#581c87" },
  { bg: "#ffedd5", fg: "#7c2d12" },
  { bg: "#e2e8f0", fg: "#1e293b" },
  { bg: "#ddd6fe", fg: "#4c1d95" },
];

export const SERVICE_CALENDAR_FALLBACK: ServiceCalendarPaletteEntry = {
  bg: "#e8ecf1",
  fg: "#334155",
};

export function hashServiceId(serviceId: string): number {
  let hash = 5381;
  for (let i = 0; i < serviceId.length; i += 1) {
    hash = (hash * 33) ^ serviceId.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function getServicePaletteIndex(
  serviceId: string | null | undefined,
): number {
  if (!serviceId || serviceId.trim() === "") {
    return -1;
  }
  return hashServiceId(serviceId) % SERVICE_CALENDAR_PALETTE.length;
}

export function getServiceCalendarStyle(serviceId: string | null | undefined): {
  backgroundColor: string;
  color: string;
  paletteIndex: number;
} {
  const index = getServicePaletteIndex(serviceId);
  if (index < 0) {
    return {
      backgroundColor: SERVICE_CALENDAR_FALLBACK.bg,
      color: SERVICE_CALENDAR_FALLBACK.fg,
      paletteIndex: -1,
    };
  }
  const entry = SERVICE_CALENDAR_PALETTE[index];
  return {
    backgroundColor: entry.bg,
    color: entry.fg,
    paletteIndex: index,
  };
}

/** Classes de faixa esquerda por estado (cores alinhadas a .status-* no CSS). */
export const APPOINTMENT_STATUS_STRIPE_CLASS: Record<AppointmentStatus, string> =
  {
    scheduled: "calendar-status-stripe--scheduled",
    confirmed: "calendar-status-stripe--confirmed",
    completed: "calendar-status-stripe--completed",
    cancelled: "calendar-status-stripe--cancelled",
    "no-show": "calendar-status-stripe--no-show",
  };

const TERMINAL_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  "cancelled",
  "no-show",
]);

export function isTerminalAppointmentStatus(status: AppointmentStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}
