/**
 * ==========================================================
 * Arquivo: ReminderService.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Processar os lembretes automáticos de agendamento (24h e 2h
 * antes do início), enviando e-mail ao cliente no timezone da
 * empresa, com proteção contra duplicidade e concorrência.
 *
 * Regras:
 * - Apenas agendamentos futuros, ativos (scheduled/confirmed),
 *   sem soft delete, de empresa e cliente válidos.
 * - O cálculo de "24h/2h antes" usa o instante absoluto
 *   (`startAt - offset`); o timezone da empresa é usado apenas
 *   para formatar as datas/horas exibidas ao cliente.
 * - Envio é best effort: falha não derruba a API, é registrada
 *   e o lembrete permanece não enviado para nova tentativa.
 * - Idempotência: o lembrete só é marcado como enviado depois do
 *   e-mail ser aceito; o claim atômico evita envios duplicados
 *   entre execuções concorrentes.
 * ==========================================================
 */

import AppointmentRepository from "../../appointments/repositories/AppointmentRepository";
import CompanyRepository from "../../companies/repositories/CompanyRepository";
import ClientRepository from "../../Clients/repositories/ClientRepository";
import ServiceRepository from "../../services/repositories/ServiceRepository";
import UserRepository from "../../users/repositories/UserRepository";

import Logger from "../../../providers/logger/Logger";
import NotificationDispatcher from "../../notifications/services/NotificationDispatcher";
import PublicAppointmentTokenProvider from "../../../providers/security/PublicAppointmentTokenProvider";
import { buildPublicManageUrl } from "../../../utils/public-manage-url";

import { reminder24hEmail } from "../../../providers/mail/templates/reminder-24h.template";
import { reminder2hEmail } from "../../../providers/mail/templates/reminder-2h.template";
import { ReminderEmailData } from "../../../providers/mail/templates/reminder-email-layout";

import { AppointmentDocument } from "../../appointments/models/Appointment.model";
import { DEFAULT_TIMEZONE, toCompanyDateTime } from "../../../utils/timezone";

import {
  REMINDER_24H_OFFSET_MINUTES,
  REMINDER_2H_OFFSET_MINUTES,
  REMINDER_24H_TOLERANCE_MINUTES,
  REMINDER_2H_TOLERANCE_MINUTES,
  REMINDER_LEASE_TTL_MINUTES,
  ReminderType,
  ReminderRunSummary,
} from "../index";

interface ReminderContext {
  type: ReminderType;
  sentField: string;
  leaseField: string;
  offsetMs: number;
  toleranceMs: number;
  emailTemplate: (data: ReminderEmailData) => string;
  subject: string;
}

const MINUTE_MS = 60_000;

const REMINDER_CONTEXT: Record<ReminderType, ReminderContext> = {
  [ReminderType.REMINDER_24H]: {
    type: ReminderType.REMINDER_24H,
    sentField: "reminder24hSentAt",
    leaseField: "reminder24hLeaseUntil",
    offsetMs: REMINDER_24H_OFFSET_MINUTES * MINUTE_MS,
    toleranceMs: REMINDER_24H_TOLERANCE_MINUTES * MINUTE_MS,
    emailTemplate: reminder24hEmail,
    subject: "Lembrete em 24 horas",
  },
  [ReminderType.REMINDER_2H]: {
    type: ReminderType.REMINDER_2H,
    sentField: "reminder2hSentAt",
    leaseField: "reminder2hLeaseUntil",
    offsetMs: REMINDER_2H_OFFSET_MINUTES * MINUTE_MS,
    toleranceMs: REMINDER_2H_TOLERANCE_MINUTES * MINUTE_MS,
    emailTemplate: reminder2hEmail,
    subject: "Lembrete em 2 horas",
  },
};

const emailSubjectPrefix = "SchedulerPro — ";

class ReminderService {
  private readonly appointmentRepository = AppointmentRepository;
  private readonly companyRepository = CompanyRepository;
  private readonly clientRepository = ClientRepository;
  private readonly serviceRepository = ServiceRepository;
  private readonly userRepository = UserRepository;
  private readonly notificationDispatcher = NotificationDispatcher;
  private readonly publicTokenProvider = PublicAppointmentTokenProvider;
  private readonly logger = Logger;

  /**
   * ==========================================================
   * Processa todos os lembretes vencidos neste instante.
   *
   * `now` é injetável para testes com horário fixo.
   * ==========================================================
   */
  public async processDueReminders(now: Date = new Date()): Promise<ReminderRunSummary> {
    const lookaheadMs =
      (REMINDER_24H_OFFSET_MINUTES + REMINDER_24H_TOLERANCE_MINUTES) * MINUTE_MS;

    const appointments =
      await this.appointmentRepository.findUpcomingForReminders(now, lookaheadMs);

    const summary: ReminderRunSummary = {
      checked: appointments.length,
      sent: 0,
      skipped: 0,
      failed: 0,
    };

    for (const type of [ReminderType.REMINDER_24H, ReminderType.REMINDER_2H]) {
      const context = REMINDER_CONTEXT[type];

      for (const appointment of appointments) {
        const result = await this.processAppointment(appointment, context, now);

        summary.sent += result.sent;
        summary.skipped += result.skipped;
        summary.failed += result.failed;
      }
    }

    return summary;
  }

  /**
   * ==========================================================
   * Decide se um lembrete está dentro da janela válida e o envia.
   * ==========================================================
   */
  private async processAppointment(
    appointment: AppointmentDocument,
    context: ReminderContext,
    now: Date,
  ): Promise<{ sent: number; skipped: number; failed: number }> {
    const result = { sent: 0, skipped: 0, failed: 0 };

    if (appointment[context.sentField as keyof AppointmentDocument]) {
      return result;
    }

    const nowMs = now.getTime();
    const dueMs = appointment.startAt.getTime() - context.offsetMs;
    const windowEndMs = dueMs + context.toleranceMs;

    if (nowMs < dueMs || nowMs > windowEndMs) {
      return result;
    }

    try {
      const sent = await this.sendReminder(appointment, context, now);
      result.sent = sent ? 1 : 0;
      result.skipped = sent ? 0 : 1;
    } catch {
      result.failed = 1;
    }

    return result;
  }

  /**
   * ==========================================================
   * Monta o e-mail, reivindica o lembrete e envia.
   *
   * Retorna `true` quando o e-mail foi enviado e o lembrete
   * marcado como enviado.
   * ==========================================================
   */
  private async sendReminder(
    appointment: AppointmentDocument,
    context: ReminderContext,
    now: Date,
  ): Promise<boolean> {
    const company = await this.companyRepository.findById(
      appointment.companyId.toString(),
    );

    if (!company || company.isActive !== true) {
      return false;
    }

    const timezone = company.timezone || DEFAULT_TIMEZONE;

    const client = await this.clientRepository.findByIdAndCompany(
      appointment.clientId.toString(),
      appointment.companyId.toString(),
    );

    if (!client || !client.email) {
      return false;
    }

    // Legacy/admin appointments without recoverable public credentials are
    // skipped; never fabricate or rotate a token in the reminder path.
    if (!appointment.publicAccessTokenCiphertext) {
      return false;
    }
    const publicToken = this.publicTokenProvider.decrypt(
      appointment.publicAccessTokenCiphertext,
      appointment.publicAccessTokenHash ?? "",
    );
    if (
      !this.publicTokenProvider.hasValidFormat(publicToken) ||
      this.publicTokenProvider.hash(publicToken) !==
        appointment.publicAccessTokenHash
    ) {
      throw new Error("Credencial pública do agendamento inválida.");
    }

    const service = await this.serviceRepository.findById(
      appointment.serviceId.toString(),
    );
    const employee = await this.userRepository.findById(
      appointment.employeeId.toString(),
    );

    const startTime = toCompanyDateTime(appointment.startAt, timezone);
    const dateLabel = startTime.toFormat("dd/MM/yyyy");
    const timeLabel = startTime.toFormat("HH:mm");

    const durationMinutes = service?.duration ?? 0;
    const endAt = new Date(
      appointment.startAt.getTime() + durationMinutes * MINUTE_MS,
    );
    const endTimeLabel = toCompanyDateTime(endAt, timezone).toFormat("HH:mm");

    const html = context.emailTemplate({
      clientName: client.name,
      companyName: company.name,
      serviceName: service?.name ?? null,
      employeeName: employee?.name ?? null,
      dateLabel,
      timeLabel,
      endTimeLabel,
      publicManageUrl: buildPublicManageUrl(publicToken),
    });

    const leaseUntil = new Date(
      now.getTime() + REMINDER_LEASE_TTL_MINUTES * MINUTE_MS,
    );

    const claimed = await this.appointmentRepository.claimReminder(
      appointment._id,
      { sentField: context.sentField, leaseField: context.leaseField },
      leaseUntil,
      now,
    );

    if (claimed.modifiedCount !== 1) {
      return false;
    }

    try {
      await this.notificationDispatcher.dispatchReminderEmail({
        to: client.email,
        subject: `${emailSubjectPrefix}${context.subject}`,
        html,
      });
    } catch (error) {
      await this.appointmentRepository
        .releaseReminderLease(appointment._id, context.leaseField)
        .catch(() => undefined);

      this.logger.error(`Falha ao enviar lembrete de ${context.type}`, {
        appointmentId: appointment._id.toString(),
        companyId: appointment.companyId.toString(),
        clientId: appointment.clientId.toString(),
        email: client.email,
        error: "Falha no provider de e-mail.",
      });

      throw error;
    }

    await this.appointmentRepository.markReminderSent(
      appointment._id,
      { sentField: context.sentField, leaseField: context.leaseField },
      now,
    );

    this.logger.email(`Lembrete de ${context.type} enviado para ${client.email}`, {
      appointmentId: appointment._id.toString(),
      companyId: appointment.companyId.toString(),
      clientId: appointment.clientId.toString(),
      dateLabel,
      timeLabel,
    });

    return true;
  }
}

export default new ReminderService();
