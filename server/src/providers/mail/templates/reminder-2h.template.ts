/**
 * ==========================================================
 * Arquivo: reminder-2h.template.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Modelo de e-mail enviado ao cliente 2 horas antes do
 * agendamento.
 *
 * ==========================================================
 */

import {
  ReminderEmailData,
  reminderEmailLayout,
} from "./reminder-email-layout";

export function reminder2hEmail(data: ReminderEmailData): string {
  return reminderEmailLayout({
    headline: "Seu agendamento é em 2 horas",
    data,
  });
}