/**
 * ==========================================================
 * Arquivo: reminder-24h.template.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Modelo de e-mail enviado ao cliente 24 horas antes do
 * agendamento.
 *
 * ==========================================================
 */

import {
  ReminderEmailData,
  reminderEmailLayout,
} from "./reminder-email-layout";

export function reminder24hEmail(data: ReminderEmailData): string {
  return reminderEmailLayout({
    headline: "Seu agendamento é em 24 horas",
    data,
  });
}