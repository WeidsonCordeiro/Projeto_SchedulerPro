/**
 * ==========================================================
 * Arquivo: MongoDatabase.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Implementação do provider de banco utilizando MongoDB
 * através do Mongoose.
 *
 * Esta classe encapsula toda a lógica de conexão,
 * eventos e gerenciamento do banco.
 * ==========================================================
 */

import mongoose from "mongoose";
import { env } from "../../config/env";
import Logger from "../logger";
import { IDatabaseProvider } from "./IDatabaseProvider";

export class MongoDatabase implements IDatabaseProvider {
  private connected = false;

  /**
   * Conecta ao banco.
   */
  public async connect(): Promise<void> {
    if (this.connected) {
      Logger.database("MongoDB já conectado.");

      return;
    }

    try {
      Logger.database("Conectando ao MongoDB...");

      await mongoose.connect(env.mongo.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });

      this.connected = true;

      this.registerEvents();

      Logger.database("MongoDB conectado com sucesso.");
    } catch (error) {
      Logger.database("Falha ao conectar ao MongoDB.");
      Logger.error(error as Error);

      process.exit(1);
    }
  }

  /**
   * Fecha conexão.
   */
  public async disconnect(): Promise<void> {
    if (!this.connected) {
      Logger.database("MongoDB já está desconectado.");

      return;
    }

    Logger.database("Desconectando do MongoDB...");

    await mongoose.disconnect();

    this.connected = false;

    Logger.database("MongoDB desconectado.");
  }

  /**
   * Verifica conexão.
   */
  public isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Estado textual.
   */
  public getStatus(): string {
    switch (mongoose.connection.readyState) {
      case 0:
        return "disconnected";

      case 1:
        return "connected";

      case 2:
        return "connecting";

      case 3:
        return "disconnecting";

      default:
        return "unknown";
    }
  }

  /**
   * Eventos do Mongoose.
   */
  private registerEvents(): void {
    mongoose.connection.on("connected", () => {
      Logger.database("Evento: connected");
    });

    mongoose.connection.on("disconnected", () => {
      this.connected = false;

      Logger.warn("[DATABASE] Evento: disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      this.connected = true;

      Logger.database("Evento: reconnected");
    });

    mongoose.connection.on("error", (error) => {
      Logger.error(error);
    });
  }
}
