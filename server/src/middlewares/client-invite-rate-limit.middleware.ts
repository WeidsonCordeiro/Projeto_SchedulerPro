/**
 * ==========================================================
 * Arquivo: client-invite-rate-limit.middleware.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Limitar a superfície pública dos convites de conta CLIENT.
 *
 * Dois limitadores independentes, criados com a factory já
 * existente (`createPublicLinkRateLimit`):
 *
 * • consulta (inspect): leitura da página de aceite — limite
 *   generoso para abrir/recarregar;
 * • aceite (accept): escrita que cria conta — muito mais
 *   restritivo, é o alvo de tentativa de adivinhação de
 *   token.
 *
 * Chave `rota + IP`: esgotar o aceite não impede a consulta.
 * ==========================================================
 */

import { createPublicLinkRateLimit } from "./public-appointment-link-rate-limit.middleware";

/**
 * 30 pedidos/15min por IP: abre, recarrega e valida o link.
 */
export const clientInviteInspectRateLimit = createPublicLinkRateLimit({
  routeKey: "POST /public/client-invites/inspect",
  limit: 30,
});

/**
 * 10 pedidos/15min por IP: mais do que qualquer aceite
 * legítimo (o convite é de uso único).
 */
export const clientInviteAcceptRateLimit = createPublicLinkRateLimit({
  routeKey: "POST /public/client-invites/accept",
  limit: 10,
});
