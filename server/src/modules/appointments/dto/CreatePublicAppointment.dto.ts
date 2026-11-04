/**

* ==========================================================
* Arquivo: CreatePublicAppointment.dto.ts
* ---
* Responsabilidade:
*
* Representar os dados que uma pessoa NÃO autenticada
* precisa fornecer para criar um agendamento.
*
* Diferenças face ao `CreateAppointmentDto` (administrativo):
*
* • `clientId` não existe: o cliente é resolvido/criado a partir
*   de `clientName` + `clientEmail` dentro da empresa da URL.
* • Não existe `companyId`: o tenant vem exclusivamente da URL
*   (`/api/public/companies/:companyId/appointments`).
* • `status`, `endAt`, `price` e `duration` nunca são enviados;
*   são determinados pelo backend.
* ==========================================================
  */

export interface CreatePublicAppointmentDto {
  serviceId: string;
  employeeId: string;
  startAt: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  notes?: string;
}

/**
 * ==========================================================
 * Campos aceites no corpo do pedido público.
 *
 * Usado pelo validator para rejeitar campos inesperados
 * (tentativa de mass assignment).
 * ==========================================================
 */
export const PUBLIC_APPOINTMENT_FIELDS = [
  "serviceId",
  "employeeId",
  "startAt",
  "clientName",
  "clientEmail",
  "clientPhone",
  "notes",
] as const;