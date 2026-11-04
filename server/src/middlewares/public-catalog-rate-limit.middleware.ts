/**

* ==========================================================
* Arquivo: public-catalog-rate-limit.middleware.ts
* ---
* Responsabilidade:
*
* Limitar a leitura PÚBLICA do catálogo e da disponibilidade.
*
* ==========================================================
* REUTILIZAÇÃO, E NÃO CÓPIA
* ==========================================================
*
* Os limitadores são construídos com `createPublicLinkRateLimit`,
* a factory genérica já criada na Stage 31 Parte 2. Não há
* aqui nenhuma configuração nova de `express-rate-limit`: a
* janela, a chave `rota + IP`, os cabeçalhos `draft-7` e o
* envelope de erro 429 são exatamente os mesmos que os da
* criação pública e do acesso por token.
*
* (A Parte 1 e a Parte 2 ficaram cada uma com a sua factory
* duplicada; consolidar as três numa só é uma melhoria
* transversal, registada no relatório, e não algo que este
* ficheiro devesse fazer por conta própria.)
*
* ==========================================================
* ORÇESTOS
* ==========================================================
*
* Três chaves, porque são três intenções de abuso diferentes:
*
* • catálogo (serviços/profissionais): leitura barata e
*   repetida ao abrir a página; limite generoso.
* • disponibilidade: uma chamada por data experimentada, e
*   quem percorre um mês dispara dezenas. É a mais pesada das
*   três (três consultas), por isso tem orçamento próprio —
*   assim, folquear as datas não esgota o catálogo.
*
* Todos por IP. Nenhuma destas rotas autentica.
* ==========================================================
 */

import { createPublicLinkRateLimit } from "./public-appointment-link-rate-limit.middleware";

/**
 * ==========================================================
* Catálogo: serviços e profissionais.
*
* 60 pedidos/15min por IP. Abrir, recarregar e voltar atrás
* repetem o pedido; 60 dá folga larga para navegação normal.
* ==========================================================
 */
export const publicCatalogRateLimit = createPublicLinkRateLimit({
  routeKey: "GET /public/companies/:companyId/catalog",
  limit: 60,
});

/**
 * ==========================================================
* Disponibilidade.
*
* 120 pedidos/15min por IP: um mês tem 31 datas e uma página
* bem comportada pede muito menos do que isso. Acima deste
* valor o perfil deixa de ser navegação e passa a ser
* varredura.
* ==========================================================
 */
export const publicAvailabilityRateLimit = createPublicLinkRateLimit({
  routeKey: "GET /public/companies/:companyId/availability",
  limit: 120,
});

export default publicCatalogRateLimit;