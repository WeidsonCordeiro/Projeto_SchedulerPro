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
import { UpdatePublicAppointmentDto } from "../dto/UpdatePublicAppointment.dto";
import {
  CreatePublicAppointmentResult,
  PublicAppointmentResult,
} from "../index";

import ClientRepository from "../../Clients/repositories/ClientRepository";
import { ClientDocument } from "../../Clients/models/Client.model";
import ServiceRepository from "../../services/repositories/ServiceRepository";
import UserRepository from "../../users/repositories/UserRepository";

import { AppError } from "../../../errors/AppError";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import Logger from "../../../providers/logger/Logger";

import { AppointmentStatus } from "../../../constants/appointment-status";
import AvailabilityService from "../../availability/services/AvailabilityService";
import PublicBookingEligibility from "../../public-booking/services/PublicBookingEligibility";
import NotificationDispatcher from "../../notifications/services/NotificationDispatcher";
import PublicAppointmentTokenProvider from "../../../providers/security/PublicAppointmentTokenProvider";
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
  /**
   * Hash do token público.
   *
   * Só é enviado na criação pública e é gravado na MESMA escrita
   * do agendamento: ou os dois existem, ou nenhum. Com uma segunda
   * escrita, um agendamento podia ficar sem token (link
   * inacessível) ou com um token que o cliente nunca recebeu.
   */
  publicAccessTokenHash?: string;
  /**
   * Token público PURO, apenas para compor o link do e-mail.
   *
   * É o valor que o cliente recebeu e nunca é persistido: a
   * base de dados guarda só `publicAccessTokenHash`. Vive nesta
   * chamada, no máximo, durante o envio do e-mail.
   *
   * É opcional e só é enviado na criação pública. Sem ele, o
   * e-mail de confirmação é enviado sem link de gestão.
   */
  publicManageToken?: string;
}

class AppointmentService {
  private readonly appointmentRepository = AppointmentRepository;
  private readonly clientRepository = ClientRepository;
  private readonly serviceRepository = ServiceRepository;
  private readonly userRepository = UserRepository;
  private readonly publicTokenProvider = PublicAppointmentTokenProvider;

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
   * Regras de agenda partilhadas.
   *
   * A criação (`schedule`), a alteração administrativa (`update`)
   * e a alteração pelo link público (`updatePublicByToken`) têm
   * de recusar EXATAMENTE o mesmo conjunto de horários. Por isso
   * as regras vivem aqui e não são reescritas em cada fluxo: uma
   * exceção de disponibilidade ou um conflito de funcionário têm
   * de devolver a mesma mensagem e o mesmo status em qualquer
   * porta de entrada.
   * ==========================================================
   */

  /**
   * Verifica se o slot do funcionário é agendável.
   *
   * Cobre a disponibilidade semanal e as exceções (férias,
   * bloqueios) através de `AvailabilityService`, e o conflito com
   * outro agendamento ativo.
   */
  private async ensureSlotIsAvailable(input: {
    companyId: string;
    employeeId: Types.ObjectId;
    startAt: Date;
    endAt: Date;
    excludeAppointmentId?: Types.ObjectId;
  }): Promise<void> {
    await AvailabilityService.ensureEmployeeAvailable(
      input.companyId,
      input.employeeId,
      input.startAt,
      input.endAt,
    );

    const hasEmployeeConflict =
      await this.appointmentRepository.hasEmployeeConflict(
        input.companyId,
        input.employeeId,
        input.startAt,
        input.endAt,
        input.excludeAppointmentId,
      );

    if (hasEmployeeConflict) {
      throw new AppError(HttpMessages.EMPLOYEE_CONFLICT, HttpStatus.CONFLICT);
    }
  }

  /**
   * Verifica se o cliente já tem um agendamento sobreposto.
   *
   * `excludeAppointmentId` faz o próprio agendamento ser
   * ignorado — é o que permite a um cliente remarcar.
   */
  private async ensureClientHasNoConflict(input: {
    companyId: string;
    clientId: Types.ObjectId;
    startAt: Date;
    endAt: Date;
    excludeAppointmentId?: Types.ObjectId;
  }): Promise<void> {
    const hasClientConflict =
      await this.appointmentRepository.hasClientConflict(
        input.companyId,
        input.clientId,
        input.startAt,
        input.endAt,
        input.excludeAppointmentId,
      );

    if (hasClientConflict) {
      throw new AppError(HttpMessages.CLIENT_CONFLICT, HttpStatus.CONFLICT);
    }
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
      publicAccessTokenHash,
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

    await this.ensureSlotIsAvailable({
      companyId,
      employeeId,
      startAt,
      endAt,
    });

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
    await this.ensureClientHasNoConflict({
      companyId,
      clientId,
      startAt,
      endAt,
    });

    /**
     * ----------------------------------------------------------
     * Cria o agendamento.
     *
     * O hash do token público entra na MESMA escrita (só na
     * criação pública). É o que garante que um agendamento
     * acessível por link e o respetivo hash existem sempre em
     * conjunto, sem uma segunda escrita que possa falhar.
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
      ...(publicAccessTokenHash
        ? { publicAccessTokenHash }
        : { publicAccessTokenHash: null }),
    });

    await this.dispatchAppointmentNotification(
      appointment,
      NotificationType.APPOINTMENT_CREATED,
      input.publicManageToken,
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
   *
   * `publicManageToken` é o token puro, disponível apenas nos
   * fluxos que o possuem em memória. Nunca é registado: nem no
   * `meta` de sucesso, nem no de erro.
   * ==========================================================
   */
  private async dispatchAppointmentNotification(
    appointment: AppointmentDocument,
    type: NotificationType,
    publicManageToken?: string,
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
        ...(publicManageToken
          ? { publicAccessToken: publicManageToken }
          : {}),
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
    const service = await PublicBookingEligibility.requireActiveService(dto.serviceId, companyId);

    /**
     * ----------------------------------------------------------
     * Valida o funcionário.
     * ----------------------------------------------------------
     */
    await PublicBookingEligibility.requireActiveEmployee(dto.employeeId, companyId);

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
    await PublicBookingEligibility.requireActiveCompany(companyId);

    /**
     * ----------------------------------------------------------
     * Valida serviço e profissional contra o MESMO tenant.
     *
     * `requireBookableEmployee` exclui a conta de acesso
     * (role CLIENT): o link público nunca agenda para ela.
     * ----------------------------------------------------------
     */
    const service = await PublicBookingEligibility.requireActiveService(
      dto.serviceId,
      companyId,
    );

    const employee = await PublicBookingEligibility.requireBookableEmployee(
      dto.employeeId,
      companyId,
    );

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
     * Gera o token público ANTES da persistência.
     *
     * Se `schedule()` falhar, o token é descartado sem nunca
     * ter existido do lado do cliente: a resposta de erro não
     * transporta nenhuma credencial. O valor puro só regressa
     * ao servidor se o agendamento for efetivamente criado.
     *
     * A empresa e o cliente não entram no token: é aleatório,
     * o que impede adivinhar tokens de outras empresas a
     * partir de um token conhecido.
     * ----------------------------------------------------------
     */
    const publicAccessToken = this.publicTokenProvider.generate();

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
      /**
       * Só o HASH entra na base de dados, na mesma escrita do
       * agendamento. O token puro existe apenas nesta resposta —
       * é a única cópia que alguma vez sai do servidor.
       */
      publicAccessTokenHash: this.publicTokenProvider.hash(
        publicAccessToken,
      ),
      /**
       * O token PURO segue apenas para a composição do link do
       * e-mail. Não entra em nenhuma escrita: a base de dados
       * recebe só o hash, acima.
       */
      publicManageToken: publicAccessToken,
    });

    return {
      appointment: PublicAppointmentMapper.toResponse(appointment, {
        clientName,
        service: { id: service._id.toString(), name: service.name },
        employee: {
          id: employee._id.toString(),
          name: employee.name,
          avatarUrl: employee.avatar?.url ?? null,
        },
      }),
      publicAccessToken,
    } satisfies CreatePublicAppointmentResult;
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
      service = await PublicBookingEligibility.requireActiveService(dto.serviceId, companyId);

      serviceId = new Types.ObjectId(dto.serviceId);
    }

    /**
     * ----------------------------------------------------------
     * Atualiza e valida o funcionário.
     * ----------------------------------------------------------
     */
    if (dto.employeeId) {
      await PublicBookingEligibility.requireActiveEmployee(dto.employeeId, companyId);

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

    await this.ensureSlotIsAvailable({
      companyId,
      employeeId,
      startAt,
      endAt,
      excludeAppointmentId: appointment._id,
    });

    /**
     * ----------------------------------------------------------
     * Verifica conflito de horário do cliente.
     *
     * O próprio agendamento é ignorado na verificação.
     * ----------------------------------------------------------
     */
    await this.ensureClientHasNoConflict({
      companyId,
      clientId,
      startAt,
      endAt,
      excludeAppointmentId: appointment._id,
    });

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
   * Resolve um agendamento através do token público.
   *
   * O token é a credencial. NÃO são aceites `_id`, `clientId`
   * nem e-mail como alternativa.
   *
   * Todas as falhas devolvem o MESMO `404` com a MESMA
   * mensagem: token malformado, token inexistente e
   * agendamento eliminado soft são indistinguíveis para quem
   * chama. Sem isso, a rota confirmaria a existência de um
   * agendamento a quem está a adivinhar tokens.
   * ==========================================================
   */
  private async resolveByPublicToken(token: unknown) {
    if (!this.publicTokenProvider.hasValidFormat(token)) {
      throw this.publicAppointmentNotFound();
    }

    const hash = this.publicTokenProvider.hash(token);

    const appointment =
      await this.appointmentRepository.findByPublicAccessTokenHash(hash);

    if (!appointment) {
      throw this.publicAppointmentNotFound();
    }

    /**
     * Registado apenas como prefixo do hash: identifica o link
     * em caso de diagnóstico sem que o registo seja ele próprio
     * uma credencial.
     */
    Logger.info("Acesso público a agendamento", {
      appointmentId: appointment._id.toString(),
      tokenHint: this.publicTokenProvider.toDiagnosticHint(hash),
    });

    return appointment;
  }

  /**
   * ==========================================================
   * Token puro para compor o link de gestão do e-mail, ou
   * `undefined` se não for utilizável.
   *
   * Só é chamado DEPOIS de `resolveByPublicToken` ter devolvido um
   * agendamento, o que implica que o token passou
   * `hasValidFormat`. A guarda repete o FORMATO (43 caracteres
   * base64url), não o segredo: serve para narrowing de `unknown`
   * para `string` e para deixar o invariante explícito no ponto
   * onde o link é montado.
   *
   * Se um dia a resolução passar a aceitar outro formato, o
   * e-mail é enviado SEM link em vez de receber um link inválido.
   * ==========================================================
   */
  private publicManageToken(token: unknown): string | undefined {
    return this.publicTokenProvider.hasValidFormat(token) ? token : undefined;
  }

  /**
   * ==========================================================
   * Erro único para qualquer falha de token.
   * ==========================================================
   */
  private publicAppointmentNotFound() {
    return new AppError(
      HttpMessages.PUBLIC_APPOINTMENT_NOT_FOUND,
      HttpStatus.NOT_FOUND,
    );
  }

  /**
   * ==========================================================
   * Monta a resposta pública a partir do agendamento.
   *
   * Vai buscar `Client`, `Service` e `User` porque, ao contrário
   * da criação, aqui não existe documento já validado à mão.
   *
   * O `publicAccessTokenHash` nunca entra na resposta: o
   * mapper público não o conhece.
   * ==========================================================
   */
  private async toPublicResult(
    appointment: AppointmentDocument,
  ): Promise<PublicAppointmentResult> {
    const [client, service, employee] = await Promise.all([
      this.clientRepository.findById(appointment.clientId),
      this.serviceRepository.findById(appointment.serviceId),
      this.userRepository.findById(appointment.employeeId),
    ]);

    return PublicAppointmentMapper.toResponse(appointment, {
      clientName: client?.name ?? "",
      service: {
        id: appointment.serviceId.toString(),
        name: service?.name ?? "",
      },
      employee: {
        id: appointment.employeeId.toString(),
        name: employee?.name ?? "",
        /**
         * Apenas a URL: o `publicId` do storage nunca sai do
         * backend.
         */
        avatarUrl: employee?.avatar?.url ?? null,
      },
    });
  }

  /**
   * ==========================================================
   * Regra de estado para o link público.
   *
   * Um agendamento é modificável apenas enquanto está ativo e
   * ainda vai acontecer:
   *
   * • `cancelled`, `completed` e `no-show` são estados finais.
   *   Alterar ou cancelar de novo não é permitido e, em caso
   *   algum, reativar.
   * • Um agendamento já iniciado (ou no passado) é histórico:
   *   o frontend e o backoffice mostram-no, mas já não é
   *   alterável. Esta é a regra de "histórico é somente
   *   leitura" do SchedulerPro, aplicada sem criar um caminho
   *   alternativo.
   * ==========================================================
   */
  private assertPublicAppointmentIsEditable(
    appointment: AppointmentDocument,
    now: Date,
  ): void {
    const editableStatuses = [
      AppointmentStatus.SCHEDULED,
      AppointmentStatus.CONFIRMED,
    ];

    if (!editableStatuses.includes(appointment.status)) {
      throw new AppError(
        HttpMessages.PUBLIC_APPOINTMENT_NOT_EDITABLE,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (appointment.startAt.getTime() <= now.getTime()) {
      throw new AppError(
        HttpMessages.PUBLIC_APPOINTMENT_NOT_EDITABLE,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * ==========================================================
   * Consulta o agendamento através do link público.
   *
   * Um agendamento cancelado, concluído ou no passado continua
   * a ser consultável: quem recebeu o link precisa de ver o
   * que aconteceu. É apenas a escrita que é bloqueada.
   * ==========================================================
   */
  public async findPublicByToken(token: unknown) {
    const appointment = await this.resolveByPublicToken(token);

    return this.toPublicResult(appointment);
  }

  /**
   * ==========================================================
   * Altera o agendamento através do link público.
   *
   * Reutiliza as MESMAS regras do fluxo administrativo:
   * serviço e profissional validados contra a empresa do
   * agendamento, `endAt` recalculado a partir da duração,
   * `startAt` no futuro, disponibilidade (e exceções) e
   * conflitos de funcionário e de cliente — sempre
   * excluindo o próprio agendamento da verificação.
   *
   * O que NÃO é alterável aqui, e porquê:
   *
   * • `clientId` — o cliente é o titular do agendamento e não
   *   é substituível por quem tem o link.
   * • dados pessoais (`clientName`, `clientEmail`,
   *   `clientPhone`) — o `Client` é um cadastro partilhado
   *   pela empresa, potencialmente com outros agendamentos e
   *   conta associada. Um link público não pode reescrever a
   *   identidade de um cliente que a empresa gere.
   * • `status`, `endAt`, `duration`, `price`,
   *   `publicAccessTokenHash` — sempre do servidor.
   *
   * O token não é regenerado: o link já entregue continua
   * válido depois da alteração.
   * ==========================================================
   */
  public async updatePublicByToken(
    token: unknown,
    dto: UpdatePublicAppointmentDto,
    now: Date = new Date(),
  ) {
    const appointment = await this.resolveByPublicToken(token);

    this.assertPublicAppointmentIsEditable(appointment, now);

    const companyId = appointment.companyId.toString();

    /**
     * ----------------------------------------------------------
     * Serviço: recalcula a duração (e portanto o `endAt`).
     *
     * O serviço EFETIVO é sempre revalidado, mesmo que o cliente
     * não o tenha enviado: um serviço entretanto desativado ou
     * removido tem de invalidar a alteração, caso contrário o
     * agendamento ficaria preso a um serviço que já não existe.
     * ----------------------------------------------------------
     */
    const service = dto.serviceId
      ? await PublicBookingEligibility.requireActiveService(dto.serviceId, companyId)
      : await PublicBookingEligibility.requireActiveService(
          appointment.serviceId.toString(),
          companyId,
        );

    const serviceId = dto.serviceId
      ? new Types.ObjectId(dto.serviceId)
      : appointment.serviceId;

    /**
     * ----------------------------------------------------------
     * Profissional: mesma empresa, ativo e nunca um `CLIENT`.
     *
     * Igual ao serviço, o profissional efetivo é sempre
     * revalidado.
     * ----------------------------------------------------------
     */
    const effectiveEmployeeId = dto.employeeId ?? appointment.employeeId.toString();

    await PublicBookingEligibility.requireBookableEmployee(
      effectiveEmployeeId,
      companyId,
    );

    const employeeId = new Types.ObjectId(effectiveEmployeeId);

    /**
     * ----------------------------------------------------------
     * Data/hora: sempre futura.
     * ----------------------------------------------------------
     */
    let startAt = appointment.startAt;

    if (dto.startAt) {
      startAt = new Date(dto.startAt);

      if (startAt.getTime() <= now.getTime()) {
        throw new AppError(
          HttpMessages.APPOINTMENT_START_IN_PAST,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const notes = dto.notes === undefined ? appointment.notes : dto.notes;

    /**
     * ----------------------------------------------------------
     * `endAt` é SEMPRE recalculado a partir da duração do
     * serviço. Nunca vem do cliente.
     * ----------------------------------------------------------
     */
    const endAt = new Date(
      startAt.getTime() + service.duration * 60 * 1000,
    );

    /**
     * ----------------------------------------------------------
     * Mesmas regras de agenda da criação e da alteração
     * administrativa, excluindo o próprio agendamento da
     * verificação de conflitos.
     * ----------------------------------------------------------
     */
    await this.ensureSlotIsAvailable({
      companyId,
      employeeId,
      startAt,
      endAt,
      excludeAppointmentId: appointment._id,
    });

    await this.ensureClientHasNoConflict({
      companyId,
      clientId: appointment.clientId,
      startAt,
      endAt,
      excludeAppointmentId: appointment._id,
    });

    /**
     * `publicAccessTokenHash` não entra no update: o link já
     * entregue tem de continuar a funcionar.
     */
    const updated = await this.appointmentRepository.update(
      appointment._id,
      {
        serviceId,
        employeeId,
        startAt,
        endAt,
        notes,
      },
    );

    if (!updated) {
      throw this.publicAppointmentNotFound();
    }

    await this.dispatchAppointmentNotification(
      updated,
      NotificationType.APPOINTMENT_UPDATED,
      /**
       * O cliente acabou de apresentar o token puro na URL (e
       * `resolveByPublicToken` já o validou). É a única forma
       * segura de voltar a ter o valor: a base de dados só
       * guarda o hash.
       */
      this.publicManageToken(token),
    );

    return this.toPublicResult(updated);
  }

  /**
   * ==========================================================
   * Cancela o agendamento através do link público.
   *
   * Reutiliza a transição administrativa `cancel()`
   * (scheduled/confirmed -> cancelled), que dispara as mesmas
   * notificações. Não há remoção física nem caminho alternativo
   * de cancelamento.
   *
   * Idempotente: cancelar um agendamento já cancelado devolve
   * o estado atual com `200`, sem nova notificação e sem
   * alterar `updatedAt`. Rejeitar com erro seria mais
   * correcto semanticamente, mas num link público obriga o
   * cliente final a distinguir "cancelado" de "erro" e favorece
   * retries cegos. Em nenhum dos casos é possível reativar.
   * ==========================================================
   */
  public async cancelPublicByToken(token: unknown) {
    const appointment = await this.resolveByPublicToken(token);

    /**
     * Já cancelado: resposta idempotente.
     */
    if (appointment.status === AppointmentStatus.CANCELLED) {
      return this.toPublicResult(appointment);
    }

    /**
     * Concluído ou no-show: estados finais, não alteráveis.
     */
    if (
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.NO_SHOW
    ) {
      throw new AppError(
        HttpMessages.PUBLIC_APPOINTMENT_NOT_EDITABLE,
        HttpStatus.BAD_REQUEST,
      );
    }

    /**
     * Agendamento scheduled/confirmed já no passado: o próprio
     * sistema o cancela automaticamente
     * (`cancelOverdueScheduled`). Cancelar aqui é coerente com
     * essa regra e evita depender de uma job ter corrido.
     */

    await this.cancel(
      appointment._id.toString(),
      appointment.companyId.toString(),
      /**
       * Token puro apresentado na URL, para o e-mail de
       * cancelamento poder repetir o link de gestão.
       */
      this.publicManageToken(token),
    );

    const cancelled =
      (await this.appointmentRepository.findById(appointment._id)) ??
      appointment;

    return this.toPublicResult(cancelled);
  }

  /**
   * ==========================================================
   * Atualiza o status de um agendamento.
   *
   * Valida se o agendamento pertence à empresa e se
   * a transição de status é permitida.
   *
   * `publicManageToken` atravessa a transição para que o
   * e-mail de cancelamento do fluxo público inclua o link de
   * gestão. É omitido em todas as transições administrativas.
   * ==========================================================
   */
  private async changeStatus(
    id: string,
    companyId: string,
    allowedCurrentStatuses: AppointmentStatus[],
    newStatus: AppointmentStatus,
    publicManageToken?: string,
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
        publicManageToken,
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
   *
   * `publicManageToken` é opcional e só é enviado pelo cancelamento
   * público (ver `cancelPublicByToken`). Na rota administrativa é
   * omitido: o cancelamento feito por um utilizador autenticado
   * gera um e-mail sem link público, porque esse agendamento não
   * tem token público.
   * ==========================================================
   */
  public async cancel(
    id: string,
    companyId: string,
    publicManageToken?: string,
  ) {
    return this.changeStatus(
      id,
      companyId,
      [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      AppointmentStatus.CANCELLED,
      publicManageToken,
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