/**

* ==========================================================
* Arquivo: appointment-status.ts
* ---
* Responsabilidade:
*
* Definir os possíveis estados de um agendamento.
*
* ==========================================================
  */

export enum AppointmentStatus {
  SCHEDULED = "scheduled",
  CONFIRMED = "confirmed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  NO_SHOW = "no-show",
}
