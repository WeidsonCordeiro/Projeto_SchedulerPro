import { AppointmentStatus } from "../../constants/appointment-status";

/**
 * Janela [startAt, endAt) em UTC sobre o campo startAt do agendamento.
 */
export interface DashboardRange {
  startAt: Date;
  endAt: Date;
}

export interface DashboardSummary {
  period: {
    startAt: string;
    endAt: string;
    total: number;
    byStatus: Record<AppointmentStatus, number>;
  };
  todayAppointments: DashboardAppointmentItem[];
  upcomingAppointments: DashboardAppointmentItem[];
  activeClientsCount: number;
}

export interface DashboardAppointmentItem {
  id: string;
  companyId: string;
  clientId: string;
  serviceId: string;
  employeeId: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_UPCOMING_LIMIT = 5;
export const MAX_UPCOMING_LIMIT = 20;

export interface StatusCountRow {
  status: string;
  count: number;
}
