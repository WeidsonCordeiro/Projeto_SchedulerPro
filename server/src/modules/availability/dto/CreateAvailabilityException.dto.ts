/**
 * ==========================================================
 * Arquivo: CreateAvailabilityException.dto.ts
 * ---
 * Responsabilidade:
 *
 * Representar os dados necessários para criar uma exceção
 * de disponibilidade (bloqueio/férias/feriado).
 *
 * ==========================================================
 */

import { AvailabilityExceptionType } from "../models/AvailabilityException.model";

export interface CreateAvailabilityExceptionDto {
  employeeId: string;
  date: string;
  allDay?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  type?: AvailabilityExceptionType;
  reason?: string | null;
}