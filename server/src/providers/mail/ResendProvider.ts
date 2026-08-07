/**
 * ==========================================================
 * Arquivo: ResendProvider.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Implementar o envio de e-mails através da Resend.
 *
 * ==========================================================
 */

import { Resend } from "resend";

import Logger from "../logger";
import EmailProvider from "./EmailProvider";
import { SendMailDto } from "./types";
import { env } from "../../config/env";

class ResendProvider extends EmailProvider {
  private readonly client: Resend;

  constructor() {
    super();

    this.client = new Resend(env.email.RESEND_API_KEY);
  }

  /**
   * ==========================================================
   * Envia um e-mail.
   * ==========================================================
   */
  public async send({ to, subject, html }: SendMailDto): Promise<void> {
    await this.client.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject,
      html,
    });
  }
}

export default new ResendProvider();
