/**
 * Resultado de uma execução da expiração multiempresa de agendamentos.
 */
export interface AppointmentExpirationRunSummary {
  /** Empresas processadas com sucesso (cancelOverdueScheduled concluído). */
  processedCompanies: number;
  /** Soma de agendamentos alterados (`modifiedCount` do repositório). */
  totalCancelled: number;
  /** Empresas cujo processamento falhou (demais empresas continuaram). */
  failedCompanies: number;
  /** Instante de referência usado na comparação `startAt < now`. */
  referenceTime: Date;
}
