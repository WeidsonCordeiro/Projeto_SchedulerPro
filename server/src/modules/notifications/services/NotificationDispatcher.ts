/**
 * ==========================================================
 * Arquivo: NotificationDispatcher.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Orquestrar o envio das notificações de agendamento:
 *
 * 1. Cria uma notificação interna para cada utilizador interno
 *    da empresa (OWNER, ADMIN, MANAGER e EMPLOYEE).
 * 2. Envia um e-mail ao cliente do agendamento.
 *
 * Falhas aqui NUNCA derrubam o fluxo do agendamento: qualquer
 * erro é registado com detalhe (Logger.error) e o processo
 * principal continua. Clientes sem e-mail cadastrado apenas
 * não recebem o e-mail.
 *
 * ==========================================================
 */

import { Types } from "mongoose";

import NotificationRepository from "../repositories/NotificationRepository";
import CompanyRepository from "../../companies/repositories/CompanyRepository";
import ClientRepository from "../../Clients/repositories/ClientRepository";
import ServiceRepository from "../../services/repositories/ServiceRepository";
import UserRepository from "../../users/repositories/UserRepository";

import ResendProvider from "../../../providers/mail/ResendProvider";
import Logger from "../../../providers/logger/Logger";

import { appointmentCreatedEmail } from "../../../providers/mail/templates/appointment-created.template";
import { appointmentUpdatedEmail } from "../../../providers/mail/templates/appointment-updated.template";
import { appointmentCancelledEmail } from "../../../providers/mail/templates/appointment-cancelled.template";
import { AppointmentEmailData } from "../../../providers/mail/templates/appointment-email-layout";

import { NotificationType } from "../index";
import { Role } from "../../../constants/roles";
import {
  DEFAULT_TIMEZONE,
  toCompanyDateTime,
} from "../../../utils/timezone";

export interface AppointmentNotificationInput {
  companyId: string;
  appointmentId: string;
  type: NotificationType;
  clientId: string;
  serviceId: string;
  employeeId: string;
  startAt: Date;
  notes?: string | null;
}

interface AppointmentContext {
  title: string;
  emailTemplate: (data: AppointmentEmailData) => string;
  emailSubject: string;
}

const EVENT_CONTEXT: Record<NotificationType, AppointmentContext> = {
  [NotificationType.APPOINTMENT_CREATED]: {
    title: "Novo agendamento",
    emailTemplate: appointmentCreatedEmail,
    emailSubject: "Seu agendamento foi confirmado",
  },
  [NotificationType.APPOINTMENT_UPDATED]: {
    title: "Agendamento atualizado",
    emailTemplate: appointmentUpdatedEmail,
    emailSubject: "Seu agendamento foi atualizado",
  },
  [NotificationType.APPOINTMENT_CANCELLED]: {
    title: "Agendamento cancelado",
    emailTemplate: appointmentCancelledEmail,
    emailSubject: "Seu agendamento foi cancelado",
  },
};

class NotificationDispatcher {
  private readonly notificationRepository = NotificationRepository;
  private readonly companyRepository = CompanyRepository;
  private readonly clientRepository = ClientRepository;
  private readonly serviceRepository = ServiceRepository;
  private readonly userRepository = UserRepository;
  private readonly resendProvider = ResendProvider;

  private readonly emailSubjectPrefix =
    "SchedulerPro — ";
  private readonly logger = Logger;

  private logFailure(context: string, error: unknown, meta: Record<string, unknown>) {
    this.logger.error(`Falha ao notificar ${context}`, {
      ...meta,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  /**
   * ==========================================================
   * Entrega as notificações de um evento de agendamento.
   *
   * Método "best effort": qualquer falha é registada e nunca
   * propagada. Deve ser chamado após a mutação principal ter
   * sido persistida com sucesso.
   * ==========================================================
   */
  public async dispatchAppointmentEvent(
    input: AppointmentNotificationInput,
  ): Promise<void> {
    try {
      const context = EVENT_CONTEXT[input.type];

      if (!context) {
        return;
      }

      const company = await this.companyRepository.findById(input.companyId);
      const timezone = company?.timezone ?? DEFAULT_TIMEZONE;
      const companyName = company?.name ?? "SchedulerPro";

      const client = await this.clientRepository.findByIdAndCompany(
        input.clientId,
        input.companyId,
      );
      const service = await this.serviceRepository.findById(input.serviceId);
      const employee = await this.userRepository.findById(input.employeeId);

      if (!client) {
        return;
      }

      const clientName = client.name;
      const serviceName = service?.name ?? null;
      const employeeName = employee?.name ?? null;

      const startLabel = toCompanyDateTime(input.startAt, timezone).toFormat(
        "dd/MM/yyyy",
      );
      const timeLabel = toCompanyDateTime(input.startAt, timezone).toFormat(
        "HH:mm",
      );
      const dateTimeLabel = `${startLabel} às ${timeLabel}`;

      await this.dispatchInternalNotifications({
        input,
        clientName,
        serviceName,
        dateTimeLabel,
      });

      await this.dispatchClientEmail({
        input,
        context,
        timezone,
        companyName,
        clientName,
        serviceName,
        employeeName,
        startLabel,
        timeLabel,
      });
    } catch (error) {
      this.logFailure("o evento de agendamento", error, {
        appointmentId: input.appointmentId,
        companyId: input.companyId,
        type: input.type,
      });
    }
  }

  /**
   * ==========================================================
   * Cria as notificações internas da empresa.
   *
   * Todos os utilizadores internos (não CLIENT) recebem uma
   * notificação para acompanhar a agenda. Utilizadores inativos
   * são ignorados.
   * ==========================================================
   */
  private async dispatchInternalNotifications(params: {
    input: AppointmentNotificationInput;
    clientName: string;
    serviceName: string | null;
    dateTimeLabel: string;
  }): Promise<void> {
    const { input, clientName, serviceName, dateTimeLabel } = params;

    const users = await this.userRepository.findByCompanyId(input.companyId);
    const recipients = users.filter(
      (user) => user.role !== Role.CLIENT && user.isActive,
    );

    if (recipients.length === 0) {
      return;
    }

    const items = recipients.map((user) => ({
      companyId: new Types.ObjectId(input.companyId),
      userId: user._id,
      type: input.type,
      title: EVENT_CONTEXT[input.type].title,
      message: `${clientName} — ${serviceName ?? "Serviço"} em ${dateTimeLabel}.`,
      metadata: {
        appointmentId: new Types.ObjectId(input.appointmentId),
        clientId: new Types.ObjectId(input.clientId),
        serviceId: new Types.ObjectId(input.serviceId),
        employeeId: new Types.ObjectId(input.employeeId),
      },
    }));

    await this.notificationRepository.createMany(items);
  }

  /**
   * ==========================================================
   * Envia o e-mail ao cliente do agendamento.
   *
   * Clientes sem e-mail cadastrado não geram erro nem e-mail.
   * ==========================================================
   */
  private async dispatchClientEmail(params: {
    input: AppointmentNotificationInput;
    context: AppointmentContext;
    timezone: string;
    companyName: string;
    clientName: string;
    serviceName: string | null;
    employeeName: string | null;
    startLabel: string;
    timeLabel: string;
  }): Promise<void> {
    const {
      input,
      context,
      timezone,
      companyName,
      clientName,
      serviceName,
      employeeName,
      startLabel,
      timeLabel,
    } = params;

    const client = await this.clientRepository.findByIdAndCompany(
      input.clientId,
      input.companyId,
    );

    if (!client?.email) {
      return;
    }

    const service = await this.serviceRepository.findById(input.serviceId);

    const durationMinutes = service?.duration ?? 0;
    const endTime = new Date(
      input.startAt.getTime() + durationMinutes * 60 * 1000,
    );
    const endTimeLabel = toCompanyDateTime(endTime, timezone).toFormat("HH:mm");

    const html = context.emailTemplate({
      clientName,
      companyName,
      serviceName,
      employeeName,
      dateLabel: startLabel,
      timeLabel,
      endTimeLabel,
      notes: input.notes,
    });

    try {
      await this.resendProvider.send({
        to: client.email,
        subject: `${this.emailSubjectPrefix}${context.emailSubject}`,
        html,
      });

      this.logger.email(
        `E-mail de agendamento enviado para ${client.email}`,
        {
          appointmentId: input.appointmentId,
          companyId: input.companyId,
          type: input.type,
        },
      );
    } catch (error) {
      this.logFailure(`o e-mail de ${input.type}`, error, {
        appointmentId: input.appointmentId,
        companyId: input.companyId,
        to: client.email,
      });
    }
  }
}

export default new NotificationDispatcher();