/**

* ==========================================================
* Arquivo: PublicAppointmentTokenProvider.ts
* ----------------------------------------------------------
* Responsabilidade:
*
* Gerar e derivar o token público de acesso a um agendamento.
*
* O token é a ÚNICA credencial de acesso público a um
* agendamento: não há login, `User`, e-mail nem `_id`.
*
* Princípio aplicado:
*
*   token puro  ──►  SHA-256  ──►  MongoDB
*      (URL)          (índice)     (persistido)
*
* O valor puro existe apenas em dois momentos: no instante em
* que é gerado e no instante em que o cliente o apresenta. A
* base de dados guarda apenas o hash, pelo que uma exposição
* da base de dados não dá acesso utilizável a agendamentos.
* ==========================================================
  */

import { createHash, randomBytes } from "crypto";

/**
 * 32 bytes = 256 bits de entropia.
 *
 * Equivale ao tamanho recomendado para chaves de API
 * (OAuth2, Stripe, GitHub). Codificado em base64url resulta em
 * 43 caracteres sem padding, seguros para URL e para query
 * strings sem qualquer escaping.
 */
const TOKEN_BYTES = 32;

/**
 * Prefixo de versão do hash armazenado.
 */
const HASH_PREFIX = "sha256:";

/**
 * Comprimento esperado do token em base64url, usado apenas para
 * rejeitar formatos obviamente inválidos ANTES de tocar na base
 * de dados.
 *
 * Rejeitar cedo não é apenas uma otimização: um pedido com
 * token de formato errado nunca chega à consulta, o que evita
 * distinguir "token malformado" de "token inexistente".
 */
export const PUBLIC_TOKEN_LENGTH = 43;

/**
 * Conjunto de caracteres do base64url (`-` e `_` no lugar de
 * `+` e `/`, sem `=`).
 */
const BASE64URL = /^[A-Za-z0-9_-]+$/;

class PublicAppointmentTokenProvider {
  /**
   * ==========================================================
   * Gera um token público novo.
   *
   * `randomBytes` usa o CSPRNG do sistema operativo. O token
   * não embute timestamps, ids, nem qualquer outra estrutura:
   * é opaco e não permite inferir nada sobre o agendamento,
   * a empresa ou o cliente.
   * ==========================================================
   */
  public generate(): string {
    return randomBytes(TOKEN_BYTES).toString("base64url");
  }

  /**
   * ==========================================================
   * Deriva o hash que é efetivamente armazenado.
   *
   * SHA-256 (e não bcrypt/argon2) é a escolha correta aqui:
   *
   * • O token tem 256 bits de entropia, ou seja, não é
   *   adivinhável por força bruta — não existe o ataque de
   *   dicionário que justificaria um KDF lento.
   * • O hash tem de ser DETERMINÍSTICO para que o agendamento
   *   seja localizado por igualdade. KDFs com sal aleatório
   *   (bcrypt, argon2, scrypt) produzem um hash diferente em
   *   cada execução e tornariam impossível um `findOne` por
   *   token.
   * • O custo de um KDF lento aqui pagava-se no arranque da
   *   aplicação em cada pedido público, sem benefício real.
   *
   * O prefixo de versão (`sha256:`) permite uma futura migração
   * de algoritmo sem ambiguidade sobre o que está guardado.
   * ==========================================================
   */
  public hash(token: string): string {
    return `${HASH_PREFIX}${createHash("sha256").update(token, "utf8").digest("hex")}`;
  }

  /**
   * ==========================================================
   * Verifica o formato do token recebido na URL.
   *
   * Só rejeita o que é estruturalmente impossível: tamanho
   * errado ou caracteres fora do base64url. Não decide se o
   * agendamento existe.
   * ==========================================================
   */
  public hasValidFormat(token: unknown): token is string {
    return (
      typeof token === "string" &&
      token.length === PUBLIC_TOKEN_LENGTH &&
      BASE64URL.test(token)
    );
  }

  /**
   * ==========================================================
   * Identificador curto e seguro para registo de diagnóstico.
   *
   * NUNCA devolve o token. Serve para correlacionar dois
   * pedidos do mesmo link sem que o registo seja, ele próprio,
   * uma credencial.
   * ==========================================================
   */
  public toDiagnosticHint(tokenHash: string): string {
    /**
     * O prefixo `sha256:` é constante e não ajuda a distinguir
     * dois agendamentos; os 14 caracteres são tirados do digest.
     */
    const digest = tokenHash.startsWith(HASH_PREFIX)
      ? tokenHash.slice(HASH_PREFIX.length)
      : tokenHash;

    return digest.slice(0, 14);
  }
}

export default new PublicAppointmentTokenProvider();