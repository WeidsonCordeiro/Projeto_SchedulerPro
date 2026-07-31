/**
 * ==========================================================
 * Arquivo: types.ts
 * ----------------------------------------------------------
 * Tipagens utilizadas pelo Logger.
 * ==========================================================
 */

export interface LogMeta {
  requestId?: string;
  userId?: string;
  companyId?: string;
  method?: string;
  url?: string;
  ip?: string;
  stack?: string;

  [key: string]: unknown;
}
