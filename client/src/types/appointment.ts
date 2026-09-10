/**
 * Espelha a enum AppointmentStatus do backend
 * (server/src/constants/appointment-status.ts).
 */
export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no-show";

/**
 * Espelha o mapeamento de AppointmentMapper.toResponse.
 * startAt e endAt são instantes no formato ISO 8601 (UTC).
 * deletedAt não é devolvido pelo backend e não existe na resposta.
 */
export interface Appointment {
  id: string;
  companyId: string;
  clientId: string;
  serviceId: string;
  employeeId: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload de criação. endAt é calculado pelo backend
 * (startAt + service.duration) e status inicia como "scheduled".
 * companyId é obtido pelo backend a partir do usuário autenticado.
 */
export interface CreateAppointmentPayload {
  clientId: string;
  serviceId: string;
  employeeId: string;
  startAt: string;
  notes?: string;
}

/**
 * Payload de atualização. endAt e status não são atualizados via PATCH geral;
 * status só muda pelos endpoints dedicados (/confirm, /complete, /cancel, /no-show).
 */
export interface UpdateAppointmentPayload {
  clientId?: string;
  serviceId?: string;
  employeeId?: string;
  startAt?: string;
  notes?: string;
}