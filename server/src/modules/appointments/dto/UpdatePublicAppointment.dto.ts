/**

* ==========================================================
* Arquivo: UpdatePublicAppointment.dto.ts
* ---
* Responsabilidade:
*
* Representar os dados que o cliente final pode alterar
* através do link público do agendamento.
*
* A lista é deliberadamente mais estreita que a do fluxo
* administrativo:
*
* • `clientName`, `clientEmail` e `clientPhone` NÃO são
*   aceites. O `Client` é um cadastro partilhado pela empresa,
*   com possíveis outros agendamentos e conta associada: um link
*   público não pode reescrever a identidade de um cliente que
*   a empresa gere. Ver o relatório, secção "Decisões".
* • `status`, `endAt`, `duration`, `price`, `companyId` e
*   `clientId` nunca são controláveis pelo cliente.
*
* Os campos de agenda (`serviceId`, `employeeId`, `startAt`)
* são validados de forma idêntica à criação pública.
* ==========================================================
  */

export interface UpdatePublicAppointmentDto {
  serviceId?: string;
  employeeId?: string;
  startAt?: string;
  notes?: string | null;
}

/**
 * Campos aceites pelo PATCH público.
 *
 * Lista fechada: alimenta a rejeição de campos desconhecidos
 * no validator.
 */
export const PUBLIC_APPOINTMENT_UPDATE_FIELDS = [
  "serviceId",
  "employeeId",
  "startAt",
  "notes",
] as const;