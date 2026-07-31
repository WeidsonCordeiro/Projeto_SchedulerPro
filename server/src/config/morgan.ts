/**
 * ==========================================================
 * Arquivo: morgan.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Integrar Morgan ao Winston.
 *
 * Morgan captura requisições HTTP.
 *
 * Winston grava os logs.
 *
 * ==========================================================
 */

import morgan from "morgan";

import { logger } from "./logger";

const stream = {
  write: (message: string) => {
    logger.http({
      message: message.trim(),
    });
  },
};

const morganMiddleware = morgan(
  ":method :url :status :response-time ms",

  {
    stream,
  }
);

export default morganMiddleware;
