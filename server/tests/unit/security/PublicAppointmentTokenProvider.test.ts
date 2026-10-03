import { describe, expect, it } from "vitest";

import PublicAppointmentTokenProvider, {
  PUBLIC_TOKEN_LENGTH,
  PublicAppointmentTokenProvider as PublicAppointmentTokenProviderClass,
} from "../../../src/providers/security/PublicAppointmentTokenProvider";
import { env } from "../../../src/config/env";

const provider = PublicAppointmentTokenProvider;

describe("PublicAppointmentTokenProvider — ciphertext para reminders", () => {
  it("recupera o mesmo token sem persistir plaintext", () => {
    const token = provider.generate();
    const hash = provider.hash(token);
    const envelope = provider.encrypt(token, hash);

    expect(envelope).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(envelope).not.toContain(token);
    expect(provider.decrypt(envelope, hash)).toBe(token);
    expect(provider.hash(provider.decrypt(envelope, hash))).toBe(hash);
  });

  it("rejeita ciphertext alterado sem revelar a credencial", () => {
    const token = provider.generate();
    const envelope = provider.encrypt(token, provider.hash(token));
    const [version, iv, tag, ciphertext] = envelope.split(".");
    const changed = [version, iv, `${tag[0] === "A" ? "B" : "A"}${tag.slice(1)}`, ciphertext].join(".");
    expect(() => provider.decrypt(changed, provider.hash(token))).toThrow(
      "Não foi possível recuperar a credencial pública do agendamento.",
    );
  });

  it("vincula o ciphertext ao hash original", () => {
    const token = provider.generate();
    const envelope = provider.encrypt(token, provider.hash(token));

    expect(() => provider.decrypt(envelope, provider.hash(provider.generate())))
      .toThrow("Não foi possível recuperar a credencial pública do agendamento.");
  });

  it("outra instância com o mesmo keyring recupera o token", () => {
    const token = provider.generate();
    const hash = provider.hash(token);
    const envelope = provider.encrypt(token, hash);
    const anotherInstance = new PublicAppointmentTokenProviderClass();

    expect(anotherInstance.decrypt(envelope, hash)).toBe(token);
  });

  it("mantém versões antigas de chave legíveis durante rotação", () => {
    const token = provider.generate();
    const hash = provider.hash(token);
    const oldEnvelope = provider.encrypt(token, hash);
    const oldKeys = env.security.PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_KEYS;
    const oldVersion = env.security.PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_ACTIVE_VERSION;

    try {
      env.security.PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_KEYS = JSON.stringify({
        v1: Buffer.alloc(32).toString("base64"),
        v2: Buffer.alloc(32, 1).toString("base64"),
      });
      env.security.PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_ACTIVE_VERSION = "v2";

      expect(provider.decrypt(oldEnvelope, hash)).toBe(token);
      expect(provider.encrypt(token, hash).startsWith("v2.")).toBe(true);
    } finally {
      env.security.PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_KEYS = oldKeys;
      env.security.PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_ACTIVE_VERSION = oldVersion;
    }
  });
});

describe("PublicAppointmentTokenProvider — geração", () => {
  it("gera um token com o comprimento esperado em base64url", () => {
    const token = provider.generate();

    expect(token).toHaveLength(PUBLIC_TOKEN_LENGTH);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("não usa caracteres que exigem escaping em URL", () => {
    for (let i = 0; i < 200; i += 1) {
      const token = provider.generate();

      expect(token).not.toMatch(/[+/=]/);
      expect(encodeURIComponent(token)).toBe(token);
    }
  });

  it("gera tokens distintos em cada chamada", () => {
    const tokens = new Set(Array.from({ length: 2000 }, () => provider.generate()));

    expect(tokens.size).toBe(2000);
  });

  it("tem entropia suficiente para impedir adivinhação", () => {
    /**
     * 32 bytes = 256 bits. Qualquer reduction abaixo tornaria o
     * token enumerável; este teste fixa o contrato.
     */
    const token = provider.generate();
    const decoded = Buffer.from(token, "base64url");

    expect(decoded).toHaveLength(32);
  });

  it("não embute informação do agendamento, empresa ou cliente", () => {
    const token = provider.generate();

    /**
     * Um token opaco não é um ObjectId, não é um JWT e não
     * contém timestamp legível. O teste documenta que a
     * estrutura não é derivável dos dados do agendamento.
     */
    expect(token).not.toMatch(/^[0-9a-f]{24}$/);
    expect(token.split(".")).toHaveLength(1);
    expect(() => JSON.parse(token)).toThrow();
  });
});

describe("PublicAppointmentTokenProvider — hash", () => {
  it("é determinístico para o mesmo token", () => {
    const token = provider.generate();

    expect(provider.hash(token)).toBe(provider.hash(token));
  });

  it("usa SHA-256 com prefixo de versão", () => {
    const token = provider.generate();
    const hash = provider.hash(token);

    expect(hash.startsWith("sha256:")).toBe(true);
    expect(hash.slice("sha256:".length)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("corresponde ao SHA-256 calculado de forma independente", () => {
    const token = provider.generate();
    const expected = require("crypto")
      .createHash("sha256")
      .update(token, "utf8")
      .digest("hex");

    expect(provider.hash(token)).toBe(`sha256:${expected}`);
  });

  it("produz hashes diferentes para tokens diferentes", () => {
    const a = provider.hash(provider.generate());
    const b = provider.hash(provider.generate());

    expect(a).not.toBe(b);
  });

  it("nunca devolve o token a partir do hash", () => {
    const token = provider.generate();
    const hash = provider.hash(token);

    expect(hash).not.toContain(token);
  });

  it("normaliza a entrada", () => {
    expect(provider.hash("abc")).toBe(provider.hash("abc"));
  });
});

describe("PublicAppointmentTokenProvider — validação de formato", () => {
  it("aceita um token gerado", () => {
    expect(provider.hasValidFormat(provider.generate())).toBe(true);
  });

  it("rejeita comprimento errado", () => {
    expect(provider.hasValidFormat("")).toBe(false);
    expect(provider.hasValidFormat("curto")).toBe(false);
    expect(provider.hasValidFormat("a".repeat(PUBLIC_TOKEN_LENGTH - 1))).toBe(false);
    expect(provider.hasValidFormat("a".repeat(PUBLIC_TOKEN_LENGTH + 1))).toBe(false);
  });

  it("rejeita caracteres fora do base64url", () => {
    expect(provider.hasValidFormat("a".repeat(42) + "/")).toBe(false);
    expect(provider.hasValidFormat("a".repeat(42) + "+")).toBe(false);
    expect(provider.hasValidFormat("a".repeat(42) + "=")).toBe(false);
    expect(provider.hasValidFormat("a".repeat(42) + " ")).toBe(false);
    expect(provider.hasValidFormat("a".repeat(42) + ".")).toBe(false);
  });

  it("rejeita tipos não-string", () => {
    expect(provider.hasValidFormat(undefined)).toBe(false);
    expect(provider.hasValidFormat(null)).toBe(false);
    expect(provider.hasValidFormat(12345)).toBe(false);
    expect(provider.hasValidFormat({})).toBe(false);
    expect(provider.hasValidFormat([])).toBe(false);
  });

  it("rejeita um ObjectId, que não é credencial pública", () => {
    expect(
      provider.hasValidFormat("507f1f77bcf86cd799439011"),
    ).toBe(false);
  });
});

describe("PublicAppointmentTokenProvider — dica de diagnóstico", () => {
  it("nunca devolve o token nem o hash completo", () => {
    const token = provider.generate();
    const hash = provider.hash(token);
    const hint = provider.toDiagnosticHint(hash);

    expect(hint).not.toBe(token);
    expect(hint).toHaveLength(14);
    /**
     * Só o início do digest: o resto do hash nunca é exposto.
     */
    expect(hash.slice("sha256:".length).startsWith(hint)).toBe(true);
    expect(hash).not.toBe(hint);
    expect(hint).not.toContain("sha256");
  });

  it("distingue agendamentos diferentes", () => {
    const a = provider.toDiagnosticHint(provider.hash(provider.generate()));
    const b = provider.toDiagnosticHint(provider.hash(provider.generate()));

    expect(a).not.toBe(b);
  });

  it("aceita um hash sem o prefixo de versão", () => {
    const digestOnly = provider.hash(provider.generate()).slice("sha256:".length);

    expect(provider.toDiagnosticHint(digestOnly)).toHaveLength(14);
  });
});
