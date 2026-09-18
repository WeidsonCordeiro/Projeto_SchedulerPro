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

import EmailProvider from "./EmailProvider";
import { SendMailDto } from "./types";
import { env } from "../../config/env";
import { AppError } from "../../errors/AppError";
import { HttpMessages } from "../../constants/http-messages";
import { HttpStatus } from "../../constants/http-status";

class ResendProvider extends EmailProvider {
  private readonly client: Resend;

  constructor() {
    super();

    this.client = new Resend(env.email.RESEND_API_KEY);
  }

  /**
   * ==========================================================
   * Envia um e-mail.
   *
   * O SDK da Resend NÃO lança erro quando a API rejeita o envio:
   * ele devolve { data, error }. Para que a falha não seja
   * silenciosamente ignorada, o retorno é verificado e um
   * AppError é lançado quando `error` está presente.
   *
   * O remetente (from) é configurável via MAIL_FROM para permitir
   * o uso de um domínio verificado no painel da Resend.
   * ==========================================================
   */
  public async send({ to, subject, html }: SendMailDto): Promise<void> {
    const result = await this.client.emails.send({
      from: env.email.MAIL_FROM,
      to,
      subject,
      html,
    });

    if (result.error) {
      throw new AppError(
        `${HttpMessages.EMAIL_SEND_FAILED} ${result.error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export default new ResendProvider();
