import { DateTime, IANAZone } from "luxon";
import { DayOfWeek } from "../modules/availability/models/EmployeeAvailability.model";

export const DEFAULT_TIMEZONE = "Europe/Lisbon";

export function isValidIanaTimezone(timezone: string): boolean {
  return typeof timezone === "string" && IANAZone.isValidZone(timezone);
}

export function toCompanyDateTime(date: Date, timezone: string): DateTime {
  return DateTime.fromJSDate(date, { zone: timezone });
}

export function luxonWeekdayToDayOfWeek(weekday: number): DayOfWeek {
  return (weekday === 7 ? 0 : weekday) as DayOfWeek;
}

export function formatLocalTime(value: DateTime): string {
  return value.toFormat("HH:mm");
}
