/**
 * ==========================================================
 * Arquivo: appointment-updated.template.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Modelo de e-mail enviado ao cliente quando um agendamento
 * é atualizado.
 *
 * ==========================================================
 */

import {
  AppointmentEmailData,
  appointmentEmailLayout,
} from "./appointment-email-layout";

export function appointmentUpdatedEmail(
  data: AppointmentEmailData,
): string {
  return appointmentEmailLayout({
    statusLabel: "Agendamento atualizado",
    data,
  });
}