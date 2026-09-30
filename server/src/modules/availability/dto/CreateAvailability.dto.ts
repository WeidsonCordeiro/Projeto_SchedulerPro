/**
 * ==========================================================
 * Arquivo: CreateAvailability.dto.ts
 * ---
 * Responsabilidade:
 *
 * Representar os dados necessários para criar
 * a disponibilidade de um funcionário.
 *
 * Um funcionário pode possuir disponibilidade
 * pela manhã, à tarde ou nos dois períodos.
 *
 * ==========================================================
 */

import { DayOfWeek } from "../models/EmployeeAvailability.model";

export interface CreateAvailabilityDto {
  employeeId: string;
  dayOfWeek: DayOfWeek;
  morningStart?: string | null;
  morningEnd?: string | null;
  afternoonStart?: string | null;
  afternoonEnd?: string | null;
}
