import { Role } from "../../../constants/roles";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import { AppError } from "../../../errors/AppError";
import type { AppointmentDocument } from "../models/Appointment.model";
import AppointmentRepository from "../repositories/AppointmentRepository";
import type { UpdateAppointmentDto } from "../dto/UpdateAppointment.dto";
import {
  resolveAppointmentReadScope,
  toAppointmentListScope,
  type SessionUserForReadScope,
} from "./appointment-read-scope";

export type { SessionUserForReadScope };

export type EmployeeUpdateFields = Pick<UpdateAppointmentDto, "notes" | "startAt">;

/**
 * Carrega o agendamento para mutação staff, com o mesmo escopo de leitura (O6).
 */
export async function loadAppointmentForStaffWrite(
  id: string,
  user: SessionUserForReadScope,
): Promise<AppointmentDocument> {
  const listScope = toAppointmentListScope(resolveAppointmentReadScope(user));

  const appointment = await AppointmentRepository.findByIdInCompany(
    id,
    user.companyId,
    listScope,
  );

  if (!appointment) {
    throw new AppError(
      HttpMessages.APPOINTMENT_NOT_FOUND,
      HttpStatus.NOT_FOUND,
    );
  }

  return appointment;
}

/**
 * EMPLOYEE não pode enviar clientId, serviceId nem employeeId no PATCH.
 */
export function assertEmployeePatchAllowed(dto: UpdateAppointmentDto): void {
  if (
    dto.clientId !== undefined ||
    dto.serviceId !== undefined ||
    dto.employeeId !== undefined
  ) {
    throw new AppError(
      HttpMessages.APPOINTMENT_UPDATE_FIELD_NOT_ALLOWED,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export function isEmployeeRole(role: Role): boolean {
  return role === Role.EMPLOYEE;
}

export function pickEmployeeUpdateDto(
  dto: UpdateAppointmentDto,
): EmployeeUpdateFields {
  const picked: EmployeeUpdateFields = {};
  if (dto.notes !== undefined) {
    picked.notes = dto.notes;
  }
  if (dto.startAt !== undefined) {
    picked.startAt = dto.startAt;
  }
  return picked;
}

export function listScopeForWriteUser(
  user: SessionUserForReadScope,
): ReturnType<typeof toAppointmentListScope> {
  return toAppointmentListScope(resolveAppointmentReadScope(user));
}
