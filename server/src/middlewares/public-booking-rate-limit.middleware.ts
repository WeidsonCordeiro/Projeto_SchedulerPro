/**

* ==========================================================
* Arquivo: public-booking-rate-limit.middleware.ts
* ---
* Responsabilidade:
*
* Limitar o número de pedidos ao endpoint público de criação de
* agendamento.
*
* É a ÚNICA proteção contra abuso desta rota não autenticada, e é
* deliberadamente local a esta rota: o projeto não tem (nem passa
* a ter aqui) uma arquitetura global de rate limiting.
*
* Chave: IP do cliente + identificador da rota.
 *
 * • O IP é lido de `req.ip` e NUNCA de `X-Forwarded-For`. A
 *   aplicação não configura `trust proxy`, portanto qualquer
 *   `X-Forwarded-For` seria um cabeçalho controlado por quem faz
 *   o pedido: usá-lo permitiria contornar o limite com uma
 *   rotação trivial de valores. Se um dia existir um proxy
 *   fiável à frente, o correto é configurar `trust proxy` e o
 *   Express passa a derivar o `req.ip` de forma confiável.
 * • O IP é normalizado para IPv4/subnet IPv6 com
 *   `ipKeyGenerator`, evitando contornar o limite alternando
 *   representações do mesmo endereço.
 * • O identificador da rota NÃO usa o `companyId`: assim, trocar
 *   o tenant na URL não reinicia a contagem.
 * ==========================================================
  */

import { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import { ResponseHandler } from "../utils/response";
import { HttpMessages } from "../constants/http-messages";
import { HttpStatus } from "../constants/http-status";

/**
 * Identificador estável da rota protegida. Não contém o
 * `companyId` de propósito.
 */
const PUBLIC_BOOKING_ROUTE_KEY = "POST /public/companies/:companyId/appointments";

/**
 * 15 minutos.
 */
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

/**
 * 20 pedidos por janela: folgado para uso normal de uma
 * pequena empresa (incluindo várias pessoas atrás do mesmo
 * IP/NAT) e suficiente para bloquear spam básico.
 */
const DEFAULT_LIMIT = 20;

export interface PublicBookingRateLimitOptions {
  windowMs?: number;
  limit?: number;
}

/**
 * ==========================================================
 * Resolve o endereço IP usado na chave.
 *
 * Apenas `req.ip`. Ver a nota sobre `X-Forwarded-For` no topo
 * do ficheiro.
 * ==========================================================
 */
function resolveClientIp(req: Request): string {
  return req.ip ?? "unknown";
}

/**
 * ==========================================================
 * Cria o limitador.
 *
 * Exportado como fábrica para permitir limites menores em
 * teste, sem tocar na instância usada pela aplicação.
 * ==========================================================
 */
export function createPublicBookingRateLimit(
  options: PublicBookingRateLimitOptions = {},
) {
  return rateLimit({
    windowMs: options.windowMs ?? DEFAULT_WINDOW_MS,
    limit: options.limit ?? DEFAULT_LIMIT,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req: Request) =>
      `${PUBLIC_BOOKING_ROUTE_KEY}:${ipKeyGenerator(resolveClientIp(req))}`,
    handler: (_req, res) =>
      ResponseHandler.error(
        res,
        HttpMessages.TOO_MANY_REQUESTS,
        HttpStatus.TOO_MANY_REQUESTS,
      ),
  });
}

/**
 * Limitador usado pela rota pública real.
 */
export const publicBookingRateLimit = createPublicBookingRateLimit();

export default publicBookingRateLimit;