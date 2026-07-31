/**
 * ==========================================================
 * Arquivo: formatter.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 * Padronizar mensagens de log.
 * ==========================================================
 */

import { LogCategoryType } from "./categories";

export function formatCategory(
  category: LogCategoryType,
  message: string
): string {
  return `[${category}] ${message}`;
}
