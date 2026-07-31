/**
 * ==========================================================
 * Arquivo: IDatabaseProvider.ts
 * ----------------------------------------------------------
 * Contrato para qualquer provedor de banco de dados.
 * ==========================================================
 */

export interface IDatabaseProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getStatus(): string;
}
