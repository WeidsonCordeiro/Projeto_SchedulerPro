/**
 * ==========================================================
 * Arquivo: UpdateAvailabilityException.dto.ts
 * ---
 * Responsabilidade:
 *
 * Representar os dados permitidos para atualizar uma
 * exceção de disponibilidade (bloqueio/férias/feriado).
 *
 * ==========================================================
 */

import { AvailabilityExceptionType } from "../models/AvailabilityException.model";

export interface UpdateAvailabilityExceptionDto {
  employeeId?: string;
  date?: string;
  allDay?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  type?: AvailabilityExceptionType;
  reason?: string | null;
}