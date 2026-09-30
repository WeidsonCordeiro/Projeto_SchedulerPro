/**
 * ==========================================================
 * Arquivo: UpdateAvailability.dto.ts
 * ---
 * Responsabilidade:
 *
 * Representar os dados permitidos para atualizar
 * a disponibilidade de um funcionário.
 *
 * ==========================================================
 */

import { DayOfWeek } from "../models/EmployeeAvailability.model";

export interface UpdateAvailabilityDto {
  employeeId?: string;
  dayOfWeek?: DayOfWeek;
  morningStart?: string | null;
  morningEnd?: string | null;
  afternoonStart?: string | null;
  afternoonEnd?: string | null;
}
