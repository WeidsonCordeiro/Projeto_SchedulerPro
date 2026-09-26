/**
 * ==========================================================
 * Arquivo: index.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Centralizar as tipagens e constantes do módulo de lembretes
 * automáticos de agendamento (24h e 2h antes).
 *
 * ==========================================================
 */

/**
 * Tipos de lembrete suportados.
 *
 * O valor identifica o momento antecedente: "24h" e "2h".
 */
export enum ReminderType {
  REMINDER_24H = "24h",
  REMINDER_2H = "2h",
}

/**
 * Janela de tolerância para o envio dos lembretes.
 *
 * O job não roda exatamente no instante `startAt - 24h` /
 * `startAt - 2h`. Cada lembrete é considerado "dentro da janela"
 * quando o instante atual está entre o momento exato e esse
 * instante + tolerância.
 *
 * Fora da janela (muito cedo ou tarde demais) o lembrete NÃO é
 * enviado — evita envios atrasados de forma indiscriminada.
 *
 * 24h → tolerância de 3 horas (servidor pode ficar indisponível
 *       por um intervalo maior sem perder o lembrete).
 * 2h  → tolerância de 1 hora (janela mais curta/sensível).
 */
export const REMINDER_24H_OFFSET_MINUTES = 24 * 60;
export const REMINDER_2H_OFFSET_MINUTES = 2 * 60;
export const REMINDER_24H_TOLERANCE_MINUTES = 3 * 60;
export const REMINDER_2H_TOLERANCE_MINUTES = 60;

/**
 * Tempo de vida (lease) da trava de processamento.
 *
 * Enquanto a trava vigora, nenhuma outra execução do job reenvia
 * o mesmo lembrete. Se o processo morrer durante o envio, a trava
 * expira e uma execução posterior retoma.
 */
export const REMINDER_LEASE_TTL_MINUTES = 10;

/**
 * Frequência do processamento periódico (1 minuto).
 */
export const REMINDER_JOB_INTERVAL_MS = 60_000;

/**
 * Resultado de uma execução do processamento.
 */
export interface ReminderRunSummary {
  /** Agendamentos candidatos examinados. */
  checked: number;
  /** Lembretes enviados com sucesso. */
  sent: number;
  /** Lembretes pulados (já enviados, fora da janela, sem destinatário etc.). */
  skipped: number;
  /** Lembretes que falharam no envio (serão tentados novamente). */
  failed: number;
}