export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Availability {
  id: string;
  companyId: string;
  employeeId: string;
  dayOfWeek: DayOfWeek;
  morningStart: string | null;
  morningEnd: string | null;
  afternoonStart: string | null;
  afternoonEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAvailabilityPayload {
  employeeId: string;
  dayOfWeek: DayOfWeek;
  morningStart?: string | null;
  morningEnd?: string | null;
  afternoonStart?: string | null;
  afternoonEnd?: string | null;
}

export interface UpdateAvailabilityPayload {
  employeeId?: string;
  dayOfWeek?: DayOfWeek;
  morningStart?: string | null;
  morningEnd?: string | null;
  afternoonStart?: string | null;
  afternoonEnd?: string | null;
}