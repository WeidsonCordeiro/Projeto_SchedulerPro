import type { Appointment, AppointmentStatus } from "./appointment";

export interface DashboardSummary {
  period: {
    startAt: string;
    endAt: string;
    total: number;
    byStatus: Record<AppointmentStatus, number>;
  };
  todayAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  activeClientsCount: number;
}
