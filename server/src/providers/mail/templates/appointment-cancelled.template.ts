/**
 * ==========================================================
 * Arquivo: appointment-cancelled.template.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Modelo de e-mail enviado ao cliente quando um agendamento
 * é cancelado.
 *
 * ==========================================================
 */

import {
  AppointmentEmailData,
  appointmentEmailLayout,
} from "./appointment-email-layout";

export function appointmentCancelledEmail(
  data: AppointmentEmailData,
): string {
  return appointmentEmailLayout({
    statusLabel: "Agendamento cancelado",
    data,
  });
}