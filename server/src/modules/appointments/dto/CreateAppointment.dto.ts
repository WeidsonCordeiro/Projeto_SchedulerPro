/**

* ==========================================================
* Arquivo: CreateAppointment.dto.ts
* ---
* Responsabilidade:
*
* Representar os dados necessários para criar
* um novo agendamento.
*
* ==========================================================
  */

export interface CreateAppointmentDto {
  clientId: string;
  serviceId: string;
  employeeId: string;
  startAt: Date;
  notes?: string;
}
