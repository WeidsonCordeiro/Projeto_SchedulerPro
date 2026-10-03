/**
 * ==========================================================
 * Arquivo: public-manage-url.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Construir a URL absoluta do link público de gestão de um
 * agendamento (`/agendar/:token`) para inclusion em e-mail.
 *
 * ==========================================================
 */

import { env } from "../config/env";

/**
 * Caminho da rota pública de gestão, em sincronia com
 * `client/src/routes/AppRoutes.tsx`.
 */
const PUBLIC_MANAGE_PATH = "/agendar";

/**
 * ==========================================================
 * Monta a URL de gestão a partir do token puro.
 *
 * Só é chamada quando existe token puro em memória (criação
 * pública, ou alteração/cancelamento presents o token na URL).
 * O hash nunca chega aqui: não é reversível e não abre o link.
 *
 * A barra final de `FRONTEND_URL` é removida para não produzir
 * `https://app.exemplo//agendar/...`. Os restantes pontos do
 * código do projeto concatenam sem normalizar; aqui o link vai
 * para um e-mail, onde uma URL errada é um beco sem saída
 * visível ao cliente final e o duplo separador denunciaria logo
 * um erro de configuração.
 * ==========================================================
 */
export function buildPublicManageUrl(token: string): string {
  const base = env.frontend.FRONTEND_URL.replace(/\/+$/, "");

  /**
   * O token é base64url (43 caracteres de `A-Za-z0-9_-`), já
   * seguro em URL. `encodeURIComponent` é aplicado na mesma
   * como defesa: se o formato mudar no futuro, um token com
   * caracteres reservados não corrompe o link nem vaza para
   * os parâmetros da query.
   */
  return `${base}${PUBLIC_MANAGE_PATH}/${encodeURIComponent(token)}`;
}
