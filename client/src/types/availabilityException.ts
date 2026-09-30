export type AvailabilityExceptionType = "BLOCK" | "VACATION" | "HOLIDAY";

export interface AvailabilityException {
  id: string;
  companyId: string;
  employeeId: string;
  /** Data local da empresa no calendário "AAAA-MM-DD". */
  date: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  type: AvailabilityExceptionType;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAvailabilityExceptionPayload {
  employeeId: string;
  date: string;
  allDay?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  type?: AvailabilityExceptionType;
  reason?: string | null;
}

export interface UpdateAvailabilityExceptionPayload {
  employeeId?: string;
  date?: string;
  allDay?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  type?: AvailabilityExceptionType;
  reason?: string | null;
}