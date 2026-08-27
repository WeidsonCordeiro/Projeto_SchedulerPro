/**

* ==========================================================
* Arquivo: AppointmentService.ts
* ---
* Responsabilidade:
*
* Implementar as regras de negócio relacionadas
* aos agendamentos.
*
* ==========================================================
  */

import { Types } from "mongoose";

import AppointmentRepository from "../repositories/AppointmentRepository";
import AppointmentMapper from "../mappers/AppointmentMapper";

import { CreateAppointmentDto } from "../dto/CreateAppointment.dto";
import { UpdateAppointmentDto } from "../dto/UpdateAppointment.dto";

import ClientRepository from "../../Clients/repositories/ClientRepository";
import ServiceRepository from "../../services/repositories/ServiceRepository";
import UserRepository from "../../users/repositories/UserRepository";

import { AppError } from "../../../errors/AppError";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";

import { AppointmentStatus } from "../../../constants/appointment-status";

class AppointmentService {
  private readonly appointmentRepository = AppointmentRepository;
  private readonly clientRepository = ClientRepository;
  private readonly serviceRepository = ServiceRepository;
  private readonly userRepository = UserRepository;

  /**

* ==========================================================
* Cria um novo agendamento.
* ==========================================================
  */
  public async create(dto: CreateAppointmentDto, companyId: string) {
    /**

  * ---
  * Valida o cliente.
  * ---

  */
    const client = await this.clientRepository.findById(dto.clientId);

    if (!client || client.companyId.toString() !== companyId) {
      throw new AppError(HttpMessages.CLIENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (!client.isActive) {
      throw new AppError(
        "Cliente encontra-se inativo.",
        HttpStatus.BAD_REQUEST,
      );
    }

    /**
     * ----------------------------------------------------------
     * Valida o serviço.
     * ----------------------------------------------------------
     */
    const service = await this.serviceRepository.findById(dto.serviceId);

    if (!service || service.companyId.toString() !== companyId) {
      throw new AppError(HttpMessages.SERVICE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (!service.isActive) {
      throw new AppError(
        "Serviço encontra-se inativo.",
        HttpStatus.BAD_REQUEST,
      );
    }

    /**
     * ----------------------------------------------------------
     * Valida o funcionário.
     * ----------------------------------------------------------
     */
    const employee = await this.userRepository.findById(dto.employeeId);

    if (!employee || employee.companyId.toString() !== companyId) {
      throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (!employee.isActive) {
      throw new AppError(
        "Funcionário encontra-se inativo.",
        HttpStatus.BAD_REQUEST,
      );
    }

    /**
     * ----------------------------------------------------------
     * Calcula o horário de término.
     * ----------------------------------------------------------
     */
    const startAt = new Date(dto.startAt);

    const endAt = new Date(startAt.getTime() + service.duration * 60 * 1000);

    /**
     * ----------------------------------------------------------
     * Verifica conflito de horário do funcionário.
     * ----------------------------------------------------------
     */
    const hasEmployeeConflict =
      await this.appointmentRepository.hasEmployeeConflict(
        companyId,
        dto.employeeId,
        startAt,
        endAt,
      );

    if (hasEmployeeConflict) {
      throw new AppError(HttpMessages.EMPLOYEE_CONFLICT, HttpStatus.CONFLICT);
    }

    /**
     * ----------------------------------------------------------
     * Verifica conflito de horário do cliente.
     * ----------------------------------------------------------
     */
    const hasClientConflict =
      await this.appointmentRepository.hasClientConflict(
        companyId,
        dto.clientId,
        startAt,
        endAt,
      );

    if (hasClientConflict) {
      throw new AppError(HttpMessages.CLIENT_CONFLICT, HttpStatus.CONFLICT);
    }

    /**
     * ----------------------------------------------------------
     * Cria o agendamento.
     * ----------------------------------------------------------
     */
    const appointment = await this.appointmentRepository.create({
      companyId: new Types.ObjectId(companyId),
      clientId: new Types.ObjectId(dto.clientId),
      serviceId: new Types.ObjectId(dto.serviceId),
      employeeId: new Types.ObjectId(dto.employeeId),
      startAt,
      endAt,
      status: AppointmentStatus.SCHEDULED,
      notes: dto.notes ?? null,
    });

    return AppointmentMapper.toResponse(appointment);
  }

  /**

* ==========================================================
* Lista todos os agendamentos da empresa.
* ==========================================================
  */
  public async findAll(companyId: string) {
    const appointments =
      await this.appointmentRepository.findByCompanyId(companyId);

    return appointments.map(AppointmentMapper.toResponse);
  }

  /**

* ==========================================================
* Busca um agendamento pelo ID.
* ==========================================================
  */
  public async findById(id: string, companyId: string) {
    const appointment = await this.appointmentRepository.findById(id);

    if (!appointment || appointment.companyId.toString() !== companyId) {
      throw new AppError("Agendamento não encontrado.", HttpStatus.NOT_FOUND);
    }

    return AppointmentMapper.toResponse(appointment);
  }

  /**

* ==========================================================
* Atualiza um agendamento.
* ==========================================================
  */
  public async update(
    id: string,
    dto: UpdateAppointmentDto,
    companyId: string,
  ) {
    const appointment = await this.appointmentRepository.findById(id);

    if (!appointment || appointment.companyId.toString() !== companyId) {
      throw new AppError("Agendamento não encontrado.", HttpStatus.NOT_FOUND);
    }

    /**
     * ----------------------------------------------------------
     * Mantém os valores atuais quando não forem alterados.
     * ----------------------------------------------------------
     */
    let clientId = appointment.clientId;
    let serviceId = appointment.serviceId;
    let employeeId = appointment.employeeId;
    let startAt = appointment.startAt;
    let notes = appointment.notes;

    /**
     * ----------------------------------------------------------
     * Atualiza e valida o cliente.
     * ----------------------------------------------------------
     */
    if (dto.clientId) {
      const client = await this.clientRepository.findById(dto.clientId);

      if (!client || client.companyId.toString() !== companyId) {
        throw new AppError(HttpMessages.CLIENT_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      if (!client.isActive) {
        throw new AppError(
          "Cliente encontra-se inativo.",
          HttpStatus.BAD_REQUEST,
        );
      }

      clientId = new Types.ObjectId(dto.clientId);
    }

    /**
     * ----------------------------------------------------------
     * Atualiza e valida o serviço.
     * ----------------------------------------------------------
     */
    let service = await this.serviceRepository.findById(serviceId);

    if (dto.serviceId) {
      const updatedService = await this.serviceRepository.findById(
        dto.serviceId,
      );

      if (
        !updatedService ||
        updatedService.companyId.toString() !== companyId
      ) {
        throw new AppError(
          HttpMessages.SERVICE_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }

      if (!updatedService.isActive) {
        throw new AppError(
          "Serviço encontra-se inativo.",
          HttpStatus.BAD_REQUEST,
        );
      }

      service = updatedService;
      serviceId = new Types.ObjectId(dto.serviceId);
    }

    /**
     * ----------------------------------------------------------
     * Atualiza e valida o funcionário.
     * ----------------------------------------------------------
     */
    if (dto.employeeId) {
      const employee = await this.userRepository.findById(dto.employeeId);

      if (!employee || employee.companyId.toString() !== companyId) {
        throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      if (!employee.isActive) {
        throw new AppError(
          "Funcionário encontra-se inativo.",
          HttpStatus.BAD_REQUEST,
        );
      }

      employeeId = new Types.ObjectId(dto.employeeId);
    }

    /**
     * ----------------------------------------------------------
     * Atualiza a data/hora inicial.
     * ----------------------------------------------------------
     */
    if (dto.startAt) {
      startAt = new Date(dto.startAt);
    }

    /**
     * ----------------------------------------------------------
     * Atualiza observações.
     * ----------------------------------------------------------
     */
    if (dto.notes !== undefined) {
      notes = dto.notes;
    }

    /**
     * ----------------------------------------------------------
     * Recalcula endAt.
     * ----------------------------------------------------------
     */
    const endAt = new Date(startAt.getTime() + service!.duration * 60 * 1000);

    /**
     * ----------------------------------------------------------
     * Verifica conflito de horário do funcionário.
     *
     * O próprio agendamento é ignorado na verificação.
     * ----------------------------------------------------------
     */
    const hasEmployeeConflict =
      await this.appointmentRepository.hasEmployeeConflict(
        companyId,
        employeeId,
        startAt,
        endAt,
        appointment._id,
      );

    if (hasEmployeeConflict) {
      throw new AppError(HttpMessages.EMPLOYEE_CONFLICT, HttpStatus.CONFLICT);
    }

    /**
     * ----------------------------------------------------------
     * Verifica conflito de horário do cliente.
     *
     * O próprio agendamento é ignorado na verificação.
     * ----------------------------------------------------------
     */
    const hasClientConflict =
      await this.appointmentRepository.hasClientConflict(
        companyId,
        clientId,
        startAt,
        endAt,
        appointment._id,
      );

    if (hasClientConflict) {
      throw new AppError(HttpMessages.CLIENT_CONFLICT, HttpStatus.CONFLICT);
    }

    /**
     * ----------------------------------------------------------
     * Atualiza o agendamento.
     * ----------------------------------------------------------
     */
    const updatedAppointment = await this.appointmentRepository.update(id, {
      clientId,
      serviceId,
      employeeId,
      startAt,
      endAt,
      notes,
    });

    return AppointmentMapper.toResponse(updatedAppointment!);
  }

  /**
   * ==========================================================
   * Atualiza o status de um agendamento.
   *
   * Valida se o agendamento pertence à empresa e se
   * a transição de status é permitida.
   * ==========================================================
   */
  private async changeStatus(
    id: string,
    companyId: string,
    allowedCurrentStatuses: AppointmentStatus[],
    newStatus: AppointmentStatus,
  ) {
    const appointment = await this.appointmentRepository.findById(id);

    if (!appointment || appointment.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.APPOINTMENT_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!allowedCurrentStatuses.includes(appointment.status)) {
      throw new AppError(
        HttpMessages.STATUS_TRANSITION_NOT_ALLOWED,
        HttpStatus.BAD_REQUEST,
      );
    }

    const updatedAppointment = await this.appointmentRepository.updateStatus(
      id,
      newStatus,
    );

    if (!updatedAppointment) {
      throw new AppError(
        HttpMessages.STATUS_UPDATE_FAILED,
        HttpStatus.BAD_REQUEST,
      );
    }

    return AppointmentMapper.toResponse(updatedAppointment);
  }

  /**
   * ==========================================================
   * Confirma um agendamento.
   * ==========================================================
   */
  public async confirm(id: string, companyId: string) {
    return this.changeStatus(
      id,
      companyId,
      [AppointmentStatus.SCHEDULED],
      AppointmentStatus.CONFIRMED,
    );
  }

  /**
   * ==========================================================
   * Conclui um agendamento.
   * ==========================================================
   */
  public async complete(id: string, companyId: string) {
    return this.changeStatus(
      id,
      companyId,
      [AppointmentStatus.CONFIRMED],
      AppointmentStatus.COMPLETED,
    );
  }

  /**
   * ==========================================================
   * Cancela um agendamento.
   * ==========================================================
   */
  public async cancel(id: string, companyId: string) {
    return this.changeStatus(
      id,
      companyId,
      [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      AppointmentStatus.CANCELLED,
    );
  }

  /**
   * ==========================================================
   * Marca um agendamento como não comparecido.
   * ==========================================================
   */
  public async markAsNoShow(id: string, companyId: string) {
    return this.changeStatus(
      id,
      companyId,
      [AppointmentStatus.CONFIRMED],
      AppointmentStatus.NO_SHOW,
    );
  }

  /**

* ==========================================================
* Remove um agendamento.
*
* Soft delete.
* ==========================================================
  */
  public async delete(id: string, companyId: string): Promise<void> {
    const appointment = await this.appointmentRepository.findById(id);

    if (!appointment || appointment.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.APPOINTMENT_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.appointmentRepository.softDelete(id);
  }
}

export default new AppointmentService();
