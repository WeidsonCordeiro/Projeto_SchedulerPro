/**

* ==========================================================
* Arquivo: AppointmentMapper.ts
* ---
* Responsabilidade:
*
* Transformar documentos de agendamento em objetos
* de resposta da API.
*
* ==========================================================
  */

import { AppointmentDocument } from "../models/Appointment.model";

class AppointmentMapper {
  /**

* ==========================================================
* Transforma um agendamento em objeto de resposta.
* ==========================================================
  */
  public static toResponse(appointment: AppointmentDocument) {
    return {
      id: appointment._id.toString(),
      companyId: appointment.companyId.toString(),
      clientId: appointment.clientId.toString(),
      serviceId: appointment.serviceId.toString(),
      employeeId: appointment.employeeId.toString(),
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      status: appointment.status,
      notes: appointment.notes,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }
}

export default AppointmentMapper;
