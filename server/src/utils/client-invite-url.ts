/**
 * ==========================================================
 * Arquivo: client-invite-url.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Construir a URL absoluta do link público de aceite de
 * convite (`/convite/cliente/:token`) para inclusão em
 * e-mail.
 * ==========================================================
 */

import { env } from "../config/env";

/**
 * Caminho da rota pública de convite, em sincronia com
 * `client/src/routes/AppRoutes.tsx`.
 */
const CLIENT_INVITE_PATH = "/convite/cliente";

/**
 * Monta a URL de aceite a partir do token puro.
 *
 * Só é chamada no momento da emissão, com o token em
 * memória — o hash nunca chega aqui.
 *
 * A barra final de `FRONTEND_URL` é removida para não
 * produzir `https://app.exemplo//convite/cliente/...`.
 */
export function buildClientInviteUrl(token: string): string {
  const base = env.frontend.FRONTEND_URL.replace(/\/+$/, "");

  return `${base}${CLIENT_INVITE_PATH}/${encodeURIComponent(token)}`;
}
