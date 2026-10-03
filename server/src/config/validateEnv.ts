/**
 * ==========================================================
 * Arquivo: validateEnv.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 * Validar todas as variáveis obrigatórias do arquivo .env.
 *
 * Caso alguma variável não exista, a aplicação será encerrada
 * imediatamente.
 *
 * Essa técnica é conhecida como "Fail Fast".
 *
 * Assim evitamos erros difíceis de descobrir em produção.
 * ==========================================================
 */

export function validateEnv(): void {
  /**
   * Lista das variáveis obrigatórias.
   *
   * Sempre que adicionarmos uma nova integração
   * importante (Stripe, Mercado Pago, AWS etc.)
   * basta acrescentar aqui.
   */
  const requiredVariables = [
    "MONGO_URI",
    "JWT_SECRET",
    "REFRESH_SECRET",
    "PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_KEYS",
    "PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_ACTIVE_VERSION",
  ];

  const missingVariables = requiredVariables.filter(
    (variable) => !process.env[variable]
  );

  /**
   * Se existir alguma variável ausente,
   * mostramos todas elas de uma vez.
   */
  if (missingVariables.length > 0) {
    console.error("\n❌ ERRO DE CONFIGURAÇÃO\n");

    missingVariables.forEach((variable) => {
      console.error(`Variável ${variable} não foi definida.`);
    });

    console.error("\nA aplicação foi encerrada.\n");

    process.exit(1);
  }

  try {
    const keyring = JSON.parse(
      process.env.PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_KEYS!,
    ) as Record<string, string>;
    const activeVersion =
      process.env.PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_ACTIVE_VERSION!;
    const encodedKey = keyring[activeVersion];
    const key = Buffer.from(encodedKey || "", "base64");
    const validKeys = Object.entries(keyring).every(([version, value]) => {
      const decoded = Buffer.from(value || "", "base64");
      return (
        /^[A-Za-z0-9_-]{1,32}$/.test(version) &&
        decoded.length === 32 &&
        decoded.toString("base64") === value
      );
    });

    if (
      !keyring ||
      typeof keyring !== "object" ||
      Array.isArray(keyring) ||
      !validKeys ||
      !encodedKey ||
      key.length !== 32 ||
      key.toString("base64") !== encodedKey
    ) {
      throw new Error();
    }
  } catch {
    console.error(
      "Variáveis PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_KEYS/ACTIVE_VERSION inválidas.",
    );
    process.exit(1);
  }
}
