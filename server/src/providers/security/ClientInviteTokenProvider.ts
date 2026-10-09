/**

* ==========================================================
* Arquivo: ClientInviteTokenProvider.ts
* ----------------------------------------------------------
* Responsabilidade:
*
* Gerar e derivar o token de convite de conta CLIENT.
*
* O convite é uma credencial DIFERENTE do token público de
* agendamento: tem propósito próprio (criação de conta),
* expiração e uso único. Por isso não reutiliza o
* `publicAccessToken` nem o seu modelo de persistência.
*
* Princípio aplicado (o mesmo do projeto, com hash-only):
*
*   token puro ──► SHA-256 ──► MongoDB
*      (link)         (hash)
*
* O token puro nunca é persistido, nem em texto nem
* cifrado — o convite não precisa de ser re-entregue mais
* tarde (diferente dos lembretes, que voltam a ler o link),
* pelo que o hash determinístico chega para lookup.
* ==========================================================
  */

import { createHash, randomBytes } from "crypto";

/**
 * 32 bytes = 256 bits de entropia, igual ao token público.
 * Base64url resulta em 43 caracteres seguros para URL.
 */
const TOKEN_BYTES = 32;

/**
 * Prefixo de versão do hash armazenado.
 */
const HASH_PREFIX = "sha256:";

/**
 * Comprimento esperado do token em base64url — usado para
 * rejeitar formatos obviamente inválidos ANTES de tocar na
 * base de dados.
 */
export const INVITE_TOKEN_LENGTH = 43;

/**
 * Conjunto de caracteres do base64url (`-` e `_` no lugar de
 * `+` e `/`, sem `=`).
 */
const BASE64URL = /^[A-Za-z0-9_-]+$/;

export class ClientInviteTokenProvider {
  /**
   * ==========================================================
   * Gera um token de convite novo.
   *
   * `randomBytes` usa o CSPRNG do sistema operativo. O token
   * é opaco: não embute ids, e-mails, timestamps nem qualquer
   * estrutura que permita inferir o cliente ou a empresa.
   * ==========================================================
   */
  public generate(): string {
    return randomBytes(TOKEN_BYTES).toString("base64url");
  }

  /**
   * ==========================================================
   * Deriva o hash que é efetivamente armazenado.
   *
   * SHA-256 determinístico (mesma justificativa do token
   * público): o token tem 256 bits de entropia, não existe
   * ataque de dicionário que justifique um KDF lento, e o
   * lookup exige igualdade — um KDF com sal aleatório
   * tornaria o `findOne` impossível.
   * ==========================================================
   */
  public hash(token: string): string {
    return `${HASH_PREFIX}${createHash("sha256").update(token, "utf8").digest("hex")}`;
  }

  /**
   * ==========================================================
   * Verifica o formato do token recebido.
   *
   * Só rejeita o que é estruturalmente impossível: tamanho
   * errado ou caracteres fora do base64url. Não decide se o
   * convite existe.
   * ==========================================================
   */
  public hasValidFormat(token: unknown): token is string {
    return (
      typeof token === "string" &&
      token.length === INVITE_TOKEN_LENGTH &&
      BASE64URL.test(token)
    );
  }

  /**
   * ==========================================================
   * Identificador curto e seguro para registo de diagnóstico.
   *
   * NUNCA devolve o token. Serve para correlacionar pedidos do
   * mesmo convite sem que o log seja, ele próprio, uma
   * credencial.
   * ==========================================================
   */
  public toDiagnosticHint(tokenHash: string): string {
    const digest = tokenHash.startsWith(HASH_PREFIX)
      ? tokenHash.slice(HASH_PREFIX.length)
      : tokenHash;

    return digest.slice(0, 14);
  }
}

export default new ClientInviteTokenProvider();
