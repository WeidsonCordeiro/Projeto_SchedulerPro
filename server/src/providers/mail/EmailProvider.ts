/**
 * ==========================================================
 * Arquivo: EmailProvider.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Define o contrato para envio de e-mails.
 *
 * ==========================================================
 */

import { IEmailProvider } from "./types";

export default abstract class EmailProvider implements IEmailProvider {
  public abstract send(data: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void>;
}
