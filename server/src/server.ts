/**
 * ==========================================================
 * Arquivo: server.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Inicializar toda a aplicação.
 *
 * Ordem:
 *
 * 1 - Banco de Dados
 * 2 - Express
 * 3 - Shutdown Graceful
 *
 * ==========================================================
 */

import app from "./app";
import { env } from "./config/env";
import Database from "./providers/database";
import Logger from "./providers/logger";

let server: ReturnType<typeof app.listen>;

/**
 * Inicializa a API.
 */
async function startServer() {
  try {
    await Database.connect();

    server = app.listen(env.app.PORT, () => {
      Logger.success(`API iniciada na porta ${env.app.PORT}`);
    });
  } catch (error) {
    Logger.error(error as Error);

    process.exit(1);
  }
}

/**
 * Encerra a aplicação corretamente.
 */
async function shutdown(signal: string): Promise<void> {
  Logger.system(`Recebido sinal ${signal}. Encerrando aplicação...`);

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
            return;
          }

          resolve();
        });
      });

      Logger.success("Servidor HTTP encerrado.");
    }

    await Database.disconnect();

    Logger.success("Aplicação encerrada com sucesso.");

    process.exit(0);
  } catch (error) {
    Logger.error(error as Error);

    process.exit(1);
  }
}

process.once("SIGINT", async () => {
  await shutdown("SIGINT");
});

process.once("SIGTERM", async () => {
  await shutdown("SIGTERM");
});

startServer();
