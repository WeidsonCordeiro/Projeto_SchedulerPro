import type { Appointment, AppointmentStatus } from "../types/appointment";

export interface AppointmentFilterCriteria {
  /** Estados activos; vazio = todos os estados. */
  statuses: ReadonlySet<AppointmentStatus>;
  /** `null` ou `""` = todos os funcionários. */
  employeeId: string | null;
}

export const EMPTY_APPOINTMENT_FILTER_CRITERIA: AppointmentFilterCriteria = {
  statuses: new Set(),
  employeeId: null,
};

export function hasActiveFilters(criteria: AppointmentFilterCriteria): boolean {
  return criteria.statuses.size > 0 || Boolean(criteria.employeeId);
}

export function filterAppointments(
  appointments: Appointment[],
  criteria: AppointmentFilterCriteria,
): Appointment[] {
  if (!hasActiveFilters(criteria)) {
    return appointments;
  }

  return appointments.filter((appointment) => {
    if (
      criteria.statuses.size > 0 &&
      !criteria.statuses.has(appointment.status)
    ) {
      return false;
    }
    if (
      criteria.employeeId &&
      appointment.employeeId !== criteria.employeeId
    ) {
      return false;
    }
    return true;
  });
}
