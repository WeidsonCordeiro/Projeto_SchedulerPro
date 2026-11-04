/**
 * ==========================================================
 * Arquivo: validateEnv.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 * Validar as variáveis de ambiente obrigatórias da aplicação.
 *
 * A validação utiliza o princípio "Fail Fast":
 * caso uma configuração obrigatória esteja ausente ou inválida,
 * a aplicação é encerrada imediatamente.
 *
 * Além da presença das variáveis, algumas configurações
 * possuem regras específicas de formato e também são validadas.
 * ==========================================================
 */

const REQUIRED_ENV_VARIABLES = [
  "MONGO_URI",
  "JWT_SECRET",
  "REFRESH_SECRET",
  "PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_KEYS",
  "PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_ACTIVE_VERSION",
] as const;

const KEY_VERSION_REGEX = /^[A-Za-z0-9_-]{1,32}$/;
const ENCRYPTION_KEY_LENGTH = 32;

/**
 * Encerra a aplicação com uma mensagem de erro de configuração.
 */
function fail(message: string): never {
  console.error("\n❌ ERRO DE CONFIGURAÇÃO\n");
  console.error(message);
  console.error("\nA aplicação foi encerrada.\n");

  process.exit(1);
}

/**
 * Valida o keyring utilizado para criptografia dos tokens
 * públicos de agendamento.
 *
 * Formato esperado:
 *
 * PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_KEYS={
 *   "v1": "<chave-base64-de-32-bytes>"
 * }
 *
 * A chave ativa é definida separadamente por:
 *
 * PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_ACTIVE_VERSION=v1
 */
function validatePublicAppointmentTokenEncryption(): void {
  const keyringRaw = process.env.PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_KEYS;

  const activeVersion =
    process.env.PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_ACTIVE_VERSION;

  if (!keyringRaw || !activeVersion) {
    return;
  }

  let parsedKeyring: unknown;

  try {
    parsedKeyring = JSON.parse(keyringRaw);
  } catch {
    fail(
      "A variável PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_KEYS " +
        "deve conter um JSON válido.",
    );
  }

  if (
    typeof parsedKeyring !== "object" ||
    parsedKeyring === null ||
    Array.isArray(parsedKeyring)
  ) {
    fail(
      "A variável PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_KEYS " +
        "deve ser um objeto JSON contendo as versões das chaves.",
    );
  }

  const keyring = parsedKeyring as Record<string, unknown>;

  if (!KEY_VERSION_REGEX.test(activeVersion)) {
    fail(
      "PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_ACTIVE_VERSION " +
        "possui um formato inválido.",
    );
  }

  const activeKey = keyring[activeVersion];

  if (typeof activeKey !== "string" || !activeKey) {
    fail(
      `A chave ativa "${activeVersion}" não foi encontrada em ` +
        "PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_KEYS.",
    );
  }

  for (const [version, encodedKey] of Object.entries(keyring)) {
    if (!KEY_VERSION_REGEX.test(version)) {
      fail(`A versão de chave "${version}" possui um formato inválido.`);
    }

    if (typeof encodedKey !== "string" || !encodedKey) {
      fail(`A chave da versão "${version}" deve ser uma string Base64 válida.`);
    }

    const decodedKey = Buffer.from(encodedKey, "base64");

    if (
      decodedKey.length !== ENCRYPTION_KEY_LENGTH ||
      decodedKey.toString("base64") !== encodedKey
    ) {
      fail(
        `A chave da versão "${version}" deve ser uma chave ` +
          "Base64 canônica de exatamente 32 bytes.",
      );
    }
  }
}

/**
 * Valida todas as variáveis obrigatórias do ambiente.
 */
export function validateEnv(): void {
  const missingVariables = REQUIRED_ENV_VARIABLES.filter(
    (variable) => !process.env[variable]?.trim(),
  );

  if (missingVariables.length > 0) {
    fail(
      `Variáveis obrigatórias não definidas:\n${missingVariables
        .map((variable) => `- ${variable}`)
        .join("\n")}`,
    );
  }

  validatePublicAppointmentTokenEncryption();
}
