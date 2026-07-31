/**
 * ==========================================================
 * Arquivo: env.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 * Centralizar o acesso às variáveis de ambiente (.env).
 *
 * Em vez de utilizar process.env espalhado pelo projeto,
 * todos os arquivos importarão apenas o objeto "env".
 *
 * Isso facilita manutenção, organização e futuras validações.
 *
 * Exemplo:
 *
 * ❌ process.env.JWT_SECRET
 *
 * ✔ env.JWT_SECRET
 *
 * ==========================================================
 */

import dotenv from "dotenv";
import { validateEnv } from "./validateEnv";

// Carrega o arquivo .env
dotenv.config();

/**
 * Executa a validação
 * antes de exportar qualquer configuração.
 */
validateEnv();

/**
 * ==========================================================
 * Objeto contendo todas as configurações da aplicação.
 *
 * Caso alguma variável obrigatória esteja ausente,
 * o projeto lançará um erro logo ao iniciar.
 * ==========================================================
 */

export const env = {
  app: {
    /**
     * Ambiente atual
     * development | production
     */
    NODE_ENV: process.env.APP_NODE_ENV || "development",

    /**
     * Porta do servidor
     */
    PORT: Number(process.env.APP_PORT) || 3000,
  },
  jwt: {
    /**
     * JWT
     */
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
    /**
     * Refresh Token
     */
    REFRESH_SECRET: process.env.REFRESH_SECRET!,
    REFRESH_EXPIRES_IN: process.env.REFRESH_EXPIRES_IN || "7d",
  },
  mongo: {
    /**
     * MongoDB
     */
    MONGO_URI: process.env.MONGO_URI!, //! = Possível garantir que a variável está definida, pois validateEnv() já validou.
  },
  cloudinary: {
    /**
     * Cloudinary
     */
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",

    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",

    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
  },
  redis: {
    /**
     * Redis
     */
    REDIS_HOST: process.env.REDIS_HOST || "localhost",

    REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,

    REDIS_PASSWORD: process.env.REDIS_PASSWORD || "",
  },
  resend: {
    /**
     * Resend
     */
    RESEND_API_KEY: process.env.RESEND_API_KEY!,
  },
  whatsApp: {
    /**
     * WhatsApp
     */
    WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN || "",

    WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID || "",
  },
  logLevel: {
    /**
     * Logs
     */
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
  },
  sentry: {
    /**
     * Sentry
     */
    SENTRY_DSN: process.env.SENTRY_DSN || "",
  },
};
