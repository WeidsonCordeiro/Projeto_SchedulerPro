import { formatAppointmentTime } from "../../config/appointmentTime";
import { APPOINTMENT_STATUS_LABELS } from "../../config/appointmentStatus";
import {
  getServiceCalendarStyle,
  isTerminalAppointmentStatus,
} from "../../config/appointmentServiceColor";
import type { Appointment } from "../../types/appointment";

export type TimeGridEventDisplayTier =
  | "minimal"
  | "compact"
  | "comfortable"
  | "expanded";

export interface TimeGridEventDisplay {
  tier: TimeGridEventDisplayTier;
  timeMode: "startOnly" | "range";
  showClient: boolean;
  showService: boolean;
  showStatusText: boolean;
}

/** Limiares alinhados a HOUR_HEIGHT=48px e altura mínima de bloco 24px (30 min). */
const TIER_COMFORTABLE_MIN_PX = 52;
const TIER_COMPACT_MIN_PX = 36;
const TIER_EXPANDED_MIN_PX = 72;

export function resolveTimeGridEventDisplay(
  heightPx: number,
): TimeGridEventDisplay {
  if (heightPx >= TIER_EXPANDED_MIN_PX) {
    return {
      tier: "expanded",
      timeMode: "range",
      showClient: true,
      showService: true,
      showStatusText: true,
    };
  }
  if (heightPx >= TIER_COMFORTABLE_MIN_PX) {
    return {
      tier: "comfortable",
      timeMode: "range",
      showClient: true,
      showService: true,
      showStatusText: false,
    };
  }
  if (heightPx >= TIER_COMPACT_MIN_PX) {
    return {
      tier: "compact",
      timeMode: "range",
      showClient: true,
      showService: false,
      showStatusText: false,
    };
  }
  return {
    tier: "minimal",
    timeMode: "startOnly",
    showClient: true,
    showService: false,
    showStatusText: false,
  };
}

interface CalendarTimeGridEventProps {
  appointment: Appointment;
  clientName: string;
  serviceName?: string;
  timezone: string;
  heightPx: number;
}

export default function CalendarTimeGridEvent({
  appointment,
  clientName,
  serviceName,
  timezone,
  heightPx,
}: CalendarTimeGridEventProps) {
  const display = resolveTimeGridEventDisplay(heightPx);
  const statusLabel = APPOINTMENT_STATUS_LABELS[appointment.status];
  const startLabel = formatAppointmentTime(appointment.startAt, timezone);
  const endLabel = formatAppointmentTime(appointment.endAt, timezone);
  const timeLabel =
    display.timeMode === "startOnly" ? startLabel : `${startLabel} – ${endLabel}`;
  const serviceLabel = serviceName ?? "Serviço";
  const title = `${timeLabel}, ${clientName}, ${serviceLabel}, ${statusLabel}`;
  const ariaLabel = title;
  const serviceStyle = getServiceCalendarStyle(appointment.serviceId);
  const muted = isTerminalAppointmentStatus(appointment.status);

  return (
    <div
      className={`calendar-week-event calendar-week-event--${display.tier} h-100 overflow-hidden rounded border-0${muted ? " calendar-event--muted" : ""}`}
      style={{
        backgroundColor: serviceStyle.backgroundColor,
        color: serviceStyle.color,
      }}
      aria-label={ariaLabel}
      title={title}
    >
      <div className="calendar-event-time text-truncate">{timeLabel}</div>
      {display.showClient && (
        <div className="calendar-event-client text-truncate">{clientName}</div>
      )}
      {display.showService && serviceName && (
        <div className="calendar-event-service text-truncate">{serviceName}</div>
      )}
      {display.showStatusText && (
        <div className="calendar-event-status text-truncate">{statusLabel}</div>
      )}
      {!display.showStatusText && (
        <span className="visually-hidden">{statusLabel}</span>
      )}
    </div>
  );
}
