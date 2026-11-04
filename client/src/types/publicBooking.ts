/**
 * Contratos do FLUXO PÚBLICO DE AGENDAMENTO (Partes 1 e 4 do backend).
 *
 * Espelha, sem os adaptar:
 *
 * • `server/src/modules/public-booking/index.ts` (catálogo e disponibilidade);
 * • `server/src/modules/appointments/dto/CreatePublicAppointment.dto.ts` (criação).
 *
 * São estreitos de propósito: o cliente final não tem, nem pode controlar,
 * `companyId`, `clientId`, `status`, `endAt`, `price` ou `durationMinutes`.
 * Declarar aqui o que o backend decide impede que esse campo seja enviado por
 * engano — e o validator do backend recusa com 400 qualquer chave fora da
 * lista fechada `PUBLIC_APPOINTMENT_FIELDS`.
 */

import type { PublicAppointment } from "./publicAppointment";

/**
 * Serviço do catálogo público (`GET /api/public/companies/:companyId/services`).
 *
 * `duration` chama-se `durationMinutes` no contrato público para não obrigar o
 * consumidor a saber o nome interno do campo.
 */
export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
}

/**
 * Profissional do catálogo público (`GET .../employees`).
 *
 * Sem `role`, sem `email` e sem `publicId` do storage: o backend não os envia,
 * e mostrá-los seria além do que o link público precisa de saber.
 */
export interface PublicEmployee {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/** Horário livre devolvido pela disponibilidade. */
export interface PublicAvailabilitySlot {
  /** ISO 8601 COM deslocamento (ex.: "2026-10-08T09:00:00.000+01:00"). */
  startAt: string;
  /** ISO 8601 COM deslocamento. */
  endAt: string;
}

/** Resposta de `GET /api/public/companies/:companyId/availability`. */
export interface PublicAvailability {
  /** Data de calendário local da empresa, "AAAA-MM-DD". */
  date: string;
  /** Timezone IANA da empresa. É a fonte de verdade para apresentar horários. */
  timezone: string;
  slots: PublicAvailabilitySlot[];
}

/**
 * Corpo de `POST /api/public/companies/:companyId/appointments`.
 *
 * Lista fechada, espelhando `PUBLIC_APPOINTMENT_FIELDS`: o `companyId` vem da
 * URL e `endAt`/`status`/`price` são decididos pelo servidor.
 *
 * `clientEmail`/`clientPhone` — e não `email`/`phone` — porque é assim que o
 * contrato público da Parte 1 os chama.
 *
 * `startAt` tem de conservar o deslocamento que veio da disponibilidade: o
 * backend exige ISO 8601 com offset (`HAS_TIMEZONE_OFFSET`) para não interpretar
 * o valor no fuso do servidor.
 */
export interface CreatePublicAppointmentPayload {
  serviceId: string;
  employeeId: string;
  startAt: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  notes?: string;
}

/**
 * Corpo devolvido pela criação pública.
 *
 * `publicAccessToken` é a única cópia do token puro que alguma vez sai do
 * servidor: a base de dados guarda apenas o hash. Por isso não é persistido
 * em lado nenhum — vive no estado da página, até ao fim do ecrã.
 */
export interface CreatePublicAppointmentResult {
  appointment: PublicAppointment;
  publicAccessToken: string;
}