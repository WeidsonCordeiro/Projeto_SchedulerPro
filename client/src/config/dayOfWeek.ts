import type { DayOfWeek } from "../types/availability";

/**
 * Enumeração real do backend (EmployeeAvailability.model.ts):
 * SUNDAY=0, MONDAY=1, TUESDAY=2, WEDNESDAY=3, THURSDAY=4, FRIDAY=5, SATURDAY=6.
 * A ordem segue exatamente o modelo para evitar deslocamentos de dia.
 */
export const DAY_ORDER: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

export const SHORT_DAY_LABELS: Record<DayOfWeek, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

export function getDayLabel(day: DayOfWeek): string {
  return DAY_LABELS[day];
}