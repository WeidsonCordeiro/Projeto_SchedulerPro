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
import PublicAppointmentMapper from "../mappers/PublicAppointmentMapper";

import { CreateAppointmentDto } from "../dto/CreateAppointment.dto";
import { UpdateAppointmentDto } from "../dto/UpdateAppointment.dto";
import { CreatePublicAppointmentDto } from "../dto/CreatePublicAppointment.dto";

import ClientRepository from "../../Clients/repositories/ClientRepository";
import { ClientDocument } from "../../Clients/models/Client.model";
import ServiceRepository from "../../services/repositories/ServiceRepository";
import UserRepository from "../../users/repositories/UserRepository";
import CompanyRepository from "../../companies/repositories/CompanyRepository";

import { AppError } from "../../../errors/AppError";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import Logger from "../../../providers/logger/Logger";

import { AppointmentStatus } from "../../../constants/appointment-status";
import { Role } from "../../../constants/roles";
import AvailabilityService from "../../availability/services/AvailabilityService";
import NotificationDispatcher from "../../notifications/services/NotificationDispatcher";
import { NotificationType } from "../../notifications";
import { AppointmentDocument } from "../models/Appointment.model";

/**
 * Janela opcional de consulta por período. Repassada ao repositório para
 * filtrar agendamentos que se sobrepõem à janela.
 */
export interface AppointmentListFilter {
  startAt?: Date;
  endAt?: Date;
}

/**
 * ==========================================================
 * Dados já validados, prontos a persistir.
 *
 * Reúne as regras comuns à criação administrativa e à criação
 * pública: cálculo de `endAt`, regra de passado, disponibilidade
 * (e exceções), conflito de funcionário e de cliente, status
 * inicial e notificações.
 *
 * `endAt` NUNCA entra aqui: é sempre derivado de
 * `durationMinutes`, que por sua vez vem do `Service`.
 *
 * `resolveClientId` é uma função (e não um id) para que o
 * cliente público só seja criado depois de as regras de agenda
 * terem passado — um pedido rejeitado não pode deixar um
 * cadastro de cliente órfão na base de dados.
 * ==========================================================
 */
interface ScheduleAppointmentInput {
  companyId: string;
  resolveClientId: () => Types.ObjectId | Promise<Types.ObjectId>;
  serviceId: Types.ObjectId;
  employeeId: Types.ObjectId;
  durationMinutes: number;
  startAt: Date;
  notes?: string | null;
  now: Date;
}

class AppointmentService {
  private readonly appointmentRepository = AppointmentRepository;
  private readonly clientRepository = ClientRepository;
  private readonly serviceRepository = ServiceRepository;
  private readonly userRepository = UserRepository;
  private readonly companyRepository = CompanyRepository;

  /**
   * ==========================================================
   * Exige um cliente existente, da empresa e ativo.
   * ==========================================================
   */
  private async requireActiveClient(clientId: string, companyId: string) {
    const client = await this.clientRepository.findById(clientId);

    if (!client || client.companyId.toString() !== companyId) {
      throw new AppError(HttpMessages.CLIENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (!client.isActive) {
      throw new AppError(
        "Cliente encontra-se inativo.",
        HttpStatus.BAD_REQUEST,
      );
    }

    return client;
  }

  /**
   * ==========================================================
   * Exige um serviço existente, da empresa e ativo.
   * ==========================================================
   */
  private async requireActiveService(serviceId: string, companyId: string) {
    const service = await this.serviceRepository.findById(serviceId);

    if (!service || service.companyId.toString() !== companyId) {
      throw new AppError(HttpMessages.SERVICE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (!service.isActive) {
      throw new AppError(
        "Serviço encontra-se inativo.",
        HttpStatus.BAD_REQUEST,
      );
    }

    return service;
  }

  /**
   * ==========================================================
   * Exige um funcionário existente, da empresa e ativo.
   * ==========================================================
   */
  private async requireActiveEmployee(
    employeeId: string,
    companyId: string,
  ) {
    const employee = await this.userRepository.findById(employeeId);

    if (!employee || employee.companyId.toString() !== companyId) {
      throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (!employee.isActive) {
      throw new AppError(
        "Funcionário encontra-se inativo.",
        HttpStatus.BAD_REQUEST,
      );
    }

    return employee;
  }

  /**
   * ==========================================================
   * Aplica TODAS as regras de agenda e persiste o agendamento.
   *
   * Único caminho de escrita da criação: o fluxo administrativo e
   * o fluxo público partilham exatamente estas regras — passado,
   * disponibilidade semanal, exceções (férias/bloqueios),
   * conflito de funcionário, conflito de cliente, status inicial
   * e notificações.
   * ==========================================================
   */
  private async schedule(input: ScheduleAppointmentInput) {
    const {
      companyId,
      resolveClientId,
      serviceId,
      employeeId,
      durationMinutes,
      startAt,
      notes,
      now,
    } = input;

    /**
     * ----------------------------------------------------------
     * Calcula o horário de término a partir do serviço.
     * ----------------------------------------------------------
     */
    const endAt = new Date(
      startAt.getTime() + durationMinutes * 60 * 1000,
    );

    /**
     * ----------------------------------------------------------
     * Não permite criar agendamentos no passado.
     * ----------------------------------------------------------
     */
    if (startAt.getTime() <= now.getTime()) {
      throw new AppError(
        HttpMessages.APPOINTMENT_START_IN_PAST,
        HttpStatus.BAD_REQUEST,
      );
    }

    await AvailabilityService.ensureEmployeeAvailable(
      companyId,
      employeeId,
      startAt,
      endAt,
    );

    /**
     * ----------------------------------------------------------
     * Verifica conflito de horário do funcionário.
     * ----------------------------------------------------------
     */
    const hasEmployeeConflict =
      await this.appointmentRepository.hasEmployeeConflict(
        companyId,
        employeeId,
        startAt,
        endAt,
      );

    if (hasEmployeeConflict) {
      throw new AppError(HttpMessages.EMPLOYEE_CONFLICT, HttpStatus.CONFLICT);
    }

    /**
     * ----------------------------------------------------------
     * Resolve o cliente.
     *
     * Só agora, depois de as regras de agenda terem passado: no
     * fluxo público esta chamada pode criar o cadastro do cliente
     * e um pedido rejeitado não pode deixar um órfão na base de
     * dados.
     * ----------------------------------------------------------
     */
    const clientId = await resolveClientId();

    /**
     * ----------------------------------------------------------
     * Verifica conflito de horário do cliente.
     * ----------------------------------------------------------
     */
    const hasClientConflict =
      await this.appointmentRepository.hasClientConflict(
        companyId,
        clientId,
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
      clientId,
      serviceId,
      employeeId,
      startAt,
      endAt,
      status: AppointmentStatus.SCHEDULED,
      notes: notes ?? null,
    });

    await this.dispatchAppointmentNotification(
      appointment,
      NotificationType.APPOINTMENT_CREATED,
    );

    return appointment;
  }

  /**
   * ==========================================================
   * Dispara as notificações de um evento de agendamento.
   *
   * As notificações (e-mail ao cliente + notificações internas)
   * são "best effort": falhas são registadas e NUNCA alteram o
   * resultado do agendamento já persistido.
   * ==========================================================
   */
  private async dispatchAppointmentNotification(
    appointment: AppointmentDocument,
    type: NotificationType,
  ): Promise<void> {
    try {
      await NotificationDispatcher.dispatchAppointmentEvent({
        companyId: appointment.companyId.toString(),
        appointmentId: appointment._id.toString(),
        type,
        clientId: appointment.clientId.toString(),
        serviceId: appointment.serviceId.toString(),
        employeeId: appointment.employeeId.toString(),
        startAt: appointment.startAt,
        notes: appointment.notes,
      });
    } catch (error) {
      Logger.error("Falha ao disparar notificações de agendamento", {
        appointmentId: appointment._id.toString(),
        companyId: appointment.companyId.toString(),
        type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**

* ==========================================================
* Cria um novo agendamento.
* ==========================================================
  */
  public async create(
    dto: CreateAppointmentDto,
    companyId: string,
    now: Date = new Date(),
  ) {
    /**
   * ---
   * Valida o cliente.
   * ---
   */
    await this.requireActiveClient(dto.clientId, companyId);

    /**
     * ----------------------------------------------------------
     * Valida o serviço.
     * ----------------------------------------------------------
     */
    const service = await this.requireActiveService(dto.serviceId, companyId);

    /**
     * ----------------------------------------------------------
     * Valida o funcionário.
     * ----------------------------------------------------------
     */
    await this.requireActiveEmployee(dto.employeeId, companyId);

    const appointment = await this.schedule({
      companyId,
      resolveClientId: () => new Types.ObjectId(dto.clientId),
      serviceId: new Types.ObjectId(dto.serviceId),
      employeeId: new Types.ObjectId(dto.employeeId),
      durationMinutes: service.duration,
      startAt: new Date(dto.startAt),
      notes: dto.notes ?? null,
      now,
    });

    return AppointmentMapper.toResponse(appointment);
  }

  /**
   * ==========================================================
   * Resolve o `Client` de um agendamento público.
   *
   * Se já existir um cliente com o mesmo e-mail NA MESMA empresa,
   * ele é reutilizado — o que evita duplicar o cadastro a cada
   * agendamento e faz a regra de conflito de cliente valer para
   * quem agenda repetidamente.
   *
   * Um cliente desativado pela empresa bloqueia o agendamento: um
   * link público não pode contornar um bloqueio existente.
   *
   * O e-mail NÃO é verificado contra a coleção `User`. O pedido
   * não cria conta de acesso e recusar o agendamento por existir
   * uma conta com o mesmo e-mail noutra empresa revelaria
   * informação de outro tenant.
   * ==========================================================
   */
  private async resolvePublicClient(
    companyId: string,
    email: string,
    name: string,
    phone: string | null,
  ): Promise<ClientDocument> {
    const existing = await this.clientRepository.findByEmailAndCompany(
      email,
      companyId,
    );

    if (existing) {
      if (!existing.isActive) {
        throw new AppError(
          "Cliente encontra-se inativo.",
          HttpStatus.BAD_REQUEST,
        );
      }

      return existing;
    }

    return this.clientRepository.create({
      companyId: new Types.ObjectId(companyId),
      name,
      email,
      phone,
    });
  }

  /**
   * ==========================================================
   * Cria um agendamento a partir do link público da empresa.
   *
   * O `companyId` vem EXCLUSIVAMENTE da URL
   * (`/api/public/companies/:companyId/appointments`), nunca do
   * corpo do pedido. Serviço, profissional, duração, término,
   * status e cliente são determinados pelo backend.
   *
   * Nenhum `User` é criado: o agendamento fica associado a um
   * `Client`, reutilizando o cadastro existente na empresa quando
   * o e-mail já existe.
   * ==========================================================
   */
  public async createPublic(
    dto: CreatePublicAppointmentDto,
    companyId: string,
    now: Date = new Date(),
  ) {
    /**
     * ----------------------------------------------------------
     * Valida a empresa (tenant do link público).
     *
     * Empresa eliminada devolve 404 porque o repositório já
     * filtra `deletedAt`; empresa inativa devolve 400 porque
     * existe mas não aceita agendamentos.
     * ----------------------------------------------------------
     */
    const company = await this.companyRepository.findById(companyId);

    if (!company) {
      throw new AppError(
        HttpMessages.COMPANY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!company.isActive) {
      throw new AppError(
        HttpMessages.COMPANY_INACTIVE,
        HttpStatus.BAD_REQUEST,
      );
    }

    /**
     * ----------------------------------------------------------
     * Valida serviço e profissional contra o MESMO tenant.
     * ----------------------------------------------------------
     */
    const service = await this.requireActiveService(dto.serviceId, companyId);

    const employee = await this.requireActiveEmployee(
      dto.employeeId,
      companyId,
    );

    /**
     * Uma conta de acesso (role CLIENT) não é profissional:
     * o link público nunca agenda para ela. 404 para não revelar
     * a existência da conta.
     */
    if (employee.role === Role.CLIENT) {
      throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    /**
     * ----------------------------------------------------------
     * Resolve o cliente público.
     * ----------------------------------------------------------
     */
    const clientName = dto.clientName.trim();
    const clientEmail = dto.clientEmail.trim().toLowerCase();
    const clientPhone = dto.clientPhone?.trim() || null;

    /**
     * ----------------------------------------------------------
     * Regras de agenda idênticas ao fluxo administrativo.
     *
     * O cliente só é criado dentro de `resolveClientId`, ou seja,
     * depois de passado, disponibilidade e conflito de funcionário
     * terem sido aceites.
     * ----------------------------------------------------------
     */
    const appointment = await this.schedule({
      companyId,
      resolveClientId: async () =>
        (
          await this.resolvePublicClient(
            companyId,
            clientEmail,
            clientName,
            clientPhone,
          )
        )._id,
      serviceId: service._id,
      employeeId: employee._id,
      durationMinutes: service.duration,
      startAt: new Date(dto.startAt),
      notes: dto.notes?.trim() || null,
      now,
    });

    return PublicAppointmentMapper.toResponse(appointment, {
      clientName,
      service: { id: service._id.toString(), name: service.name },
      employee: { id: employee._id.toString(), name: employee.name },
    });
  }

  /**

* ==========================================================
* Lista todos os agendamentos da empresa.
* ==========================================================
  */
  public async findAll(
    companyId: string,
    filter: AppointmentListFilter = {},
    clientScope?: string,
    now: Date = new Date(),
  ) {
    /**
     * ----------------------------------------------------------
     * Agendamento "scheduled" cujo início já passou é
     * automaticamente cancelado antes da consulta.
     *
     * A expiração é global da empresa e não é disparada em
     * consultas escopadas a um cliente (portal).
     * ----------------------------------------------------------
     */
    if (!clientScope) {
      await this.expireOverdueScheduled(companyId, now);
    }

    const appointments =
      await this.appointmentRepository.findByCompanyId(
        companyId,
        filter,
        clientScope,
      );

    return appointments.map(AppointmentMapper.toResponse);
  }

  /**
   * ==========================================================
   * Cancela agendamentos com status "scheduled" e início no
   * passado.
   *
   * Apenas o status "scheduled" é afetado; os demais
   * permanecem inalterados.
   * ==========================================================
   */
  public async expireOverdueScheduled(
    companyId: string,
    now: Date = new Date(),
  ): Promise<number> {
    return this.appointmentRepository.cancelOverdueScheduled(companyId, now);
  }

  /**

* ==========================================================
* Busca um agendamento pelo ID.
* ==========================================================
  */
  public async findById(id: string, companyId: string, clientScope?: string) {
    const appointment = await this.appointmentRepository.findById(id);

    if (!appointment || appointment.companyId.toString() !== companyId) {
      throw new AppError("Agendamento não encontrado.", HttpStatus.NOT_FOUND);
    }

    if (clientScope && appointment.clientId.toString() !== clientScope) {
      throw new AppError("Agendamento não encontrado.", HttpStatus.NOT_FOUND);
    }

    return AppointmentMapper.toResponse(appointment);
  }

  /**
   * ==========================================================
   * Lista os agendamentos do cliente autenticado no portal.
   *
   * Apenas o vínculo da sessão (clientId) é aceite e a
   * consulta é sempre restrita à empresa da sessão. Os nomes
   * do serviço e do funcionário são anexados para exibição,
   * já que o portal não consulta esses recursos diretamente.
   * ==========================================================
   */
  public async findMine(
    clientId: string,
    companyId: string,
    filter: AppointmentListFilter = {},
  ) {
    const appointments =
      await this.appointmentRepository.findByCompanyId(
        companyId,
        filter,
        clientId,
      );

    return Promise.all(
      appointments.map(async (appointment) => {
        const service = appointment.serviceId
          ? await this.serviceRepository.findById(appointment.serviceId)
          : null;
        const employee = appointment.employeeId
          ? await this.userRepository.findById(appointment.employeeId)
          : null;

        return {
          ...AppointmentMapper.toResponse(appointment),
          serviceName: service?.name ?? null,
          employeeName: employee?.name ?? null,
        };
      }),
    );
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
    now: Date = new Date(),
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
      await this.requireActiveClient(dto.clientId, companyId);

      clientId = new Types.ObjectId(dto.clientId);
    }

    /**
     * ----------------------------------------------------------
     * Atualiza e valida o serviço.
     * ----------------------------------------------------------
     */
    let service = await this.serviceRepository.findById(serviceId);

    if (dto.serviceId) {
      service = await this.requireActiveService(dto.serviceId, companyId);

      serviceId = new Types.ObjectId(dto.serviceId);
    }

    /**
     * ----------------------------------------------------------
     * Atualiza e valida o funcionário.
     * ----------------------------------------------------------
     */
    if (dto.employeeId) {
      await this.requireActiveEmployee(dto.employeeId, companyId);

      employeeId = new Types.ObjectId(dto.employeeId);
    }

    /**
     * ----------------------------------------------------------
     * Atualiza a data/hora inicial.
     * ----------------------------------------------------------
     */
    if (dto.startAt) {
      startAt = new Date(dto.startAt);

      /**
       * ----------------------------------------------------------
       * Não permite mover um agendamento para o passado.
       * ----------------------------------------------------------
       */
      if (startAt.getTime() <= now.getTime()) {
        throw new AppError(
          HttpMessages.APPOINTMENT_START_IN_PAST,
          HttpStatus.BAD_REQUEST,
        );
      }
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

    await AvailabilityService.ensureEmployeeAvailable(companyId, employeeId, startAt, endAt);

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

    await this.dispatchAppointmentNotification(
      updatedAppointment!,
      NotificationType.APPOINTMENT_UPDATED,
    );

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

    if (newStatus === AppointmentStatus.CANCELLED) {
      await this.dispatchAppointmentNotification(
        updatedAppointment,
        NotificationType.APPOINTMENT_CANCELLED,
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