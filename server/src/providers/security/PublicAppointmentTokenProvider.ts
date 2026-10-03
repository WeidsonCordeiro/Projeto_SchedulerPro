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
*   token puro ──► SHA-256 + AES-256-GCM ──► MongoDB
*      (URL)          (hash + envelope)
*
* O token puro não é persistido em texto. O hash serve para
* lookup e o envelope autenticado permite a entrega posterior
* do mesmo link nos reminders.
* ==========================================================
  */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import { env } from "../../config/env";

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

export class PublicAppointmentTokenProvider {
  private encryptionKeys(): {
    activeVersion: string;
    keys: Record<string, string>;
  } {
    try {
      const keys = JSON.parse(
        env.security.PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_KEYS,
      ) as Record<string, string>;
      const activeVersion =
        env.security.PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_ACTIVE_VERSION;
      if (!keys || typeof keys !== "object" || Array.isArray(keys)) {
        throw new Error();
      }
      return { activeVersion, keys };
    } catch {
      throw new Error("Configuração de criptografia do token público inválida.");
    }
  }

  private keyBytes(encodedKey: string): Buffer {
    const key = Buffer.from(encodedKey, "base64");
    if (key.length !== 32 || key.toString("base64") !== encodedKey) {
      throw new Error("Chave de criptografia do token público inválida.");
    }
    return key;
  }

  /** Encrypts a token for reminder delivery; plaintext is never persisted. */
  public encrypt(token: string, associatedData: string): string {
    const { activeVersion, keys } = this.encryptionKeys();
    const encodedKey = keys[activeVersion];
    if (!encodedKey || !/^[A-Za-z0-9_-]{1,32}$/.test(activeVersion)) {
      throw new Error("Versão ativa da chave do token público indisponível.");
    }
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.keyBytes(encodedKey), iv);
    cipher.setAAD(Buffer.from(associatedData, "utf8"));
    const ciphertext = Buffer.concat([
      cipher.update(token, "utf8"),
      cipher.final(),
    ]);
    return [
      activeVersion,
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(".");
  }

  /** Decrypts only versioned authenticated envelopes produced by encrypt(). */
  public decrypt(envelope: string, associatedData: string): string {
    try {
      const [version, ivPart, tagPart, ciphertextPart, ...extra] =
        envelope.split(".");
      if (!version || !ivPart || !tagPart || !ciphertextPart || extra.length) {
        throw new Error();
      }
      const { keys } = this.encryptionKeys();
      const encodedKey = keys[version];
      if (!encodedKey) throw new Error();
      const iv = Buffer.from(ivPart, "base64url");
      const tag = Buffer.from(tagPart, "base64url");
      const ciphertext = Buffer.from(ciphertextPart, "base64url");
      if (iv.length !== 12 || tag.length !== 16) throw new Error();
      const decipher = createDecipheriv("aes-256-gcm", this.keyBytes(encodedKey), iv);
      decipher.setAAD(Buffer.from(associatedData, "utf8"));
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new Error("Não foi possível recuperar a credencial pública do agendamento.");
    }
  }

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
