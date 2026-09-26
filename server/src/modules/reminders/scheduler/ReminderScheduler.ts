/**
 * ==========================================================
 * Arquivo: ReminderScheduler.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Executar periodicamente o processamento de lembretes de
 * agendamento.
 *
 * A solução é persistente e sobrevive a restart/reinício:
 * - o job roda imediatamente na inicialização (catch-up);
 * - depois roda a cada intervalo fixo;
 * - a idempotência é garantida pelos campos `reminder*SentAt`
 *   do próprio agendamento + claim atômico (lease) no banco;
 * - falhas de uma execução nunca derrubam o processo.
 *
 * ==========================================================
 */

import ReminderService from "../services/ReminderService";
import Logger from "../../../providers/logger/Logger";
import { REMINDER_JOB_INTERVAL_MS } from "../index";

export class ReminderScheduler {
  private readonly service: typeof ReminderService;
  private readonly intervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    service: typeof ReminderService = ReminderService,
    intervalMs: number = REMINDER_JOB_INTERVAL_MS,
  ) {
    this.service = service;
    this.intervalMs = intervalMs;
  }

  /**
   * Inicia o processamento periódico.
   *
   * Roda uma execução imediata (para retomar lembretes perdidos
   * durante a indisponibilidade) e agenda as seguintes.
   */
  public start(): void {
    if (this.timer) {
      return;
    }

    void this.run();

    this.timer = setInterval(() => {
      void this.run();
    }, this.intervalMs);
  }

  /**
   * Encerra o processamento periódico.
   */
  public async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Executa uma rodada do processamento.
   *
   * Nunca lança: falhas são registradas e o loop continua.
   * Execuções sobrepostas são ignoradas.
   */
  public async run(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      const summary = await this.service.processDueReminders();

      Logger.system(
        `Lembretes processados: ${summary.checked} candidatos, ` +
          `${summary.sent} enviados, ${summary.skipped} ignorados, ` +
          `${summary.failed} com falha`,
      );
    } catch (error) {
      Logger.error(error instanceof Error ? error : new Error(String(error)), {
        context: "ReminderScheduler.run",
      });
    } finally {
      this.running = false;
    }
  }
}

export default new ReminderScheduler();