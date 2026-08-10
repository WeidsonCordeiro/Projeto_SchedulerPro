/**
 * ==========================================================
 * Arquivo: types.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Tipos utilizados pelo sistema de envio de e-mails.
 *
 * ==========================================================
 */

export interface SendMailDto {
  to: string;
  subject: string;
  html: string;
}

export interface IEmailProvider {
  send(data: SendMailDto): Promise<void>;
}
