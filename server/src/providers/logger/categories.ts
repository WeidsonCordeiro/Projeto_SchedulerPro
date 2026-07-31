/**
 * ==========================================================
 * Arquivo: categories.ts
 * ----------------------------------------------------------
 * Categorias de logs da aplicação.
 * ==========================================================
 */

export const LogCategory = {
  SYSTEM: "SYSTEM",
  AUTH: "AUTH",
  DATABASE: "DATABASE",
  EMAIL: "EMAIL",
  REDIS: "REDIS",
  UPLOAD: "UPLOAD",
  WHATSAPP: "WHATSAPP",
  SECURITY: "SECURITY",
  APPOINTMENT: "APPOINTMENT",
  USER: "USER",
} as const;

export type LogCategoryType = (typeof LogCategory)[keyof typeof LogCategory];
