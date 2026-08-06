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
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.email.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to,
        subject: "Teste",
        html: "<h1>Hello</h1>",
      }),
    });

    console.log(await response.json());
  }
}

export default new ResendProvider();
