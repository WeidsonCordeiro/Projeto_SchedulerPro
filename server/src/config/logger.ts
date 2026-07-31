/**
 * ==========================================================
 * Arquivo: logger.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Centralizar todos os logs da aplicação.
 *
 * Níveis:
 *
 * HTTP
 * INFO
 * WARN
 * ERROR
 * DEBUG
 *
 * O Winston será utilizado por toda a aplicação.
 *
 * Morgan -> Winston
 * Error Middleware -> Winston
 * Controllers -> Winston
 * Services -> Winston
 *
 * ==========================================================
 */

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { env } from "./env";

/**
 * ----------------------------------------------------------
 * Define níveis personalizados.
 * ----------------------------------------------------------
 */
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },

  colors: {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "blue",
  },
};

winston.addColors(customLevels.colors);

/**
 * ----------------------------------------------------------
 * Formato dos logs
 * ----------------------------------------------------------
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),

  winston.format.errors({
    stack: true,
  }),

  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metadata = Object.keys(meta).length ? JSON.stringify(meta) : "";
    return `[${timestamp}] ${level.toUpperCase()} : ${message} ${metadata}`;
  })
);

/**
 * ----------------------------------------------------------
 * Logger principal
 * ----------------------------------------------------------
 */

const logFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: "HH:mm:ss",
  }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} ${level}: ${message}`;
  })
);

export const logger = winston.createLogger({
  levels: customLevels.levels,
  level: env.app.NODE_ENV === "development" ? "debug" : "http",
  format: fileFormat,
  transports: [
    /**
     * Console
     */
    new winston.transports.Console({
      format: logFormat,
    }),

    /**
     * Todos os logs
     */

    new DailyRotateFile({
      filename: "logs/%DATE%-app.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d",
    }),

    /**
     * Apenas erros
     */

    new DailyRotateFile({
      filename: "logs/%DATE%-error.log",
      level: "error",
      datePattern: "YYYY-MM-DD",
      maxFiles: "60d",
    }),
  ],
});
