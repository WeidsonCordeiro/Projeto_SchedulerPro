/**
 * ==========================================================
 * Arquivo: appointment-created.template.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Modelo de e-mail enviado ao cliente quando um agendamento
 * é criado.
 *
 * ==========================================================
 */

import {
  AppointmentEmailData,
  appointmentEmailLayout,
} from "./appointment-email-layout";

export function appointmentCreatedEmail(
  data: AppointmentEmailData,
): string {
  return appointmentEmailLayout({
    statusLabel: "Agendamento confirmado",
    data,
  });
}