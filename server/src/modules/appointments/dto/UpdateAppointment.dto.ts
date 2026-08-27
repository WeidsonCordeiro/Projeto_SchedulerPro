/**

* ==========================================================
* Arquivo: UpdateAppointment.dto.ts
* ---
* Responsabilidade:
*
* Representar os dados permitidos para atualização
* de um agendamento.
*
* ==========================================================
  */

export interface UpdateAppointmentDto {
  clientId?: string;
  serviceId?: string;
  employeeId?: string;
  startAt?: Date;
  notes?: string;
}
