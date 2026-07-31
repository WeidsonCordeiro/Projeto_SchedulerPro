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
  const requiredVariables = ["MONGO_URI", "JWT_SECRET", "REFRESH_SECRET"];

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
}
