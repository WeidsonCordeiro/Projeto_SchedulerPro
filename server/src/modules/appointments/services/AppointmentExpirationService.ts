/**
 * ==========================================================
 * Expiração automática de agendamentos — processamento
 * multiempresa (scheduled vencidos → cancelled).
 *
 * Não envia notificações nem altera rotas HTTP.
 * ==========================================================
 */

import AppointmentRepository from "../repositories/AppointmentRepository";
import CompanyRepository from "../../companies/repositories/CompanyRepository";
import Logger from "../../../providers/logger/Logger";
import { AppointmentExpirationRunSummary } from "../appointment-expiration.types";

class AppointmentExpirationService {
  private readonly appointmentRepository = AppointmentRepository;
  private readonly companyRepository = CompanyRepository;

  /**
   * Cancela agendamentos `scheduled` vencidos em todas as empresas
   * ativas e não eliminadas.
   *
   * Falha ao processar uma empresa não interrompe as demais.
   */
  public async processOverdueForAllCompanies(
    now: Date = new Date(),
  ): Promise<AppointmentExpirationRunSummary> {
    const summary: AppointmentExpirationRunSummary = {
      processedCompanies: 0,
      totalCancelled: 0,
      failedCompanies: 0,
      referenceTime: now,
    };

    let companies;
    try {
      companies = await this.companyRepository.findAllActiveNotDeleted();
    } catch (error) {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        { context: "AppointmentExpirationService.findAllActiveNotDeleted" },
      );
      throw error;
    }

    for (const company of companies) {
      const companyId = company._id.toString();

      try {
        const modifiedCount =
          await this.appointmentRepository.cancelOverdueScheduled(
            companyId,
            now,
          );
        summary.processedCompanies += 1;
        summary.totalCancelled += modifiedCount;
      } catch (error) {
        summary.failedCompanies += 1;
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          {
            companyId,
            context: "AppointmentExpirationService.cancelOverdueScheduled",
          },
        );
      }
    }

    Logger.system(
      "Expiração multiempresa de agendamentos concluída",
      {
        processedCompanies: summary.processedCompanies,
        totalCancelled: summary.totalCancelled,
        failedCompanies: summary.failedCompanies,
        referenceTime: now.toISOString(),
      },
    );

    return summary;
  }
}

export default new AppointmentExpirationService();
