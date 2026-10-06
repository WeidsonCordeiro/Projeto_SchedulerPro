/**
 * Contrato PÚBLICO do agendamento (etapa anterior, backend).
 *
 * Espelha `PublicAppointmentMapper.toResponse`
 * (server/src/modules/appointments/mappers/PublicAppointmentMapper.ts).
 *
 * É deliberadamente mais estreito que o `Appointment` administrativo e por
 * isso vive num ficheiro próprio: reutilizar `Appointment` aqui obrigaria a
 * declarar `companyId`, `clientId`, `notes` e timestamps que o link público
 * nunca recebe — e a expor no tipo campos que o cliente final não pode
 * controlar.
 *
 * Nada nesta interface é editável pelo cliente: `status` e `endAt` são sempre
 * decididos pelo servidor (ver `UpdatePublicAppointmentPayload`).
 */
import type { AppointmentStatus } from "./appointment";

/** Serviço do agendamento. Só o id e o nome saem do backend. */
export interface PublicAppointmentService {
  id: string;
  name: string;
}

/**
 * Profissional do agendamento.
 *
 * `avatarUrl` é apenas a URL pública da imagem: o `publicId` do storage nunca
 * sai do backend num pedido público.
 */
export interface PublicAppointmentEmployee {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/** Resposta de GET/PATCH/DELETE /api/public/appointments/:token. */
export interface PublicAppointment {
  id: string;
  startAt: string;
  endAt: string;
  timezone: string;
  status: AppointmentStatus;
  clientName: string;
  service: PublicAppointmentService;
  employee: PublicAppointmentEmployee;
}

/**
 * Corpo aceite pelo PATCH público.
 *
 * Lista fechada, espelhando `PUBLIC_APPOINTMENT_UPDATE_FIELDS`
 * (server/src/modules/appointments/dto/UpdatePublicAppointment.dto.ts): o
 * validator recusa com 400 qualquer campo fora daqui, incluindo `status`,
 * `endAt`, `companyId`, `clientId` e os dados pessoais do cliente.
 *
 * `startAt` tem de ser ISO 8601 com deslocamento explícito (`Z` ou `±HH:MM`).
 * `notes` aceita `null` explícito para limpar e no máximo 500 caracteres.
 */
export interface UpdatePublicAppointmentPayload {
  serviceId?: string;
  employeeId?: string;
  startAt?: string;
  notes?: string | null;
}
