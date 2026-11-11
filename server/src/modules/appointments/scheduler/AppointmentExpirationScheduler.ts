/**
 * ==========================================================
 * Executa periodicamente a expiração multiempresa de
 * agendamentos (delega a AppointmentExpirationService).
 * ==========================================================
 */

import AppointmentExpirationService from "../services/AppointmentExpirationService";
import Logger from "../../../providers/logger/Logger";
import { env } from "../../../config/env";
import { DEFAULT_APPOINTMENT_EXPIRATION_INTERVAL_MS } from "../appointment-expiration.config";

export class AppointmentExpirationScheduler {
  private readonly service: typeof AppointmentExpirationService;
  private readonly intervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private stopping = false;
  private stopCompleted = false;
  private inFlight: Promise<void> | null = null;

  constructor(
    service: typeof AppointmentExpirationService = AppointmentExpirationService,
    intervalMs: number =
      env.jobs.APPOINTMENT_EXPIRATION_INTERVAL_MS ??
      DEFAULT_APPOINTMENT_EXPIRATION_INTERVAL_MS,
  ) {
    this.service = service;
    this.intervalMs = intervalMs;
  }

  /**
   * Inicia o processamento periódico (catch-up imediato + intervalo).
   */
  public start(): void {
    if (this.stopping) {
      return;
    }

    if (this.timer) {
      return;
    }

    Logger.system("AppointmentExpirationScheduler iniciado", {
      intervalMs: this.intervalMs,
    });

    void this.run();

    this.timer = setInterval(() => {
      void this.run();
    }, this.intervalMs);
  }

  /**
   * Encerra o processamento periódico e aguarda a rodada em curso.
   */
  public async stop(): Promise<void> {
    const pending = this.inFlight;

    if (this.stopCompleted && !pending) {
      return;
    }

    this.stopping = true;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (pending) {
      try {
        await pending;
      } catch (error) {
        Logger.error(error instanceof Error ? error : new Error(String(error)), {
          context: "AppointmentExpirationScheduler.stop.awaitInFlight",
        });
      }
    }

    if (!this.stopCompleted) {
      Logger.system("AppointmentExpirationScheduler encerrado");
      this.stopCompleted = true;
    }
  }

  /**
   * Uma rodada. Falhas não propagam; execuções sobrepostas são ignoradas.
   */
  public async run(): Promise<void> {
    if (this.stopping) {
      return;
    }

    if (this.running) {
      return;
    }

    this.running = true;
    const current = this.executeRun();
    this.inFlight = current;

    try {
      await current;
    } finally {
      this.running = false;
      if (this.inFlight === current) {
        this.inFlight = null;
      }
    }
  }

  private async executeRun(): Promise<void> {
    try {
      Logger.system("AppointmentExpirationScheduler: início da rodada", {
        intervalMs: this.intervalMs,
      });

      const summary = await this.service.processOverdueForAllCompanies();

      Logger.system("AppointmentExpirationScheduler: rodada concluída", {
        processedCompanies: summary.processedCompanies,
        totalCancelled: summary.totalCancelled,
        failedCompanies: summary.failedCompanies,
        referenceTime: summary.referenceTime.toISOString(),
      });
    } catch (error) {
      Logger.error(error instanceof Error ? error : new Error(String(error)), {
        context: "AppointmentExpirationScheduler.run",
      });
    }
  }
}

export default new AppointmentExpirationScheduler();
