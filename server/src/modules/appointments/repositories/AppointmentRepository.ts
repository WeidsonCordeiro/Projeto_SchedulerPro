/**

* ==========================================================
* Arquivo: AppointmentRepository.ts
* ---
* Responsabilidade:
*
* Camada responsável por acessar os dados dos agendamentos.
*
* Nenhuma regra de negócio deve existir aqui.
*
* ==========================================================
  */

import { Types } from "mongoose";
import Appointment, { AppointmentDocument } from "../models/Appointment.model";
import { CreateAppointmentData, UpdateAppointmentData } from "../index";
import { AppointmentStatus } from "../../../constants/appointment-status";

class AppointmentRepository {
  /**

* ==========================================================
* Busca um agendamento pelo ID.
* ==========================================================
  */
  public async findById(
    id: string | Types.ObjectId,
  ): Promise<AppointmentDocument | null> {
    return Appointment.findOne({
      _id: id,
      deletedAt: null,
    });
  }

  /**

* ==========================================================
* Busca todos os agendamentos de uma empresa.
* ==========================================================
  */
  public async findByCompanyId(
    companyId: string | Types.ObjectId,
  ): Promise<AppointmentDocument[]> {
    return Appointment.find({
      companyId,
      deletedAt: null,
    }).sort({
      startAt: 1,
    });
  }

  /**

* ==========================================================
* Cria um novo agendamento.
* ==========================================================
  */
  public async create(
    data: CreateAppointmentData,
  ): Promise<AppointmentDocument> {
    return Appointment.create(data);
  }

  /**

* ==========================================================
* Atualiza um agendamento.
* ==========================================================
  */
  public async update(
    id: string | Types.ObjectId,
    data: UpdateAppointmentData,
  ): Promise<AppointmentDocument | null> {
    return Appointment.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  /**

* ==========================================================
* Atualiza o status de um agendamento.
* ==========================================================
  */
  public async updateStatus(
    id: string | Types.ObjectId,
    status: AppointmentStatus,
  ): Promise<AppointmentDocument | null> {
    return Appointment.findByIdAndUpdate(
      id,
      { status },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  /**

* ==========================================================
* Verifica conflito de horário para um funcionário.
*
* Um funcionário não pode possuir dois agendamentos
* sobrepostos.
* ==========================================================
  */
  public async hasEmployeeConflict(
    companyId: string | Types.ObjectId,
    employeeId: string | Types.ObjectId,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: string | Types.ObjectId,
  ): Promise<boolean> {
    const query: Record<string, unknown> = {
      companyId,
      employeeId,
      deletedAt: null,
      status: {
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      },
      startAt: {
        $lt: endAt,
      },
      endAt: {
        $gt: startAt,
      },
    };

    if (excludeAppointmentId) {
      query._id = {
        $ne: excludeAppointmentId,
      };
    }

    const appointment = await Appointment.findOne(query);

    return Boolean(appointment);
  }

  /**

* ==========================================================
* Verifica conflito de horário para um cliente.
*
* Um cliente não pode possuir dois agendamentos
* sobrepostos, mesmo com funcionários diferentes.
* ==========================================================
  */
  public async hasClientConflict(
    companyId: string | Types.ObjectId,
    clientId: string | Types.ObjectId,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: string | Types.ObjectId,
  ): Promise<boolean> {
    const query: Record<string, unknown> = {
      companyId,
      clientId,
      deletedAt: null,
      status: {
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      },
      startAt: {
        $lt: endAt,
      },
      endAt: {
        $gt: startAt,
      },
    };

    if (excludeAppointmentId) {
      query._id = {
        $ne: excludeAppointmentId,
      };
    }

    const appointment = await Appointment.findOne(query);

    return Boolean(appointment);
  }

  /**

* ==========================================================
* Remove um agendamento.
*
* Soft delete.
* ==========================================================
  */
  public async softDelete(id: string | Types.ObjectId): Promise<void> {
    await Appointment.findByIdAndUpdate(id, {
      deletedAt: new Date(),
    });
  }
}

export default new AppointmentRepository();
