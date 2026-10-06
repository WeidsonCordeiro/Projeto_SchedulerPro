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
import { redactPublicAppointmentToken } from "../utils/redact-public-appointment-token";

morgan.token("safe-url", (req) =>
  redactPublicAppointmentToken(req.url ?? ""),
);

const stream = {
  write: (message: string) => {
    logger.http({
      message: message.trim(),
    });
  },
};

const morganMiddleware = morgan(
  ":method :safe-url :status :response-time ms",

  {
    stream,
  }
);

export default morganMiddleware;
