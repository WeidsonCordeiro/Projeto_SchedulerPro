/**
 * ==========================================================
 * Arquivo: reset-password.template.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Modelo de e-mail para redefinição de palavra-passe.
 *
 * ==========================================================
 */

interface ResetPasswordTemplateProps {
  name: string;
  resetUrl: string;
}

export function resetPasswordTemplate({
  name,
  resetUrl,
}: ResetPasswordTemplateProps): string {
  return `
    <div
      style="
        max-width: 600px;
        margin: 0 auto;
        padding: 32px;
        font-family: Arial, Helvetica, sans-serif;
        color: #1f2937;
      "
    >
      <h2>Recuperação de palavra-passe</h2>

      <p>Olá, ${name}.</p>

      <p>
        Recebemos um pedido para redefinir a sua palavra-passe.
      </p>

      <p>
        Clique no botão abaixo para criar uma nova palavra-passe.
      </p>

      <p style="margin: 32px 0;">
        <a
          href="${resetUrl}"
          style="
            background-color: #2563eb;
            color: #ffffff;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            display: inline-block;
          "
        >
          Redefinir palavra-passe
        </a>
      </p>

      <p>Este link expira em 15 minutos.</p>

      <hr />

      <p style="font-size: 12px; color: #6b7280;">
        Se não efetuou este pedido, ignore esta mensagem.
      </p>

      <p style="font-size: 12px; color: #6b7280;">
        SchedulerPro
      </p>
    </div>
  `;
}
