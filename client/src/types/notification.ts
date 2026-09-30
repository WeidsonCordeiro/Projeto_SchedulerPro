export type NotificationType =
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_UPDATED"
  | "APPOINTMENT_CANCELLED";

export interface Notification {
  id: string;
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string | null;
  metadata: {
    appointmentId: string | null;
    clientId: string | null;
    serviceId: string | null;
    employeeId: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UnreadCount {
  unreadCount: number;
}

export interface MarkAllReadResult {
  markedRead: number;
}