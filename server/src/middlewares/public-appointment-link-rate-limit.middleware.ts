/**

* ==========================================================
* Arquivo: public-appointment-link-rate-limit.middleware.ts
* ----------------------------------------------------------
* Responsabilidade:
*
* Limitar o acesso público por TOKEN (consulta, alteração e
* cancelamento), à parte do limite da criação.
*
* São três limitadores independentes porque os três métodos têm
* perfis de abuso muito diferentes:
*
* • GET é leitura e o frontend repete o pedido várias vezes
*   (abrir, recarregar, voltar atrás). O limite é generoso.
* • PATCH e DELETE alteram estado e disparam notificações.
*   São muito mais restritivos: são eles que interessam a quem
*   quer vandalizar ou inundar os clientes da empresa.
*
* A chave é `método + rota + IP`, pelo que esgotar o limite de
* escrita não impede a leitura do próprio agendamento.
*
* Store em memória, como o limitador da criação. Reiniciar o
* processo zera os contadores.
* ==========================================================
  */

import { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import { ResponseHandler } from "../utils/response";
import { HttpMessages } from "../constants/http-messages";
import { HttpStatus } from "../constants/http-status";

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

/**
 * ==========================================================
 * Resolve o endereço IP.
 *
 * Apenas `req.ip`. A aplicação não configura `trust proxy`, o
 * que tornaria qualquer `X-Forwarded-For` um cabeçalho
 * controlado pelo cliente — ver a nota equivalente em
 * `public-booking-rate-limit.middleware.ts`.
 * ==========================================================
 */
function resolveClientIp(req: Request): string {
  return req.ip ?? "unknown";
}

/**
 * ==========================================================
 * Cria um limitador para uma rota pública por token.
 * ==========================================================
 */
export function createPublicLinkRateLimit(options: {
  routeKey: string;
  limit: number;
  windowMs?: number;
}) {
  return rateLimit({
    windowMs: options.windowMs ?? DEFAULT_WINDOW_MS,
    limit: options.limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req: Request) =>
      `${options.routeKey}:${ipKeyGenerator(resolveClientIp(req))}`,
    handler: (_req, res) =>
      ResponseHandler.error(
        res,
        HttpMessages.TOO_MANY_REQUESTS,
        HttpStatus.TOO_MANY_REQUESTS,
      ),
  });
}

/**
 * ==========================================================
 * Consulta pelo link.
 *
 * 60 pedidos/15min por IP:fluxo normal de uma página que
 * consulta o estado e revalida.
 * ==========================================================
 */
export const publicAppointmentReadRateLimit = createPublicLinkRateLimit({
  routeKey: "GET /public/appointments/:token",
  limit: 60,
});

/**
 * ==========================================================
 * Alteração pelo link.
 *
 * 10 pedidos/15min por IP: mais do que qualquer alteração
 * legítima de um único agendamento.
 * ==========================================================
 */
export const publicAppointmentWriteRateLimit = createPublicLinkRateLimit({
  routeKey: "PATCH /public/appointments/:token",
  limit: 10,
});

/**
 * ==========================================================
 * Cancelamento pelo link.
 *
 * 10 pedidos/15min por IP, partilhando a intenção de
 * segurança com a alteração mas com chave própria, para que um
 * cliente não gaste o orçamento de cancelamentos a tentar
 * remanejamentos (e vice-versa).
 * ==========================================================
 */
export const publicAppointmentCancelRateLimit = createPublicLinkRateLimit({
  routeKey: "DELETE /public/appointments/:token",
  limit: 10,
});